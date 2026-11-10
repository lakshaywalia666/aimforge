import * as THREE from 'three';
import { defaultLoadout, weapons } from './weapons.js';

const cube = new THREE.BoxGeometry();
const shapes = {
    trainer: { body: .46, barrel: .25, width: .2, scale: .65 },
    pistol: { body: .39, barrel: .18, width: .15, scale: .66 },
    smg: { body: .56, barrel: .25, width: .23, scale: .60, stock: .26 },
    carbine: { body: .75, barrel: .34, width: .20, scale: .55, stock: .32, optic: .19 },
    marksman: { body: .91, barrel: .49, width: .19, scale: .52, stock: .36, optic: .34 },
    ak47: { body: .95, barrel: .49, width: .18, scale: .53, stock: .47, wood: true, curvedMagazine: true },
    m4a1: { body: .94, barrel: .41, width: .19, scale: .54, stock: .39, rail: true },
    m1911: { body: .47, barrel: .105, width: .135, scale: .71, wood: true, steelSlide: true },
};

function metal(color, roughness = .58) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: .26 });
}

function block(parent, material, width, height, depth, x, y, z) {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

function tube(parent, material, radius, length, y, z, open = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12, 1, open), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0, y, z);
    parent.add(mesh);
    return mesh;
}

function buildModel(key, glowMap) {
    const shape = shapes[key];
    const { body, barrel, width, stock, optic, wood, curvedMagazine, rail, steelSlide } = shape;
    const group = new THREE.Group();
    group.scale.setScalar(shape.scale);
    const dark = metal(0x272f3a);
    const edge = metal(steelSlide ? 0xa6adb0 : 0x73808a, .42);
    const polymer = metal(0x161b22, .85);
    const glove = metal(0x434e58, .9);
    const walnut = wood ? metal(curvedMagazine ? 0x92532f : 0x6f3823, .7) : null;
    const trim = weapons[key].sound.sample ? edge : new THREE.MeshBasicMaterial({ color: weapons[key].accent });
    const front = -body * .5;
    const muzzle = front - barrel;

    block(group, dark, width, .155, body, 0, 0, 0);
    const slide = block(group, edge, width * .94, steelSlide ? .125 : .085, body * .87, 0, .10, front * .10);
    if (!steelSlide) block(group, polymer, width * .96, .032, body * .89, 0, .153, 0);
    tube(group, dark, stock ? .048 : .051, barrel, .046, front - barrel * .5);
    tube(group, edge, key === 'marksman' ? .068 : .054, barrel * .42, .046, muzzle + barrel * .21);
    tube(group, polymer, .031, .008, .046, muzzle - .004);
    for (const side of [-1, 1]) {
        if (!weapons[key].sound.sample) block(group, trim, .012, .017, body * .56, side * width * .504, .035, front * .21);
        if (steelSlide) block(group, walnut, .027, .193, .131, side * width * .37, -.16, body * .26).rotation.x = -.28;
        for (let i = 0; i < 4; i++) {
            block(group, polymer, .014, .046, .019, side * width * .48, .106, .04 + i * .042);
        }
    }

    const grip = block(group, polymer, width * .73, .24, .15, 0, -.155, body * .26);
    grip.rotation.x = -.28;
    block(group, glove, width * .87, .126, .16, .028, -.158, body * .27).rotation.x = -.27;
    block(group, glove, .156, .148, .42, .052, -.231, .43).rotation.x = -.15;
    const magazine = new THREE.Group();
    magazine.position.set(0, stock ? -.18 : -.247, stock ? front * .55 : body * .33);
    magazine.rotation.x = stock ? -.17 : -.24;
    group.add(magazine);
    if (curvedMagazine) {
        block(magazine, dark, width * .82, .18, .16, 0, -.015, 0);
        block(magazine, dark, width * .82, .15, .16, 0, -.157, .022).rotation.x = -.35;
        block(magazine, dark, width * .82, .12, .16, 0, -.263, .08).rotation.x = -.65;
        block(magazine, edge, width * .86, .026, .17, 0, -.31, .12).rotation.x = -.65;
    } else {
        block(magazine, polymer, width * .68, stock ? .26 : .14, .13, 0, -.012, 0);
        block(magazine, edge, width * .78, .026, .15, 0, stock ? -.14 : -.093, 0);
    }

    if (stock) {
        const butt = body * .5 + stock * .83;
        block(group, walnut ?? dark, width * .64, wood ? .15 : .09, stock, 0, -.025, body * .5 + stock * .36).rotation.x = wood ? .13 : 0;
        block(group, polymer, width * .76, .18, .055, 0, -.049, butt);
        block(group, glove, width * .86, .105, .19, -.046, -.102, front * .78);
        if (curvedMagazine) {
            block(group, walnut, width * 1.12, .183, .34, 0, .014, front + .041);
            block(group, walnut, width * .73, .093, .26, 0, .152, front + .008);
            tube(group, dark, .028, .29, .132, front - .15);
            block(group, dark, .064, .20, .055, 0, .12, muzzle + .096);
            block(group, edge, .022, .063, .027, 0, .239, muzzle + .096);
        } else {
            const railStart = rail ? front - .17 : front + .08;
            for (let i = 0; i < (rail ? 12 : 5); i++) {
                block(group, edge, width * .92, .025, .019, 0, .171, railStart + i * .043);
            }
            if (rail) {
                block(group, polymer, width * 1.08, .145, .42, 0, .045, front - .025);
                block(group, polymer, width * .73, .11, .18, 0, -.065, butt - .08).rotation.x = -.36;
                for (const side of [-1, 1]) {
                    block(group, edge, .018, .135, .04, side * .035, .19, muzzle + .18).rotation.z = side * .27;
                }
            }
        }
    }
    if (steelSlide) {
        block(group, edge, .035, .095, .065, 0, .119, body * .48).rotation.x = -.42;
        block(group, dark, .07, .03, .14, 0, -.127, .04);
        block(group, dark, .07, .10, .028, 0, -.082, -.022);
    }
    if (optic) {
        block(group, polymer, width * .61, .07, optic * .65, 0, .199, -.03);
        tube(group, dark, .067, optic, .281, -.034, true);
        tube(group, edge, .077, .042, .281, -.034 - optic * .44, true);
        const rim = new THREE.Mesh(new THREE.RingGeometry(.048, .067, 24), trim);
        rim.position.set(0, .281, -.033 + optic * .51);
        group.add(rim);
    } else {
        block(group, polymer, .041, .056, .039, 0, .187, front + .029);
        block(group, trim, .013, .022, .008, 0, .202, front + .051);
        for (const side of [-1, 1]) {
            block(group, polymer, .021, .044, .048, side * .037, .18, body * .31);
        }
    }

    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowMap, color: 0xffc978, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    flash.position.set(0, .046, muzzle - .07);
    flash.scale.setScalar(key === 'marksman' ? .76 : .56);
    flash.visible = false;
    group.add(flash);
    return { group, slide, slideRest: slide.position.z, magazine, magazineRest: magazine.position.y, flash };
}

export function createWeaponView(glowMap) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, .01, 8);
    scene.add(new THREE.HemisphereLight(0xc5d8ff, 0x524035, 3.1));
    const light = new THREE.DirectionalLight(0xffdfb8, 2.6);
    light.position.set(-2, 3, 1);
    scene.add(light);
    const models = new Map();
    let model;
    let profile;
    let kick = 0;
    let flashLife = 0;

    function reset() {
        kick = 0;
        flashLife = 0;
        model.flash.visible = false;
        model.group.visible = true;
    }

    function select(key) {
        if (model) model.group.visible = false;
        if (!models.has(key)) {
            const next = buildModel(key, glowMap);
            models.set(key, next);
            scene.add(next.group);
        }
        model = models.get(key);
        profile = weapons[key];
        reset();
    }

    function fire() {
        kick = 1 + profile.recoil.pitch * 24;
        flashLife = .055;
    }

    function update(delta, elapsed, moving, motion, focus, reloadProgress) {
        const { group, slide, slideRest, magazine, magazineRest, flash } = model;
        const swap = motion && reloadProgress != null ? Math.sin(Math.PI * reloadProgress) : 0;
        const impulse = motion ? kick : 0;
        flash.visible = motion && flashLife > 0;
        flashLife -= delta;
        slide.position.z = slideRest + impulse * .068;
        magazine.position.y = magazineRest - swap * .28;
        group.visible = !profile.scoped || focus < .84 || reloadProgress != null;
        group.position.set(
            THREE.MathUtils.lerp(.31 * Math.min(1, camera.aspect / 1.2), 0, focus) + swap * .09,
            THREE.MathUtils.lerp(-.293, -.153, focus) - swap * .16,
            -.86 + impulse * .062,
        );
        if (motion && moving) group.position.y += Math.sin(elapsed * 9) * .006 * (1 - focus * .75);
        group.rotation.set(impulse * .09 - swap * .37, -.045 * (1 - focus), -swap * .32);
        kick *= Math.exp(-delta * 24);
    }

    select(defaultLoadout);
    return { scene, camera, select, reset, fire, update };
}
