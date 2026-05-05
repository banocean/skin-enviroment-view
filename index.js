import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { SkinModel } from "./skin/index.js";
import { SceneEnvironment } from "./scene.js";
import { ItemRenderer } from "./item.js";
import { createDefaultConfig, createReactiveConfigProxy } from "./config.js";

const SKIN_WIDTH = 64;
const SKIN_HEIGHT = 64;

class Viewport extends HTMLElement {
    #config = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        const style = document.createElement('style');
        style.textContent = `
            .canvas-container { 
                width: 100%; 
                height: 100%; 
                outline: none;
                overflow: hidden;
            }
            
            canvas { 
                display: block; 
                width: 100% !important; 
                height: 100% !important; 
                cursor: grab;
                overflow: hidden;
            }
            
            canvas:active { cursor: grabbing; }
        `;

        this.shadowRoot.appendChild(style)

        this.container = document.createElement("div")
        this.container.classList.add("canvas-container");
        this.shadowRoot.appendChild(this.container)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xffffff, 10, 50);

        this.threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
        this.threeCamera.position.z = 4;

        this.skinModel = null;
        this.sceneEnv = null;
        this.modelReady = false;

        this._isSyncingCamera = false;

        this.config = createDefaultConfig();

        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) this.onResize(width, height);
            }
        });
    }

    onResize() {
        if (!this.renderer) return;

        let dpr = window.devicePixelRatio * (this.resolution || 2);

        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.clientWidth * this.resolution, this.clientHeight * this.resolution, false);

        const frustumSize = 5;
        const aspect = this.clientWidth / this.clientHeight;
        this.threeCamera.left = -frustumSize * aspect / 2;
        this.threeCamera.right = frustumSize * aspect / 2;
        this.threeCamera.top = frustumSize / 2;
        this.threeCamera.bottom = -frustumSize / 2;
        this.threeCamera.updateProjectionMatrix();

        this.doRender();
    }

    connectedCallback() {
        this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
        this.resizeObserver.unobserve(this);
    }

    get config() {
        return this.#config;
    }

    set config(newConfig) {
        this.#config = createReactiveConfigProxy(newConfig, this.handleConfigChange.bind(this));
        this.handleConfigChange(['root'], this.#config, null);
    }

    handleConfigChange(propertyPath, newValue, oldValue) {
        if (propertyPath[0] === 'root') {
            this.updateCameraFromConfig();
            this.updateLightsFromConfig();
            this.updateFloorFromConfig();
            this.updateBackgroundFromConfig();

            if (this.orbitControls) {
                this.orbitControls.target.set(this.#config.cameraTarget.x, this.#config.cameraTarget.y, this.#config.cameraTarget.z);
                this.orbitControls.update();
            }

            if (this.skinModel) {
                this.skinModel.headOnly(this.#config.model.onlyHead);
                if (this.#config.model.onlyHead) {
                    this.skinModel.scale(2.5, 2.5, 2.5);
                    this.skinModel.move(0, -0.5);
                } else {
                    this.skinModel.scale(1, 1, 1);
                    this.skinModel.move(0, 0.5);
                }
                this.skinModel.updateFromConfig(this.#config);
            }

            if (newValue.leftItem?.dataUrl) this.buildItemFromURL("left", newValue.leftItem.dataUrl, newValue.leftItem.mode)
            else this.itemRenderer?.cleanSide("left")

            if (newValue.rightItem?.dataUrl) this.buildItemFromURL("right", newValue.rightItem.dataUrl, newValue.rightItem.mode)
            else this.itemRenderer?.cleanSide("right")

            this.doRender();
            this.dispatchEvent(new CustomEvent('config-change', { detail: this.#config }));
            return;
        }

        if (propertyPath[0] === 'camera' && !this._isSyncingCamera) {
            this.updateCameraFromConfig();
        }
        if (propertyPath[0] === 'cameraTarget' && !this._isSyncingCamera && this.orbitControls) {
            this.orbitControls.target.set(this.#config.cameraTarget.x, this.#config.cameraTarget.y, this.#config.cameraTarget.z);
            this.orbitControls.update();
        }

        if (propertyPath[0] === 'lights') this.updateLightsFromConfig();
        if (propertyPath[0] === 'floor') this.updateFloorFromConfig();
        if (propertyPath[0] === 'background') this.updateBackgroundFromConfig();

        if (propertyPath[0] === 'model' && propertyPath[1] === 'onlyHead') {
            if (this.skinModel) {
                this.skinModel.headOnly(this.#config.model.onlyHead);
                if (this.#config.model.onlyHead) {
                    this.skinModel.scale(2.5, 2.5, 2.5);
                    this.skinModel.move(0, -0.5);
                } else {
                    this.skinModel.scale(1, 1, 1);
                    this.skinModel.move(0, 0.5);
                }
            }
        }

        if (propertyPath[0] === 'leftItem' || propertyPath[0] === 'rightItem') {
            const side = propertyPath[0] === 'leftItem' ? 'left' : 'right';
            const itemConfig = this.config[propertyPath[0]];

            if (propertyPath[1] === 'dataUrl') {
                if (newValue) {
                    this.buildItemFromURL(side, newValue, itemConfig.mode);
                } else {
                    this.itemRenderer.cleanSide(side);
                }
            }

            if (propertyPath[1] === 'mode') {
                this.itemRenderer.grip(side, newValue === 'fist');
            }
        }

        const bodyParts = ['skin', 'head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
        if (bodyParts.includes(propertyPath[0])) {
            if (this.skinModel) this.skinModel.updateFromConfig(this.#config);
        }

        this.doRender();
        this.dispatchEvent(new CustomEvent('config-change', { detail: this.#config }));
    }

    updateCameraFromConfig() {
        const cam = this.#config.camera;
        this.threeCamera.position.set(cam.position.x, cam.position.y, cam.position.z);
        this.threeCamera.zoom = cam.zoom;
        this.threeCamera.updateProjectionMatrix();
    }

    updateLightsFromConfig() {
        if (!this.sceneEnv) return;
        const lights = this.#config.lights;
        this.sceneEnv.light.ambient.intensity = lights.ambient.intensity;
        this.sceneEnv.light.directional.intensity = lights.directional.intensity;
        this.sceneEnv.setLightColor(lights.directional.color);
        const pos = lights.directional.position;
        this.sceneEnv.light.directional.position.set(pos.x * 3, 2.25, pos.z * 3);
    }

    updateFloorFromConfig() {
        if (!this.sceneEnv) return;
        const floor = this.#config.floor;
        this.sceneEnv.floor.visible = floor.enabled;
        this.sceneEnv.setFloorColor(floor.enabled ? floor.color : null);
    }

    updateBackgroundFromConfig() {
        if (!this.sceneEnv) return;
        const bg = this.#config.background;
        this.sceneEnv.bg.visible = bg.enabled;
        if (bg.enabled) {
            this.sceneEnv.setBGColor1(bg.color1);
            this.sceneEnv.setBGColor2(bg.color2);
        }
    }

    buildItemFromURL(side, dataUrl, mode) {
        const img = new Image();
        img.onload = () => {
            this.itemRenderer.buildBoxes(img, side);
            this.itemRenderer.grip(side, mode === 'fist');
            this.doRender();
        };
        img.src = dataUrl;
    }

    doRender() {
        this.renderer.render(this.scene, this.threeCamera);
    }

    setupRenderer() {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.sceneEnv.setShadowMapSize(1024 * this.resolution)
        this.onResize()
        this.threeCamera.updateProjectionMatrix();
        if (this.sceneEnv) this.sceneEnv.light.directional.shadow.needsUpdate = true;
    }

    initScene() {
        this.skinModel = new SkinModel(this);
        this.container.appendChild(this.renderer.domElement);

        this.orbitControls = new OrbitControls(this.threeCamera, this.renderer.domElement);
        this.orbitControls.minZoom = 0.5;
        this.orbitControls.maxZoom = 3;

        if (!this.resolution) this.resolution = this.scale || 2;
        this.sceneEnv = new SceneEnvironment(this.skinModel, this.scene, this.resolution);
        this.itemRenderer = new ItemRenderer(this.skinModel);

        this.setupRenderer();

        this.updateCameraFromConfig();
        this.updateLightsFromConfig();
        this.updateFloorFromConfig();
        this.updateBackgroundFromConfig();

        this.orbitControls.addEventListener('change', () => {
            this.doRender();
        });

        const saveCam = () => {
            this._isSyncingCamera = true;

            const cam = this.#config.camera;
            cam.position.x = this.threeCamera.position.x;
            cam.position.y = this.threeCamera.position.y;
            cam.position.z = this.threeCamera.position.z;
            cam.zoom = this.threeCamera.zoom;

            if (this.orbitControls) {
                const target = this.#config.cameraTarget;
                target.x = this.orbitControls.target.x;
                target.y = this.orbitControls.target.y;
                target.z = this.orbitControls.target.z;
            }

            this._isSyncingCamera = false;
        };

        this.renderer.domElement.addEventListener('mouseup', saveCam);
        this.renderer.domElement.addEventListener('mouseleave', saveCam);
        this.renderer.domElement.addEventListener('touchend', saveCam);
        this.renderer.domElement.addEventListener('touchcancel', saveCam);
    }

    previewToDataURL() {
        this.doRender();
        return this.renderer.domElement.toDataURL("image/png");
    }

    async toGLB() {
        if (!this.skinModel || !this.skinModel.group) {
            throw new Error("No 3D model loaded");
        }

        if (!GLTFExporter) throw new Error("Page is loaded without GLTF dependency")

        const exportScene = new THREE.Scene();

        exportScene.add(this.skinModel.group);

        if (this.sceneEnv && this.sceneEnv.light.directional) {
            exportScene.add(this.sceneEnv.light.directional);
        }

        let tempBG = null;
        if (this.config.background.enabled) {
            const bgGeo = new THREE.PlaneGeometry(20, 20);
            const bgMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(this.config.background.color1),
                side: THREE.DoubleSide
            });
            tempBG = new THREE.Mesh(bgGeo, bgMat);

            tempBG.position.z = -5;
            exportScene.add(tempBG);
        }

        if (this.config.floor.enabled && this.sceneEnv.floor) {
            exportScene.add(this.sceneEnv.floor);
        }

        const exporter = new GLTFExporter();
        const gltf = await exporter.parseAsync(exportScene, {
            embedImages: true,
            binary: true
        });

        this.scene.add(this.skinModel.group);
        if (this.sceneEnv) {
            this.scene.add(this.sceneEnv.light.directional);
            if (this.config.floor.enabled) this.scene.add(this.sceneEnv.floor);
        }

        return new Blob([gltf], { type: 'application/octet-stream' });
    }

    loadSkin(dataURL, mode = "classic") {
        if (!this.skinModel) this.initScene();

        const raw = new Image();
        raw.onload = () => {
                this.skinModel.mode = mode;
                this.skinModel.setImage(raw, SKIN_HEIGHT, SKIN_WIDTH);

                if (!this.modelReady) {
                    this.skinModel.rotate(0.65, 0.3);
                    this.skinModel.scale(2.5, 2.5, 2.5);
                    this.doRender();

                    this.skinModel.reset();
                    this.skinModel.headOnly(false);
                    this.skinModel.scale(1, 1, 1);
                    this.skinModel.move(0, 0.5);

                    this.modelReady = true;
                    this.renderer.shadowMap.needsUpdate = true;
                    this.doRender();
                    this.sceneEnv.updateFloorY();
                } else {
                    this.skinModel.updateFromConfig(this.#config);
                    this.doRender();
                }
        }
        raw.src = dataURL;
    }
}

export { createDefaultConfig, fromMcSkinsPoseToConfig } from "./config.js";

customElements.define("skin-viewport", Viewport)
