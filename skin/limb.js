import * as THREE from 'three';

export function makeLimb(_render, baseMat, posX, posY, w, h, d, polyOfs = 1, isOuter = false) {
    const mat = baseMat.clone();
    mat.polygonOffset       = true;
    mat.polygonOffsetFactor = polyOfs;
    mat.polygonOffsetUnits  = 1;

    const geo  = new THREE.BoxGeometry(w/8, h/8, d/8, 1, 8, 1);
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    if (posX) mesh.position.x = posX / 8;
    if (posY) mesh.position.y = posY / 8;
    mesh.renderOrder = _render.order++;

    const pos = geo.getAttribute('position');
    const skinIdx = [], skinWt = [];
    for (let i = 0; i < pos.count; i++) {
        const bi = pos.getY(i) >= 0.1875 ? 1 : 0;
        skinIdx.push(bi, 0, 0, 0);
        skinWt.push(1, 0, 0, 0);
    }
    geo.setAttribute('skinIndex',  new THREE.Uint16BufferAttribute(skinIdx.reverse(), 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWt.reverse(), 4));

    const b0 = new THREE.Bone();
    const b1 = new THREE.Bone();
    const b2 = new THREE.Bone();
    b0.position.y = posY === -14 ? (isOuter ? 1.95 : 1.8) : 0.3;
    b1.position.y = isOuter ? -0.75 : -0.7;
    b2.position.y = isOuter ? -0.75 : -0.7;
    b0.add(b1); b1.add(b2);

    const skeleton = new THREE.Skeleton([b0, b1, b2]);
    mesh.add(b0);
    mesh.bind(skeleton);
    return mesh;
}
