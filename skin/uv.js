/**
 * Build 4 UV corners for one atlas region with the given orientation.
 * Returns [[u,v], [u,v], [u,v], [u,v]] (quad corners tl,tr,br,bl).
 */
export function buildFaceUVs(texW, texH, orientation, x, y, w, h) {
    const u = px => px / texW, v = py => py / texH;
    switch (orientation) {
        case 4: case 5: case 2:
            return [[u(x),   v(y)  ], [u(x+w), v(y)  ], [u(x+w), v(y+h)], [u(x),   v(y+h)]];
        case 3:
            return [[u(x+w), v(y)  ], [u(x),   v(y)  ], [u(x),   v(y+h)], [u(x+w), v(y+h)]];
        case 0:
            return [[u(x+w), v(y)  ], [u(x+w), v(y+h)], [u(x),   v(y+h)], [u(x),   v(y)  ]];
        case 1:
            return [[u(x),   v(y+h)], [u(x),   v(y)  ], [u(x+w), v(y)  ], [u(x+w), v(y+h)]];
        default:
            return [[u(x),   v(y+h)], [u(x+w), v(y+h)], [u(x+w), v(y)  ], [u(x),   v(y)  ]];
    }
}

/**
 * Write one quad's UVs into a BufferAttribute.
 * Vertices are addressed via the index buffer; triOrder maps the 6 triangle
 * vertex positions to the 4 quad corners (matches original hard-coded sets).
 */
export function writeFaceUVs(index, uvAttr, offset, uvs, triOrder) {
    for (let i = 0; i < 6; i++) {
        const vi    = index.getX(offset + i);
        const [u, v] = uvs[triOrder[i]];
        uvAttr.setXY(vi, u, v);
    }
}

/**
 * Apply all 6-face UVs to a BoxGeometry using Minecraft skin atlas coordinates.
 * Slices side-faces into 8 strips to match the 8 height segments of the mesh.
 *
 * @param {number} texW  texture width  (px)
 * @param {number} texH  texture height (px)
 * @param {THREE.BoxGeometry} geo
 * @param {number} ox   atlas X origin of this box (px)
 * @param {number} oy   atlas Y origin of this box (px)
 * @param {number} bw   box pixel width
 * @param {number} bh   box pixel height
 * @param {number} bd   box pixel depth
 */
export function applyBoxUV(texW, texH, geo, ox, oy, bw, bh, bd) {
    const idx    = geo.getIndex();
    const uvAttr = geo.getAttribute('uv');

    const segmentHeight = bh / 8;
    let vi = 0;

    for (let i = 0; i < 8; i++) {
        const segmentY = oy + (7 - i) * segmentHeight;
        writeFaceUVs(idx, uvAttr, vi,
            buildFaceUVs(texW, texH, 0, ox + bd + bw, segmentY, bd, segmentHeight),
            [2, 0, 1, 3, 0, 1]);
        vi += 6;
    }

    for (let i = 0; i < 8; i++) {
        const segmentY = oy + (7 - i) * segmentHeight;
        writeFaceUVs(idx, uvAttr, vi,
            buildFaceUVs(texW, texH, 1, ox, segmentY, bd, segmentHeight),
            [0, 1, 3, 1, 2, 3]);
        vi += 6;
    }

    writeFaceUVs(idx, uvAttr, vi,
        buildFaceUVs(texW, texH, 2, ox + bd, oy + bh, bw, bd),
        [3, 0, 2, 0, 1, 2]);
    vi += 6;

    writeFaceUVs(idx, uvAttr, vi,
        buildFaceUVs(texW, texH, 3, ox + bd + bw, oy + bh, bw, bd),
        [1, 2, 0, 2, 3, 0]);
    vi += 6;

    for (let i = 0; i < 8; i++) {
        const segmentY = oy + (7 - i) * segmentHeight;
        writeFaceUVs(idx, uvAttr, vi,
            buildFaceUVs(texW, texH, 4, ox + bd, segmentY, bw, segmentHeight),
            [3, 0, 2, 0, 1, 2]);
        vi += 6;
    }

    for (let i = 0; i < 8; i++) {
        const segmentY = oy + (7 - i) * segmentHeight;
        writeFaceUVs(idx, uvAttr, vi,
            buildFaceUVs(texW, texH, 5, ox + bd + bw + bd, segmentY, bw, segmentHeight),
            [3, 0, 2, 0, 1, 2]);
        vi += 6;
    }

    uvAttr.needsUpdate = true;
}
