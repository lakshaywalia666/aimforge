import * as THREE from 'three';

const waveCount = 5;
const startingHealth = 100;
const contactRange = 1.45;
const growlRange = 14;
const box = new THREE.BoxGeometry();
const material = color => new THREE.MeshStandardMaterial({ color, roughness: .88 });
const skin = material(0x8da46b);
const wornSkin = material(0x646c43);
const uniform = [material(0x464e43), material(0x504047), material(0x3b4d59)];
const trousers = material(0x383b3c);
const boots = material(0x25292a);
const eyes = new THREE.MeshBasicMaterial({ color: 0xffce76, toneMapped: false });
const lanes = [0, -5, 5, -9, 9, 2.8];

function piece(parent, surface, width, height, depth, x, y, z) {
    const mesh = new THREE.Mesh(box, surface);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
}

function pivot(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
}

function makeZombie(parent, index) {
    const root = pivot(parent, 0, 0, 0);
    const body = pivot(root, 0, 0, 0);
    const jacket = uniform[index % uniform.length];
    const head = piece(body, skin, .65, .71, .63, 0, 3.62, .08);
    const chest = piece(body, jacket, 1.03, 1.16, .61, 0, 2.63, 0);
    const hips = piece(body, trousers, .87, .45, .53, 0, 1.85, 0);
    piece(body, wornSkin, .44, .24, .53, 0, 3.24, .08);
    const mouth = piece(body, boots, .40, .09, .028, .03, 3.48, .40);
    piece(body, boots, .20, .34, .032, -.25, 2.79, .32).rotation.z = -.17;

    const hitAreas = [head, chest, hips];
    const arms = [];
    const legs = [];
    for (const side of [-1, 1]) {
        piece(body, wornSkin, .19, .13, .044, side * .17, 3.68, .40);
        piece(body, eyes, .10, .043, .018, side * .17, 3.68, .425);

        const arm = pivot(body, side * .66, 3.04, 0);
        hitAreas.push(piece(arm, jacket, .34, .65, .35, 0, -.31, 0));
        hitAreas.push(piece(arm, skin, .27, .63, .27, 0, -.87, 0));
        arms.push(arm);

        const leg = pivot(body, side * .26, 1.77, 0);
        hitAreas.push(piece(leg, trousers, .39, 1.54, .40, 0, -.77, 0));
        hitAreas.push(piece(leg, boots, .40, .28, .58, 0, -1.61, .10));
        legs.push(leg);
    }

    const zombie = { root, body, head, mouth, arms, legs, hitAreas, hp: 0, nextAttack: 0, voiceUntil: 0 };
    for (const mesh of hitAreas) mesh.userData.zombie = zombie;
    return zombie;
}

export function createSurvival(scene) {
    const group = new THREE.Group();
    group.name = 'Zombie Survival';
    group.visible = false;
    scene.add(group);
    const enemies = lanes.map((_, index) => makeZombie(group, index));
    const localPoint = new THREE.Vector3();
    let state;
    let nextWaveAt;
    let nextVoiceAt;
    let nextRoarAt;

    function reset() {
        group.visible = true;
        for (const enemy of enemies) {
            enemy.hp = 0;
            enemy.root.visible = false;
        }
        state = { health: startingHealth, wave: 0, waveCount, alive: 0, kills: 0 };
        nextWaveAt = 0;
        nextVoiceAt = 0;
        nextRoarAt = 0;
    }

    function spawnWave(elapsed) {
        state.wave++;
        state.alive = state.wave + 1;
        for (let i = 0; i < state.alive; i++) {
            const enemy = enemies[i];
            const offset = state.wave === 1 || i === 0 ? 0 : (state.wave % 2 ? 1 : -1);
            enemy.root.position.set(lanes[i] + offset, 0, -15 - (i % 3) * 3 - (state.wave - 1) * .65);
            enemy.root.rotation.y = 0;
            enemy.body.position.y = 0;
            enemy.body.rotation.set(0, 0, 0);
            enemy.hp = 2;
            enemy.nextAttack = elapsed;
            enemy.voiceUntil = elapsed;
            enemy.root.userData.spawnAt = elapsed;
            enemy.root.userData.attempted = false;
            enemy.root.visible = true;
        }
    }

    function vocalize(enemy, kind, elapsed) {
        enemy.voiceUntil = elapsed + (kind === 'roar' ? 1300 : 1000);
        nextVoiceAt = elapsed + 2400 + Math.random() * 700;
        if (kind === 'roar') nextRoarAt = elapsed + 2700;
        return { kind, position: enemy.root.position };
    }

    function update(delta, elapsed, player, difficulty) {
        const waveStarted = nextWaveAt !== null && elapsed >= nextWaveAt;
        if (waveStarted) {
            spawnWave(elapsed);
            nextWaveAt = null;
        }
        const speed = (2.2 + state.wave * .32) * difficulty.speed;
        let nearest;
        let nearestDistance = growlRange;
        let attacker;
        for (let i = 0; i < state.wave + 1; i++) {
            const enemy = enemies[i];
            if (!enemy.hp) continue;
            const position = enemy.root.position;
            const dx = player.x - position.x;
            const dz = player.z - position.z;
            const distance = Math.hypot(dx, dz);
            if (distance < nearestDistance) {
                nearest = enemy;
                nearestDistance = distance;
            }
            const walking = distance > contactRange + .02;
            enemy.root.rotation.y = Math.atan2(dx, dz);
            if (walking) {
                const step = Math.min(speed * (1 + i * .035) * delta, distance - contactRange);
                position.x += dx * step / distance;
                position.z += dz * step / distance;
            } else if (elapsed >= enemy.nextAttack) {
                state.health = Math.max(0, state.health - Math.round(12 * difficulty.speed));
                enemy.nextAttack = elapsed + 1150;
                attacker ??= enemy;
            }

            // Give approaching enemies room to spread out near the player.
            for (let j = 0; j < i; j++) {
                const other = enemies[j];
                if (!other.hp) continue;
                const x = position.x - other.root.position.x;
                const z = position.z - other.root.position.z;
                const spacing = Math.hypot(x, z);
                if (spacing >= 1.15) continue;
                const step = Math.min(1.15 - spacing, delta * 2);
                position.x = THREE.MathUtils.clamp(position.x + (spacing ? x / spacing : 1) * step, -13, 13);
                position.z = Math.min(12.75, position.z + (spacing ? z / spacing : 0) * step);
            }

            const gait = elapsed * .008 * difficulty.speed + i;
            enemy.body.position.y = walking ? Math.abs(Math.sin(gait)) * .085 : 0;
            enemy.body.rotation.z = Math.sin(gait) * .045;
            const voicing = THREE.MathUtils.clamp((enemy.voiceUntil - elapsed) / 240, 0, 1);
            enemy.mouth.scale.y = .09 + voicing * (.14 + Math.sin(elapsed * .04) * .025);
            enemy.mouth.position.y = 3.48 - voicing * .045;
            for (let limb = 0; limb < 2; limb++) {
                const swing = Math.sin(gait + limb * Math.PI);
                enemy.legs[limb].rotation.x = walking ? swing * .37 : 0;
                enemy.arms[limb].rotation.x = -1.24 + swing * .20;
            }
        }
        if (waveStarted) return vocalize(enemies[0], 'roar', elapsed);
        if (attacker && elapsed >= nextRoarAt) return vocalize(attacker, 'roar', elapsed);
        if (nearest && elapsed >= nextVoiceAt) return vocalize(nearest, 'growl', elapsed);
    }

    function trace(ray) {
        const visible = enemies.filter(enemy => enemy.hp);
        group.updateMatrixWorld(true);
        const [impact] = ray.intersectObjects(visible.flatMap(enemy => enemy.hitAreas));
        if (!impact) return null;
        const { object, point } = impact;
        const enemy = object.userData.zombie;
        object.worldToLocal(localPoint.copy(point));
        return {
            target: enemy.root, point, hit: true, bullseye: object === enemy.head,
            placement: { x: localPoint.x * 2, y: localPoint.y * 2, hit: true },
        };
    }

    function hit(shot, elapsed) {
        const enemy = enemies.find(candidate => candidate.root === shot.target);
        enemy.hp = shot.bullseye ? 0 : enemy.hp - 1;
        if (enemy.hp) return;
        enemy.root.visible = false;
        state.kills++;
        state.alive--;
        if (!state.alive && state.wave < waveCount) nextWaveAt = elapsed + 1250;
    }

    return {
        reset, update, trace, hit,
        hide: () => { group.visible = false; },
        get state() { return state; },
        get cleared() { return state.wave === waveCount && state.alive === 0; },
    };
}
