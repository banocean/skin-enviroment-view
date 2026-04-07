import * as THREE from 'three';

export class ItemRenderer {
    constructor(model) {
        this.model = model;
        this.fist  = { left: false, right: false };
    }

    buildBoxes(img, side, itemNum = 0) {
        const data     = this._imageToData(img);
        const colorMap = this._groupByColor(data);
        const handBone = this.model[`${side}_arm`].skeleton.bones[2];

        if (handBone.children.length) {
            this._cleanGroup(handBone.children[0]);
            handBone.remove(handBone.children[0]);
        }

        const group = new THREE.Group();
        for (const pixels of Object.values(colorMap)) {
            const mat = new THREE.MeshStandardMaterial({
                color: `rgb(${pixels.r},${pixels.g},${pixels.b})`,
                transparent: pixels.alpha < 1,
                opacity: pixels.alpha,
                roughness: 0.4,
                metalness: 0,
            });
            const proto = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1 + pixels.luminance / 255), mat);
            proto.castShadow = proto.receiveShadow = true;
            for (const [px, py] of pixels) {
                const m = proto.clone();
                m.position.set(px - img.width/2, -py + img.height/2, 0);
                group.add(m);
            }
        }
        handBone.add(group);
        this.grip(side, this.fist[side], itemNum);
    }

    grip(side, fist = false, itemNum = 0) {
        this.fist[side] = fist;
        const item = this.model[`${side}_arm`].skeleton.bones[2].children[0];
        if (!item) return true;
        if (fist) {
            item.position.set(side === 'left' ? 0.475 : -0.475, 0.05, 0.65);
            item.scale.setScalar(0.04);
            item.rotation.set(1.56, 3.15, 0);
        } else {
            item.position.set(side === 'left' ? 0.5 : -0.5, 0, 0.77);
            item.scale.setScalar(0.055);
            item.rotation.set(
                itemNum == 750 ? 0     : 3.2,
                itemNum == 750 ? -1.5  : 1.6,
                itemNum == 750 ? -0.85 : -0.65
            );
        }
        this.model.render();
        return true;
    }

    toggleVisibility(side) {
        const item = this.model[`${side}_arm`].skeleton.bones[2].children[0];
        if (!item) return false;
        item.visible = !item.visible;
        this.model.render();
        return item.visible;
    }

    cleanAll() {
        ['left', 'right'].forEach(side => {
            const bone = this.model[`${side}_arm`].skeleton.bones[2];
            if (bone.children.length) { this._cleanGroup(bone.children[0]); bone.remove(bone.children[0]); }
            document.getElementById(`m-item-${side}`)?.remove();
        });
    }

    cleanSide(side) {
        const bone = this.model[`${side}_arm`].skeleton.bones[2];
        if (bone.children.length) {
            this._cleanGroup(bone.children[0]);
            bone.remove(bone.children[0]);
        }
        this.model.render();
    }

    _imageToData(img) {
        const canvas = document.createElement('canvas');
        const ctx    = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        let { width: w, height: h } = img;
        if (w + h > 32) {
            const sc = 32 / Math.max(w, h);
            w = img.width  = Math.floor(w * sc);
            h = img.height = Math.floor(h * sc);
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h);
    }

    _groupByColor({ data, width }) {
        const map = {};
        for (let i = 0; i < data.length; i += 4) {
            if (!data[i+3]) continue;
            const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
            const key = `${r},${g},${b}`;
            if (!map[key]) {
                const arr = []; arr.r = r; arr.g = g; arr.b = b;
                arr.alpha = a/255; arr.luminance = 0.299*r + 0.587*g + 0.114*b;
                map[key] = arr;
            }
            const idx = i / 4;
            map[key].push([idx % width, Math.floor(idx / width)]);
        }
        return map;
    }

    _cleanGroup(group) {
        for (let i = group.children.length - 1; i >= 0; i--) {
            const c = group.children[i];
            c.geometry?.dispose(); c.material?.dispose(); group.remove(c);
        }
    }
}
