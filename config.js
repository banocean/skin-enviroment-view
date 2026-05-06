export function createDefaultConfig() {
    return {
        camera: {
            position: { x: 0, y: 0, z: 4 },
            zoom: 1,
        },
        cameraTarget: { x: 0, y: 0, z: 0 },
        model: {
            onlyHead: false,
        },
        skin: {
            rotation: { x: 0, y: 0, z: 0 },
        },
        head: {
            rotation: { x: 0, y: 0, z: 0 },
        },
        body: {
            rotation: { x: 0, y: 0, z: 0 },
        },
        leftArm: {
            rotation: { x: 0, y: 0, z: 0 },
            extension: 0,
        },
        rightArm: {
            rotation: { x: 0, y: 0, z: 0 },
            extension: 0,
        },
        leftLeg: {
            rotation: { x: 0, y: 0, z: 0 },
            extension: 0,
        },
        rightLeg: {
            rotation: { x: 0, y: 0, z: 0 },
            extension: 0,
        },

        leftItem: {
            dataUrl: null,
            mode: 'open',
        },
        rightItem: {
            dataUrl: null,
            mode: 'open',
        },

        floor: {
            enabled: false,
            color: '#ffffff',
        },

        background: {
            enabled: false,
            color1: '#ffffff',
            color2: '#ffffff',
        },

        lights: {
            ambient: {
                intensity: 2,
            },
            directional: {
                intensity: 3,
                color: '#ffffff',
                position: {
                    x: 1,
                    z: 1,
                },
            },
        }
    };
}

export function createReactiveConfigProxy(target, onChangeCallback, currentPath = []) {
    if (typeof target !== 'object' || target === null) {
        return target;
    }

    for (const key of Object.keys(target)) {
        target[key] = createReactiveConfigProxy(target[key], onChangeCallback, [...currentPath, key]);
    }

    return new Proxy(target, {
        set(obj, prop, newValue) {
            const oldValue = obj[prop];
            const propertyPath = [...currentPath, prop];

            const reactiveValue = createReactiveConfigProxy(newValue, onChangeCallback, propertyPath);
            obj[prop] = reactiveValue;

            onChangeCallback(propertyPath, reactiveValue, oldValue);

            return true;
        }
    });
}

export function fromMcSkinsPoseToConfig(legacyObj) {
    const config = createDefaultConfig();

    if (!legacyObj) return config;

    if (legacyObj.cam) {
        config.camera.position.x = legacyObj.cam[0] || 0;
        config.camera.position.y = legacyObj.cam[1] || 0;
        config.camera.position.z = legacyObj.cam[2] || 4;
        config.camera.zoom = legacyObj.cam[3] || 1;
        if (legacyObj.cam[4] != null) {
            config.cameraTarget.x = legacyObj.cam[4];
            config.cameraTarget.y = legacyObj.cam[5];
            config.cameraTarget.z = legacyObj.cam[6];
        }
    }

    if (legacyObj.onlyhead != null) {
        config.model.onlyHead = legacyObj.onlyhead === 1;
    }

    if (legacyObj.floor) {
        config.floor.enabled = legacyObj.floor[0] === 1;
        config.floor.color = legacyObj.floor[1] || '#ffffff';
    }

    if (legacyObj.rbg) {
        config.background.enabled = legacyObj.rbg[0] === 1;
        config.background.color1 = legacyObj.rbg[1] || '#ffffff';
        config.background.color2 = legacyObj.rbg[2] || '#ffffff';
    }

    if (legacyObj.light) {
        config.lights.ambient.intensity = (legacyObj.light[0] || 20) / 10;
        config.lights.directional.intensity = (legacyObj.light[1] || 30) / 10;
        config.lights.directional.color = legacyObj.light[2] || '#ffffff';
    }

    if (legacyObj.light_pos) {
        config.lights.directional.position.x = legacyObj.light_pos[0] || 1;
        config.lights.directional.position.z = legacyObj.light_pos[1] || 1;
    }

    const bodyPartMap = {
        skin: 'skin',
        head: 'head',
        body: 'body',
        leftarm: 'rightArm',
        rightarm: 'leftArm',
        leftleg: 'leftLeg',
        rightleg: 'rightLeg',
    };

    for (const [legacyKey, currentKey] of Object.entries(bodyPartMap)) {
        if (legacyObj[legacyKey]) {
            const val = legacyObj[legacyKey];
            config[currentKey].rotation.x = val[0] || 0;
            config[currentKey].rotation.y = val[1] || 0;
            config[currentKey].rotation.z = val[2] || 0;
            if (val[3] != null) {
                config[currentKey].extension = val[3];
            }
        }
    }

    return config;
}
