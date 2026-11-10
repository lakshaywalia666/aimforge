import * as THREE from 'three';
import { createWeaponView } from './weapon-view.js';
import { defaultLoadout, weapons } from './weapons.js';
import { createSurvival } from './zombies.js';

export const firingPosition = new THREE.Vector3(0, 3.65, 7);

const amber = 0xffa05b;
const unitBox = new THREE.BoxGeometry();
const circle = new THREE.CircleGeometry(1, 48);
const quad = new THREE.PlaneGeometry();

function steel(color, metalness = .18) {
    return new THREE.MeshStandardMaterial({ color, roughness: .72, metalness });
}

function box(parent, material, width, height, depth, x, y, z) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
}

function floorMaterial() {
    const map = texture(512, 512, (ctx, width, height) => {
        ctx.fillStyle = '#4e5158';
        ctx.fillRect(0, 0, width, height);
        let seed = 4217;
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let i = 0; i < 14000; i++) {
            ctx.fillStyle = i % 2 ? '#a0a5b014' : '#08090b21';
            ctx.fillRect(random() * width, random() * height, 1 + random() * 7, 1);
        }
        ctx.strokeStyle = '#22242a';
        ctx.lineWidth = 5;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.strokeStyle = '#666971';
        ctx.lineWidth = 1;
        ctx.strokeRect(7, 7, width - 14, height - 14);
        ctx.fillStyle = '#20232b';
        for (const x of [16, width - 16]) {
            for (const y of [16, height - 16]) {
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 11);
    return new THREE.MeshStandardMaterial({ map, color: 0xbcbfc9, roughness: .87, metalness: .24 });
}

function addDecal(parent, width, height, x, y, z, draw, floor = false) {
    const map = texture(1024, 256, draw);
    const mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    mesh.scale.set(width, height, 1);
    mesh.position.set(x, y, z);
    if (floor) mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
    return mesh;
}

function batchBlocks(scene, world) {
    const blocksByMaterial = new Map();
    for (const mesh of [...scene.children]) {
        if (mesh.geometry !== unitBox) {
            world.add(mesh);
            continue;
        }
        if (!blocksByMaterial.has(mesh.material)) blocksByMaterial.set(mesh.material, []);
        blocksByMaterial.get(mesh.material).push(mesh);
    }
    for (const [material, blocks] of blocksByMaterial) {
        const batch = new THREE.InstancedMesh(unitBox, material, blocks.length);
        blocks.forEach((mesh, index) => {
            mesh.updateMatrix();
            batch.setMatrixAt(index, mesh.matrix);
        });
        world.add(batch);
    }
}

function buildFoundry(world, glowMap) {
    const scene = new THREE.Group();
    const structure = steel(0x303540);
    const armor = steel(0x484e5b);
    const panel = steel(0x252934);
    const inset = steel(0x171a21);
    const stripe = steel(0xb77543);
    const warm = new THREE.MeshBasicMaterial({ color: 0xffb879 });
    const cool = new THREE.MeshBasicMaterial({ color: 0xa9b9d2 });

    box(scene, floorMaterial(), 32, .3, 49, 0, -.15, -10.5);
    box(scene, panel, 32, .45, 49, 0, 12, -10.5);
    box(scene, panel, 32, 12, .7, 0, 6, -34);
    box(scene, panel, 32, 12, .5, 0, 6, 13.7);
    box(scene, inset, 31.6, 1.2, .2, 0, .6, -33.55);

    for (const side of [-1, 1]) {
        box(scene, panel, .55, 12, 48, side * 16, 6, -10.5);
        box(scene, structure, .34, .95, 48, side * 15.5, .48, -10.5);
        box(scene, structure, .65, .54, 48, side * 15.4, 9.7, -10.5);
        box(scene, warm, .1, .095, 47, side * 15.02, 9.5, -10.5);
        box(scene, stripe, .075, .01, 47, side * 12.75, .012, -10.5);
        box(scene, inset, .6, .045, 47, side * 13.5, .023, -10.5);
        box(scene, armor, .09, .016, 44, side * 5.4, .016, -10.5);
        for (let z = -30; z < 12; z += 3) {
            box(scene, stripe, .095, .016, 1.55, side * 2.5, .018, z);
            box(scene, inset, .42, .018, .16, side * 13.5, .048, z);
        }
        for (let z = -29; z <= 11; z += 8) {
            box(scene, inset, .12, 5.65, 6.85, side * 15.69, 4.5, z);
            box(scene, structure, .24, 4.55, 5.98, side * 15.48, 4.8, z);
            box(scene, armor, .16, .16, 6, side * 15.32, 7.05, z);
            box(scene, armor, .16, .16, 6, side * 15.32, 2.56, z);
            box(scene, inset, .15, .56, 5.2, side * 15.33, 3.2, z);
            for (let slat = -2; slat <= 2; slat += .42) {
                box(scene, panel, .2, .4, .12, side * 15.26, 3.2, z + slat);
            }
            box(scene, warm, .095, .1, 4.3, side * 15.32, 1.3, z);
        }
        for (let z = -33; z <= 11; z += 8) {
            box(scene, structure, .9, 12, .78, side * 15.37, 6, z);
            box(scene, armor, .93, 1.28, 1.03, side * 15.32, .64, z);
            box(scene, armor, .94, .7, 1.08, side * 15.32, 7.95, z);
            box(scene, warm, .08, 1.6, .12, side * 14.89, 7.75, z);
        }
    }

    for (let z = -33; z < 12; z += 8) {
        box(scene, structure, 31.4, .66, .7, 0, 11.51, z);
        for (const x of [-8.4, 8.4]) {
            box(scene, armor, 7.4, .26, 1.2, x, 10.98, z);
            box(scene, cool, 6.8, .04, .14, x, 10.83, z + .27);
            box(scene, cool, 6.8, .04, .14, x, 10.83, z - .27);
        }
    }

    for (const x of [-11.1, 11.1]) {
        box(scene, inset, 7.1, 8.05, .2, x, 5.3, -33.52);
        box(scene, structure, 6.7, 7.55, .24, x, 5.3, -33.38);
        box(scene, armor, 6.7, .14, .16, x, 8.78, -33.18);
        for (let y = 1.9; y <= 4; y += .32) {
            box(scene, inset, 5.95, .12, .15, x, y, -33.19);
        }
    }
    box(scene, armor, 13.1, 10.3, .55, 0, 5.15, -33.23);
    box(scene, inset, 12.2, 9.72, .19, 0, 4.86, -32.89);
    box(scene, structure, 11.38, 9.05, .22, 0, 4.53, -32.72);
    box(scene, warm, 11.8, .09, .12, 0, 9.71, -32.86);
    for (const x of [-5.89, 5.89]) box(scene, warm, .09, 8.9, .12, x, 5.1, -32.86);
    for (let y = .65; y < 9; y += 1.15) box(scene, inset, 11.35, .065, .06, 0, y, -32.57);
    for (const x of [-4.45, 4.45]) {
        box(scene, armor, .23, 8.88, .12, x, 4.46, -32.57);
        box(scene, stripe, .035, 8.7, .09, x, 4.46, -32.49);
    }

    addDecal(scene, 8.8, 2.2, 0, 7.3, -32.48, (ctx) => {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c2b4aa';
        ctx.font = 'bold 132px Arial';
        ctx.fillText('FOUNDRY', 512, 130);
        ctx.fillStyle = '#dfa473';
        ctx.font = 'bold 37px monospace';
        ctx.fillText('BALLISTICS LAB   /   01', 512, 198);
    });
    for (const [x, number] of [[-11.1, '01'], [11.1, '02']]) {
        addDecal(scene, 6.4, 1.6, x, 5.65, -33.17, (ctx) => {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#938f92';
            ctx.font = 'bold 226px Arial';
            ctx.fillText(number, 512, 218);
        });
    }
    addDecal(scene, 25.5, 1.8, 0, .035, -.65, (ctx, width, height) => {
        ctx.fillStyle = '#cd905a';
        ctx.fillRect(0, 18, width, 11);
        ctx.fillRect(0, height - 28, width, 11);
        for (let x = -20; x < width; x += 25) {
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x + 12, 20);
            ctx.lineTo(x + 44, height - 20);
            ctx.lineTo(x + 32, height - 20);
            ctx.fill();
        }
        ctx.fillStyle = '#34363c';
        ctx.fillRect(width / 2 - 115, 34, 230, height - 68);
        ctx.fillStyle = '#ebc39f';
        ctx.textAlign = 'center';
        ctx.font = 'bold 84px monospace';
        ctx.fillText('FIRE LINE', width / 2, 158, 211);
    }, true);

    const spill = new THREE.MeshBasicMaterial({
        map: glowMap, color: 0xec7541, transparent: true, opacity: .29,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (const x of [-11, 11]) {
        for (const z of [-30, -20, -10, 1]) {
            const glow = new THREE.Mesh(quad, spill);
            glow.rotation.x = -Math.PI / 2;
            glow.scale.set(10, 14, 1);
            glow.position.set(x, .03, z);
            scene.add(glow);
        }
    }

    // Render the repeating wall, ceiling, and floor pieces together by material.
    batchBlocks(scene, world);
}

function buildLaboratory(world) {
    const scene = new THREE.Group();
    const white = steel(0xb1c2cc);
    const pale = steel(0x718997);
    const dark = steel(0x263b48);
    const glass = steel(0x325f6e, .5);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x9de8f1 });
    const light = new THREE.MeshBasicMaterial({ color: 0xe9faff });
    box(scene, floorMaterial(), 32, .3, 49, 0, -.15, -10.5);
    box(scene, pale, 32, .35, 49, 0, 12, -10.5);
    box(scene, white, 32, 12, .6, 0, 6, -34);
    box(scene, dark, 21, 8, .2, 0, 4, -33.58);
    box(scene, pale, 19, 7, .2, 0, 3.5, -33.43);
    for (const x of [-10, 10]) box(scene, cyan, .07, 7.6, .08, x, 4.2, -33.3);
    box(scene, cyan, 20, .09, .1, 0, 8, -33.3);
    for (const side of [-1, 1]) {
        box(scene, white, .4, 12, 49, side * 16, 6, -10.5);
        box(scene, dark, .3, .8, 49, side * 15.7, .4, -10.5);
        box(scene, cyan, .08, .12, 48, side * 15.5, 1, -10.5);
        box(scene, cyan, .08, .02, 44, side * 9.5, .03, -10.5);
        for (let z = -29; z < 12; z += 8) {
            box(scene, glass, .12, 4.5, 6.5, side * 15.7, 4.6, z);
            box(scene, pale, .27, 10, .3, side * 15.5, 5, z + 3.6);
            box(scene, light, .08, 4.55, .09, side * 15.48, 4.6, z - 3.3);
            box(scene, white, .15, .07, 6.5, side * 15.45, 5.3, z);
        }
    }
    for (let z = -28; z < 12; z += 9) {
        box(scene, dark, 23, .2, 2.3, 0, 11.7, z);
        for (const x of [-7.7, 0, 7.7]) box(scene, light, 6.5, .08, 1.3, x, 11.53, z);
        for (const x of [-6, 0, 6]) {
            box(scene, cyan, .05, .013, 1.4, x, .025, z);
            box(scene, pale, 3.5, .013, .04, x, .023, z);
        }
    }
    addDecal(scene, 13, 3.25, 0, 6.2, -33.28, ctx => {
        ctx.fillStyle = '#daedf7';
        ctx.textAlign = 'center';
        ctx.font = 'bold 105px Arial';
        ctx.fillText('LABORATORY', 512, 119);
        ctx.fillStyle = '#85e0ef';
        ctx.font = '32px monospace';
        ctx.fillText('PRECISION SYSTEMS    /    03', 512, 185);
    });
    batchBlocks(scene, world);
}

function buildOutpost(world) {
    const scene = new THREE.Group();
    const sand = steel(0xae8d64);
    const concrete = steel(0x8d8d7d);
    const dark = steel(0x414e53);
    const olive = steel(0x61756b);
    const white = steel(0xd1c8ab);
    const light = new THREE.MeshBasicMaterial({ color: 0xffdfa4 });
    box(scene, sand, 220, .4, 210, 0, -.42, -34);
    box(scene, concrete, 29, .2, 47, 0, -.1, -10.5);
    box(scene, dark, 30, 1.15, .6, 0, .58, -34);
    for (const side of [-1, 1]) {
        box(scene, concrete, .6, 1.35, 48, side * 15.7, .68, -10.5);
        box(scene, white, .12, .02, 45, side * 7.3, .015, -10.5);
        for (let z = -32; z < 12; z += 8) {
            box(scene, dark, .22, 6.2, .22, side * 15.5, 3.1, z);
            box(scene, dark, .09, .12, 8, side * 15.5, 5.9, z + 4);
        }
        box(scene, olive, 7, 5.4, 19, side * 23, 2.7, -17);
        box(scene, dark, 7.4, .28, 19.4, side * 23, 5.5, -17);
        for (let z = -24; z < -10; z += 3) box(scene, dark, .15, 1.4, 1.9, side * 19.4, 3.5, z);
    }
    for (const x of [-11, 0, 11]) {
        box(scene, dark, .25, 10.8, .3, x, 5.4, -33);
        box(scene, light, 2.2, .16, .5, x, 10.85, -32.8);
    }
    for (let z = -30; z <= 4; z += 5) {
        box(scene, white, 1.3, .015, .08, 0, .016, z);
        for (const x of [-10, 10]) box(scene, dark, .045, .015, 2.5, x, .016, z);
    }
    // Mountains and a lookout tower sit beyond the playable firing lanes.
    const mountainMaterial = steel(0x957c66);
    for (let i = 0; i < 15; i++) {
        const mountain = new THREE.Mesh(new THREE.ConeGeometry(13 + i % 4 * 4, 13 + i % 5 * 5, 5), mountainMaterial);
        mountain.position.set((i - 7) * 15, 3.5, -78 - i % 3 * 12);
        mountain.rotation.y = i * .8;
        scene.add(mountain);
    }
    for (const x of [-27, -22]) {
        for (const z of [-48, -43]) box(scene, dark, .45, 11, .45, x, 5.5, z);
    }
    box(scene, olive, 6.4, 3.2, 6.4, -24.5, 11.5, -45.5);
    box(scene, dark, 6.8, .3, 6.8, -24.5, 13.2, -45.5);
    box(scene, dark, 5.5, .8, .12, -24.5, 11.8, -42.23);
    addDecal(scene, 12, 3, 0, 8.2, -33, ctx => {
        ctx.fillStyle = '#324147';
        ctx.fillRect(30, 20, 964, 220);
        ctx.fillStyle = '#ebd2a6';
        ctx.textAlign = 'center';
        ctx.font = 'bold 117px Arial';
        ctx.fillText('OUTPOST', 512, 142);
        ctx.font = '28px monospace';
        ctx.fillText('EXTERIOR RANGE    /    07', 512, 201);
    });
    batchBlocks(scene, world);
}

function makeTarget(scene, materials) {
    const group = new THREE.Group();
    const { rim, ring, face, inset, core, cross, glow } = materials;
    const layers = [
        [rim, 1, -.09], [ring, .93, -.04], [face, .79, -.012],
        [ring, .51, .01], [inset, .43, .025], [core, .26, .044],
    ];
    for (const [material, radius, z] of layers) {
        const layer = new THREE.Mesh(circle, material);
        layer.scale.setScalar(radius);
        layer.position.z = z;
        group.add(layer);
    }
    for (let i = 0; i < 4; i++) {
        const tick = box(group, cross, .09, .22, .05, 0, 0, .065);
        const angle = i * Math.PI / 2;
        tick.position.set(Math.sin(angle) * .83, Math.cos(angle) * .83, .04);
        tick.rotation.z = -angle;
    }
    const halo = new THREE.Sprite(glow);
    halo.scale.setScalar(3.25);
    halo.position.z = -.12;
    group.add(halo);
    const hitArea = new THREE.Mesh(circle, new THREE.MeshBasicMaterial({ visible: false }));
    hitArea.position.z = .05;
    hitArea.userData.target = group;
    group.add(hitArea);
    group.userData.hitArea = hitArea;
    group.visible = false;
    scene.add(group);
    return group;
}

export function createArena(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x23262d);
    scene.fog = new THREE.FogExp2(0x22232b, .018);
    const camera = new THREE.PerspectiveCamera(60, 1, .08, 72);
    camera.rotation.order = 'YXZ';
    const ambient = new THREE.HemisphereLight(0xd9e4ff, 0x685342, 2.05);
    scene.add(ambient);
    const fill = new THREE.DirectionalLight(0xcad6ff, 1.25);
    fill.position.set(-5, 12, 5);
    scene.add(fill);
    const backlight = new THREE.PointLight(0xff9b61, 180, 28, 2);
    backlight.position.set(0, 5, -27);
    scene.add(backlight);

    const glowMap = texture(128, 128, (ctx, width, height) => {
        const center = width / 2;
        const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(.26, '#ffffff88');
        gradient.addColorStop(.63, '#ffffff18');
        gradient.addColorStop(1, '#ffffff00');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    });
    const worlds = new Map();
    let environment;
    const materials = {
        rim: steel(0x5b3b34),
        ring: new THREE.MeshBasicMaterial({ color: amber, toneMapped: false }),
        face: steel(0x4a2c22),
        inset: new THREE.MeshBasicMaterial({ color: 0x632d1b, toneMapped: false }),
        core: new THREE.MeshBasicMaterial({ color: 0xffdab6, toneMapped: false }),
        cross: new THREE.MeshBasicMaterial({ color: 0xffe5c5, toneMapped: false }),
        glow: new THREE.SpriteMaterial({
            map: glowMap, color: amber, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false,
        }),
    };
    const targets = Array.from({ length: 3 }, () => makeTarget(scene, materials));
    let survival;
    const weapon = createWeaponView(glowMap);
    let loadout = weapons[defaultLoadout];
    const holes = Array.from({ length: 32 }, () => {
        const hole = new THREE.Mesh(circle, new THREE.MeshBasicMaterial({ color: 0x2a1811, depthWrite: false }));
        hole.scale.setScalar(.035);
        hole.visible = false;
        targets[0].add(hole);
        return hole;
    });
    let holeIndex = 0;
    const ray = new THREE.Raycaster();
    const center = new THREE.Vector2();
    const localPoint = new THREE.Vector3();
    const sparkGeometry = new THREE.OctahedronGeometry(1);
    const sparks = Array.from({ length: 18 }, () => {
        const material = new THREE.MeshBasicMaterial({ color: amber, transparent: true, depthWrite: false, toneMapped: false });
        const mesh = new THREE.Mesh(sparkGeometry, material);
        mesh.visible = false;
        scene.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), life: 0 };
    });
    let sparkIndex = 0;
    let preview = true;
    let settings = { fov: 65, quality: 'auto', weapon: true, motion: true };
    let resolution = Math.min(window.devicePixelRatio, 1.5);
    let frameCount = 0;
    let frameTime = 0;
    let fps = 60;

    function setEnvironment(key) {
        if (key === environment) return;
        if (worlds.has(environment)) worlds.get(environment).visible = false;
        if (!worlds.has(key)) {
            const group = new THREE.Group();
            ({ foundry: () => buildFoundry(group, glowMap), laboratory: () => buildLaboratory(group), outpost: () => buildOutpost(group) })[key]();
            worlds.set(key, group);
            scene.add(group);
        }
        worlds.get(key).visible = true;
        environment = key;
        const outdoor = key === 'outpost';
        const laboratory = key === 'laboratory';
        scene.background.set(outdoor ? 0xbcd5e1 : laboratory ? 0x7c939e : 0x23262d);
        scene.fog.color.copy(scene.background);
        scene.fog.density = outdoor ? .008 : laboratory ? .009 : .018;
        camera.far = outdoor ? 180 : 72;
        camera.updateProjectionMatrix();
        ambient.color.set(outdoor ? 0xd9edff : 0xd9e4ff);
        ambient.groundColor.set(outdoor ? 0xac7848 : laboratory ? 0x687c85 : 0x685342);
        ambient.intensity = outdoor ? 2.8 : laboratory ? 2.6 : 2.05;
        fill.color.set(outdoor ? 0xffe0ac : 0xcad6ff);
        fill.intensity = outdoor ? 2.8 : 1.25;
        backlight.color.set(laboratory ? 0x8be9ff : 0xff9b61);
        backlight.intensity = outdoor ? 0 : 180;
        renderer.toneMappingExposure = outdoor ? .9 : laboratory ? 1 : 1.25;
    }

    function configure(options) {
        const qualityChanged = settings.quality !== options.quality;
        settings = { ...options };
        materials.ring.color.set(options.targetColor);
        materials.glow.color.set(options.targetColor);
        materials.face.color.set(options.targetColor).multiplyScalar(.16);
        materials.inset.color.set(options.targetColor).multiplyScalar(.3);
        materials.core.color.set(options.targetColor).lerp(new THREE.Color(0xffffff), .7);
        if (qualityChanged) {
            resolution = Math.min(window.devicePixelRatio, { low: .85, medium: 1.25, high: 1.85, auto: 1.5 }[options.quality]);
            renderer.setPixelRatio(resolution);
            frameCount = 0;
            frameTime = 0;
        }
        resize();
    }

    function resetCamera(showPreview) {
        preview = showPreview;
        weapon.reset();
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        camera.position.copy(firingPosition);
        camera.rotation.set(0, 0, 0);
        if (preview) {
            camera.position.set(.3, 4.6, 8.1);
            camera.lookAt(.3, 2.7, -22);
        }
    }

    function resize() {
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height) return;
        camera.aspect = width / height;
        const verticalFov = THREE.MathUtils.radToDeg(2 * Math.atan(.68 / camera.aspect));
        camera.fov = preview ? Math.min(103, Math.max(56, verticalFov)) : settings.fov;
        camera.updateProjectionMatrix();
        weapon.camera.aspect = camera.aspect;
        weapon.camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    const planePoint = new THREE.Vector3();

    function traceShot(zombies) {
        camera.updateMatrixWorld();
        ray.setFromCamera(center, camera);
        if (zombies) return zombies.trace(ray);
        const visible = targets.filter(target => target.visible);
        for (const target of visible) target.updateMatrixWorld();
        const [hit] = ray.intersectObjects(visible.map(target => target.userData.hitArea), false);
        let nearest = null;
        let nearestDistance = Infinity;
        for (const target of visible) {
            if (hit && target !== hit.object.userData.target) continue;
            targetPlane.constant = -target.position.z;
            if (!ray.ray.intersectPlane(targetPlane, planePoint)) continue;
            target.worldToLocal(localPoint.copy(planePoint));
            const distance = localPoint.x ** 2 + localPoint.y ** 2;
            if (distance >= nearestDistance) continue;
            nearestDistance = distance;
            nearest = {
                target, point: planePoint.clone(), hit: Boolean(hit),
                bullseye: Boolean(hit) && distance <= .26 ** 2,
                placement: { x: localPoint.x, y: localPoint.y, hit: Boolean(hit) },
            };
        }
        return nearest;
    }

    function markImpact(shot) {
        if (!shot?.hit) return;
        const hole = holes[holeIndex++ % holes.length];
        hole.position.set(shot.placement.x, shot.placement.y, .09);
        hole.visible = true;
    }

    function burst(point) {
        if (!settings.motion) return;
        const count = settings.quality === 'low' ? 4 : 9;
        for (let i = 0; i < count; i++) {
            const spark = sparks[sparkIndex];
            sparkIndex = (sparkIndex + 1) % sparks.length;
            const angle = (i + Math.random()) * Math.PI * 2 / 9;
            const speed = 2 + Math.random() * 4;
            spark.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 2 + Math.random() * 3);
            spark.mesh.position.copy(point);
            spark.mesh.material.opacity = 1;
            spark.mesh.scale.setScalar(.065 + Math.random() * .07);
            spark.mesh.visible = true;
            spark.life = .36;
        }
    }

    function updateSparks(delta) {
        for (const spark of sparks) {
            if (!spark.mesh.visible) continue;
            spark.life -= delta;
            spark.mesh.visible = spark.life > 0;
            spark.mesh.material.opacity = Math.max(0, spark.life / .36);
            spark.mesh.position.addScaledVector(spark.velocity, delta);
            spark.velocity.y -= 11 * delta;
        }
    }

    function clearSparks() {
        for (const spark of sparks) spark.mesh.visible = false;
        for (const hole of holes) hole.visible = false;
    }

    function update(delta, elapsed, moving, aimed = false, reloadProgress = null) {
        updateSparks(delta);
        const targetZoom = aimed ? loadout.zoom : 1;
        if (camera.zoom !== targetZoom) {
            const nextZoom = THREE.MathUtils.damp(camera.zoom, targetZoom, 22, delta);
            camera.zoom = !settings.motion || Math.abs(nextZoom - targetZoom) < .002 ? targetZoom : nextZoom;
            camera.updateProjectionMatrix();
        }
        const focus = (camera.zoom - 1) / (loadout.zoom - 1);
        weapon.update(delta, elapsed, moving, settings.motion, focus, reloadProgress);
        frameCount++;
        frameTime += delta;
        if (frameTime < 2) return;
        fps = Math.round(frameCount / frameTime);
        if (settings.quality === 'auto') {
            const next = THREE.MathUtils.clamp(resolution + (fps < 45 ? -.15 : fps > 57 ? .05 : 0), .65, Math.min(window.devicePixelRatio, 1.65));
            if (Math.abs(next - resolution) >= .04) {
                resolution = next;
                renderer.setPixelRatio(resolution);
                resize();
            }
        }
        frameCount = 0;
        frameTime = 0;
    }

    function render() {
        renderer.autoClear = true;
        renderer.render(scene, camera);
        if (!preview && settings.weapon) {
            renderer.autoClear = false;
            renderer.clearDepth();
            renderer.render(weapon.scene, weapon.camera);
        }
    }

    return {
        camera, canvas, targets, resetCamera, resize, traceShot, burst, clearSparks,
        setEnvironment, configure, update, render, markImpact,
        startSurvival() {
            survival ??= createSurvival(scene);
            survival.reset();
            return survival;
        },
        setLoadout(key) {
            loadout = weapons[key];
            weapon.select(key);
        },
        fire: () => weapon.fire(),
        performance: () => ({ fps, resolution }),
    };
}
