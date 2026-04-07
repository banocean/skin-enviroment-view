import * as THREE from "three";
import { makeLimb } from "./limb.js";
import { applyBoxUV } from "./uv.js";

export class SkinModel {
  constructor(viewport) {
    this.viewport = viewport;
    this.mode = "classic"
    this._render = { order: 1 }
    this._build();
  }

  _build() {
    this._render.order = 1;

    const innerBase = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      transparent: false,
      alphaTest: 1e-5,
      opacity: 1,
      roughness: 0.4,
      metalness: 0,
      skinning: true,
    });
    const outerBase = innerBase.clone();
    outerBase.skinning = true;

    const armW = this.mode === "slim" ? 3 : 4;
    const armX = 2 + (this.mode === "slim" ? 3.5 : 4);

    this.head = makeLimb(this._render, innerBase, 0, 8, 8, 8, 8, 1);
    this.outer = makeLimb(this._render, innerBase, 0, 8, 8, 8, 8, 1); // hat
    this.body = makeLimb(this._render, innerBase, 0, -2, 8, 12, 4, 3);
    this.leftArm = makeLimb(this._render, innerBase, -armX, -2, armW, 12, 4, 1);
    this.rightArm = makeLimb(this._render, innerBase, armX, -2, armW, 12, 4, 0.5);
    this.leftLeg = makeLimb(this._render, innerBase, -2, -14, 4, 12, 4, 2);
    this.rightLeg = makeLimb(this._render, innerBase, 2, -14, 4, 12, 4, 1);

    this.outerBody = makeLimb(this._render, outerBase, 0, -2, 7.5, 11.5, 4, 3);
    this.outerLeftArm = makeLimb(this._render, outerBase, -armX, -2, armW, 12, 4, 1, true);
    this.outerRightArm = makeLimb(this._render, outerBase, armX, -2, armW, 12, 4, 0.5, true);
    this.outerLeftLeg = makeLimb(this._render, outerBase, -2, -14, 4, 12, 4, 2, true);
    this.outerRightLeg = makeLimb(this._render, outerBase, 2, -14, 4, 12, 4, 1, true);

    this.outer.scale.setScalar(1.1);
    this.outerBody.scale.setScalar(1.1);
    [this.outerLeftArm, this.outerRightArm].forEach((m) => {
      m.scale.set(1.1, 1.04, 1.1);
      m.position.y += 0.07;
    });
    [this.outerLeftLeg, this.outerRightLeg].forEach((m) => {
      m.scale.set(1.1, 1.03, 1.1);
      m.position.y -= 0.14;
    });

    const G = (name) => Object.assign(new THREE.Group(), {name});
    this.headGroup = G("head");
    this.bodyGroup = G("body");
    this.leftArmGroup = G("leftarm");
    this.rightArmGroup = G("rightarm");
    this.leftLegGroup = G("leftleg");
    this.rightLegGroup = G("rightleg");

    this.headGroup.add(this.head, this.outer);
    this.bodyGroup.add(this.body, this.outerBody);
    this.leftArmGroup.add(this.leftArm, this.outerLeftArm);
    this.rightArmGroup.add(this.rightArm, this.outerRightArm);
    this.leftLegGroup.add(this.leftLeg, this.outerLeftLeg);
    this.rightLegGroup.add(this.rightLeg, this.outerRightLeg);

    this.group = G("skin");
    this.group.add(
        this.headGroup,
        this.bodyGroup,
        this.leftArmGroup,
        this.rightArmGroup,
        this.leftLegGroup,
        this.rightLegGroup,
    );

    this.head.geometry.translate(0, -0.5, 0);
    this.outer.geometry.translate(0.005, -0.455, 0);
    this.headGroup.position.y = 0.5;

    this.leftArm.geometry.translate(0.5, -0.4, 0);
    this.leftArmGroup.position.set(-0.5, 0.4, 0);

    this.rightArm.geometry.translate(-0.5, -0.4, 0);
    this.rightArmGroup.position.set(0.5, 0.4, 0);

    this.leftLeg.geometry.translate(0.25, 1, 0);
    this.leftLegGroup.position.set(-0.25, -1, 0);

    this.rightLeg.geometry.translate(-0.25, 1, 0);
    this.rightLegGroup.position.set(0.25, -1, 0);

    this.outerLeftArm.geometry.translate(0.45, -0.45, 0);
    this.outerRightArm.geometry.translate(-0.45, -0.45, 0);
    this.outerLeftLeg.geometry.translate(0.23, 1.11, 0);
    this.outerRightLeg.geometry.translate(-0.23, 1.11, 0);

    this.left_arm = this.leftArm;
    this.right_arm = this.rightArm;
    this.left_leg = this.leftLeg;
    this.right_leg = this.rightLeg;
    this.outer_left_arm = this.outerLeftArm;
    this.outer_right_arm = this.outerRightArm;
    this.outer_left_leg = this.outerLeftLeg;
    this.outer_right_leg = this.outerRightLeg;
    this.outer_body = this.outerBody;
  }

  updateFromConfig(config) {
    if (!this.group) return;

    this.group.rotation.set(
        config.skin.rotation.x / 100,
        config.skin.rotation.y / 100,
        config.skin.rotation.z / 100
    );

    const parts = [
      {key: 'head', group: 'headGroup'},
      {key: 'body', group: 'bodyGroup'},
      {key: 'leftArm', group: 'leftArmGroup', bone: 'left_arm', isArm: true},
      {key: 'rightArm', group: 'rightArmGroup', bone: 'right_arm', isArm: true},
      {key: 'leftLeg', group: 'leftLegGroup', bone: 'left_leg', isArm: false},
      {key: 'rightLeg', group: 'rightLegGroup', bone: 'right_leg', isArm: false}
    ];

    parts.forEach(p => {
      const conf = config[p.key];
      if (!conf || !this[p.group]) return;

      this[p.group].rotation.set(
          conf.rotation.x / 100,
          conf.rotation.y / 100,
          conf.rotation.z / 100
      );

      if (p.bone && conf.extension !== undefined) {
        const n = conf.extension;
        const s = p.isArm ? (n / 100) * -1 : (n / 100);

        if (this[`outer_${p.bone}`] && this[p.bone]) {
          this[`outer_${p.bone}`].skeleton.bones[1].rotation.x = s;
          this[p.bone].skeleton.bones[1].rotation.x = s;

          const scaleY = 1 - n / 3000;
          this[`outer_${p.bone}`].skeleton.bones[1].scale.y = scaleY;
          this[p.bone].skeleton.bones[1].scale.y = scaleY;
        }
      }
    });
  }

  applyUV(texW, texH) {
    const s = texH / 64;
    const aw = this.mode === "slim" ? 3 : 4;
    applyBoxUV(texW, texH, this.head.geometry, 0, 48 * s, 8 * s, 8 * s, 8 * s);
    applyBoxUV(texW, texH, this.body.geometry, 16 * s, 32 * s, 8 * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.leftArm.geometry, 40 * s, 32 * s, aw * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.leftLeg.geometry, 0, 32 * s, 4 * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.rightArm.geometry, 32 * s, 0, aw * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.rightLeg.geometry, 16 * s, 0, 4 * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.outer.geometry, 32 * s, 48 * s, 8 * s, 8 * s, 8 * s);
    applyBoxUV(texW, texH, this.outerBody.geometry, 16 * s, 16 * s, 8 * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.outerLeftArm.geometry, 40 * s, 16 * s, aw * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.outerLeftLeg.geometry, 0, 16 * s, 4 * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.outerRightArm.geometry, 48 * s, 0, aw * s, 12 * s, 4 * s);
    applyBoxUV(texW, texH, this.outerRightLeg.geometry, 0, 0, 4 * s, 12 * s, 4 * s);
  }

  setTexture(imageElement) {
    const tex = new THREE.Texture(imageElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;

    this.group.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        obj.material.map = tex;
        obj.material.needsUpdate = true;
      }
    });
  }

  setImage(imageElement, texW, texH) {
    const wasHeadOnly = !this.body.visible;
    if (this.viewport.scene.children.includes(this.group)) this._dispose();
    this._build();
    this.applyUV(texW, texH);
    this.viewport.scene.add(this.group);
    this.setTexture(imageElement);
    this.headOnly(wasHeadOnly);
  }

  rotate(y, x, z = 0) {
    this.group.rotation.set(x, y, z);
  }

  reset() {
    this.rotate(0, 0, 0);
    this.group.traverse((obj) => {
      if (!obj.isMesh) obj.rotation.set(0, 0, 0);
    });
    this.scale(1, 1, 1);
  }

  scale(x, y, z) {
    this.group.scale.set(x, y, z);
  }

  move(x, y) {
    this.group.position.x = x;
    this.group.position.y = y;
  }

  headOnly(enabled) {
    this.head.position.y = enabled ? 0 : 1;
    this.outer.position.y = enabled ? 0 : 1;
    [
      this.body, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg,
      this.outerBody, this.outerLeftArm, this.outerRightArm, this.outerLeftLeg, this.outerRightLeg,
    ].forEach((m) => {
      m.visible = !enabled;
    });
  }

  render() {
    this.viewport.doRender();
  }

  _dispose() {
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      if (obj.material) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    this.viewport.scene.remove(this.group);
    this.viewport.renderer.renderLists.dispose();
  }
}
