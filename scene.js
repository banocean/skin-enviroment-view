import * as THREE from 'three';

export class SceneEnvironment {
    constructor(model, threeScene, resolution) {
        this.model = model;
        this.scene = threeScene;
        this.light = {
            ambient:     new THREE.AmbientLight(0xffffff, 2),
            directional: new THREE.DirectionalLight(0xffffff, 3),
        };
        this.floor = this._makeFloor();
        this.bg    = this._makeGradientBG();
        this._initLights(quality);
    }

    _initLights(resolution) {
        const dl = this.light.directional;
        dl.position.set(1, 0.75, 1).multiplyScalar(3);
        dl.shadow.mapSize.width  = 1024 * resolution;
        dl.shadow.mapSize.height = 1024 * resolution;
        dl.shadow.camera.near    = 0.1;
        dl.shadow.camera.far     = 15;
        dl.castShadow            = true;
        dl.shadow.bias           = -0.001;
        this.scene.add(this.light.ambient, dl);
    }

    setShadowMapSize(size) {
        const s = this.light.directional.shadow;
        s.mapSize.set(size, size);
        if (s.map) s.map.setSize(size, size);
    }

    _makeFloor() {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0xffffff, depthWrite: false })
        );
        mesh.rotation.x    = -Math.PI / 2;
        mesh.receiveShadow = true;
        mesh.renderOrder   = 0;
        mesh.visible       = false;
        const bb = new THREE.Box3().setFromObject(this.model.group);
        mesh.position.y = bb.min.y;
        this.scene.add(mesh);
        return mesh;
    }

    updateFloorY() {
        const bb = new THREE.Box3().setFromObject(this.model.group);
        this.floor.position.y = bb.min.y;
    }

    _makeGradientBG() {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.ShaderMaterial({
                uniforms: {
                    color1: { value: new THREE.Color(0xffffff) },
                    color2: { value: new THREE.Color(0xffffff) },
                    ratio:  { value: 1 },
                },
                vertexShader:   `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
                fragmentShader: `varying vec2 vUv;uniform vec3 color1,color2;uniform float ratio;
          void main(){vec2 uv=(vUv-.5)*vec2(ratio,1.);gl_FragColor=vec4(mix(color1,color2,length(uv)),1.);}`,
                depthTest: false, depthWrite: false,
            })
        );
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
    }

    setFloorColor(color) {
        if (color != null && this.floor.visible) {
            const c = new THREE.Color(color);
            this.floor.material.color = c;
            this.scene.background     = c;
            if (this.scene.fog) this.scene.fog.color = c;
        } else {
            this.scene.background = null;
        }
    }

    setLightColor(color) { this.light.directional.color = new THREE.Color(color); }
    setBGColor1(color)   { this.bg.material.uniforms.color1.value = new THREE.Color(color); }
    setBGColor2(color)   { this.bg.material.uniforms.color2.value = new THREE.Color(color); }
}
