import { MathUtils, Vector2 } from 'three';
import { PointerLockControls } from 'three/addons/PointerLockControls.js';
import { createArena, firingPosition } from './arena.js';
import {
    modes, difficulties, environments, loadPreferences, saveValue, readSessions,
    saveSession, profileFor, dailyChallenge, average,
} from './training.js';
import { renderProgress, renderJournal, renderReport } from './reports.js';
import { createAudio } from './audio.js';
import { defaultLoadout, weapons } from './weapons.js';
import { createGyroscope, requestMotionAccess } from './gyroscope.js';

const positions = [
    [[-4.8, 3.65, -14], [-7.7, 5.5, -20], [-5.6, 2.45, -11], [-3.9, 6.15, -19]],
    [[0, 3.65, -14], [1.6, 5.8, -17], [-1.5, 2.5, -12], [.3, 5.1, -22]],
    [[4.8, 3.65, -14], [7.7, 5.5, -20], [5.6, 2.45, -11], [3.9, 6.15, -19]],
];
const guides = {
    mouse: [['W', 'A', 'S', 'D', 'Move'], ['Mouse', 'Look'], ['Click', 'Fire'], ['Q', 'Sights'], ['R', 'Reload'], ['Esc', 'Pause']],
    keyboard: [['W', 'A', 'S', 'D', 'Move'], ['↑', '↓', '←', '→', 'Look'], ['Space', 'Fire'], ['Q', 'Sights'], ['R', 'Reload'], ['Esc', 'Pause']],
    touch: [['Drag', 'Look'], ['Aim', 'Sights'], ['Fire', 'Shoot'], ['Reload', 'Swap magazine']],
    gyro: [['Tilt', 'Look'], ['Drag', 'Adjust aim'], ['Recenter', 'Reset aim'], ['Fire', 'Shoot']],
};
const controlHints = {
    mouse: { look: 'WASD move · Mouse look', trigger: 'Click', aim: 'Q / Right click sights' },
    keyboard: { look: 'WASD move · Arrows look', trigger: 'Space', aim: 'Q sights' },
    touch: { look: 'Drag to look', trigger: 'Fire', aim: 'Aim for sights' },
    gyro: { look: 'Tilt or drag to look', trigger: 'Fire', aim: 'Aim for sights' },
};
const gyroMessages = {
    waiting: 'Move your phone to calibrate',
    ready: 'Gyroscope on',
    denied: 'Motion access denied. Drag to aim.',
    unavailable: 'Motion unavailable. Drag to aim.',
};
const isTouchControl = control => control === 'touch' || control === 'gyro';
const trainerRecoil = { pitch: .014, yaw: .005, climb: .0008 };
const aimKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const byId = id => document.getElementById(id);
const stage = byId('stage');
const startButton = byId('start-button');
const controlSelect = byId('control-select');
const notice = byId('lobby-notice');
const preferences = loadPreferences(matchMedia('(pointer: coarse)').matches, matchMedia('(prefers-reduced-motion: reduce)').matches);
const audio = createAudio(preferences);
let selected = 'reflex';
let sessions = readSessions();

function showNotice(element, message = '') {
    element.textContent = message;
    element.hidden = !message;
}

function showRangeStatus(ready) {
    const system = byId('system-status');
    const feed = byId('feed-live');
    system.lastElementChild.textContent = ready ? 'RANGE ONLINE' : 'RANGE OFFLINE';
    feed.lastElementChild.textContent = ready ? 'LIVE FEED' : 'UNAVAILABLE';
    system.toggleAttribute('data-ready', ready);
    feed.toggleAttribute('data-ready', ready);
}

function showGuide() {
    controlSelect.value = preferences.control;
    byId('key-guide').replaceChildren(...guides[preferences.control].map((group) => {
        const span = document.createElement('span');
        for (const key of group.slice(0, -1)) {
            const kbd = document.createElement('kbd');
            kbd.textContent = key;
            span.append(kbd);
        }
        span.append(document.createTextNode(` ${group.at(-1)}`));
        return span;
    }));
}

function selectControl(value) {
    preferences.control = value;
    showGuide();
    saveValue('preferences', preferences);
}

function refreshProgress() {
    sessions = readSessions();
    renderProgress(sessions, selected, preferences);
    if (byId('journal-dialog').open) renderJournal(sessions, selected, preferences);
}

function init() {
    for (const [key, mode] of Object.entries(modes)) {
        const label = document.createElement('label');
        label.className = 'drill';
        // All drill markup comes from the fixed local catalog.
        label.innerHTML = `<input type="radio" name="drill" value="${key}">
            <span class="drill-icon"><svg><use href="#icon-${mode.icon}"/></svg></span>
            <span class="drill-copy"><strong>${mode.name}</strong><small>${mode.description}</small></span>
            <span class="drill-duration">${mode.duration} SEC</span>`;
        const radio = label.querySelector('input');
        radio.checked = key === selected;
        radio.addEventListener('change', () => {
            selected = key;
            refreshProgress();
        });
        byId('drill-options').append(label);
    }
    const loadoutButton = byId('loadout-button');
    const armory = byId('armory-dialog');
    for (const [key, weapon] of Object.entries(weapons)) {
        const card = document.createElement('label');
        card.className = 'armory-card';
        card.style.setProperty('--weapon-accent', weapon.accent);
        const rpm = Math.round(60000 / weapon.interval);
        const reload = weapon.magazine == null ? '—' : `${(weapon.reload / 1000).toFixed(2)}s`;
        // These labels and SVG paths come from the fixed weapon catalog.
        card.innerHTML = `<input type="radio" name="loadout" value="${key}">
            <span class="armory-kind">${weapon.category} · ${weapon.automatic ? 'Auto' : 'Semi'}</span>
            <svg viewBox="0 0 100 32" aria-hidden="true"><path d="${weapon.silhouette}"/></svg>
            <strong>${weapon.name}</strong><span class="armory-description">${weapon.description}</span>
            <span class="armory-specs">
                <span><b>${weapon.magazine ?? '∞'}</b><small>ROUNDS</small></span>
                <span><b>${rpm}</b><small>RPM</small></span>
                <span><b>${reload}</b><small>RELOAD</small></span>
                <span><b>${weapon.zoom}×</b><small>OPTIC</small></span>
            </span>`;
        card.querySelector('input').addEventListener('change', () => equipLoadout(key));
        byId('armory-options').append(card);
    }
    loadoutButton.addEventListener('click', () => armory.showModal());

    function showLoadout() {
        const weapon = weapons[preferences.loadout];
        document.querySelector(`input[name="loadout"][value="${preferences.loadout}"]`).checked = true;
        byId('loadout-name').textContent = weapon.name;
        byId('loadout-silhouette').setAttribute('d', weapon.silhouette);
        loadoutButton.style.setProperty('--weapon-accent', weapon.accent);
    }

    function equipLoadout(key) {
        preferences.loadout = key;
        showLoadout();
        saveValue('preferences', preferences);
        refreshProgress();
    }

    showLoadout();
    showGuide();
    refreshProgress();
    controlSelect.addEventListener('change', () => {
        selectControl(controlSelect.value);
        showNotice(notice);
    });
    byId('difficulty').value = preferences.difficulty;
    byId('difficulty').addEventListener('change', (event) => {
        preferences.difficulty = event.target.value;
        saveValue('preferences', preferences);
        refreshProgress();
    });
    const openJournal = () => {
        refreshProgress();
        renderJournal(sessions, selected, preferences);
        byId('journal-dialog').showModal();
    };
    byId('history-button').addEventListener('click', openJournal);
    byId('medals-button').addEventListener('click', openJournal);

    let arena;
    let controls;
    const settingsDialog = byId('settings-dialog');
    const openSettings = () => settingsDialog.showModal();
    byId('settings-button').addEventListener('click', openSettings);
    byId('pause-settings-button').addEventListener('click', openSettings);

    function applyPreferences() {
        byId('performance').hidden = !preferences.showPerformance;
        for (const id of ['reticle', 'crosshair-preview']) {
            const reticle = byId(id);
            reticle.dataset.shape = preferences.crosshair;
            reticle.style.setProperty('--reticle-color', preferences.crosshairColor);
            reticle.style.setProperty('--reticle-size', `${preferences.crosshairSize}px`);
        }
        if (controls) controls.pointerSpeed = preferences.sensitivity / arena.camera.zoom;
        if (arena) {
            arena.configure(preferences);
            arena.render();
        }
    }

    const sliders = [
        ['sensitivity', 'sensitivity', value => `${value.toFixed(1)}×`],
        ['gyro-sensitivity', 'gyroSensitivity', value => `${value.toFixed(1)}×`],
        ['fov', 'fov', value => `${value}°`],
        ['target-size', 'targetSize', value => `${value.toFixed(1)}×`],
        ['crosshair-size', 'crosshairSize', value => `${value} px`],
        ['volume', 'volume', value => `${Math.round(value * 100)}%`],
    ];
    for (const [id, key, format] of sliders) {
        const input = byId(id);
        const output = byId(id + '-value');
        input.value = preferences[key];
        output.value = format(preferences[key]);
        input.addEventListener('input', () => {
            preferences[key] = Number(input.value);
            output.value = format(preferences[key]);
            applyPreferences();
            refreshProgress();
        });
        input.addEventListener('change', () => saveValue('preferences', preferences));
    }
    const choices = [
        ['target-color', 'targetColor'], ['crosshair-color', 'crosshairColor'],
        ['crosshair-shape', 'crosshair'], ['quality', 'quality'],
        ['sound', 'sound'], ['weapon', 'weapon'], ['motion', 'motion'],
        ['show-performance', 'showPerformance'],
    ];
    for (const [id, key] of choices) {
        const input = byId(id);
        if (input.type === 'checkbox') input.checked = preferences[key];
        else input.value = preferences[key];
        input.addEventListener('change', () => {
            preferences[key] = input.type === 'checkbox' ? input.checked : input.value;
            saveValue('preferences', preferences);
            applyPreferences();
        });
    }
    applyPreferences();
    settingsDialog.addEventListener('close', () => audio.ready());

    const fullscreenButton = byId('fullscreen-button');
    fullscreenButton.hidden = !document.fullscreenEnabled;
    fullscreenButton.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
        } catch {
            showNotice(notice, 'Fullscreen is unavailable in this window.');
        }
    });
    document.addEventListener('fullscreenchange', () => {
        fullscreenButton.ariaLabel = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
        fullscreenButton.querySelector('span').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    });

    try {
        arena = createArena(byId('arena'));
    } catch {
        showRangeStatus(false);
        showNotice(notice, 'The 3D range needs a browser with WebGL enabled.');
        return;
    }
    const { canvas, camera, targets } = arena;
    controls = new PointerLockControls(camera, canvas);
    controls.minPolarAngle = Math.PI / 2 - 1.22;
    controls.maxPolarAngle = Math.PI / 2 + 1.22;
    controls.pointerSpeed = preferences.sensitivity;
    arena.configure(preferences);

    function selectEnvironment(key) {
        preferences.environment = key;
        arena.setEnvironment(key);
        byId('arena-name').textContent = environments[key].name;
        byId('arena-subtitle').textContent = environments[key].subtitle.toUpperCase();
        for (const button of document.querySelectorAll('[data-environment]')) {
            button.setAttribute('aria-pressed', button.dataset.environment === key);
        }
        saveValue('preferences', preferences);
        arena.render();
    }
    for (const button of document.querySelectorAll('[data-environment]')) {
        button.addEventListener('click', () => selectEnvironment(button.dataset.environment));
    }
    selectEnvironment(preferences.environment);

    const combat = byId('combat');
    const pausePanel = byId('pause-panel');
    const resultsPanel = byId('results-panel');
    const countdown = byId('countdown');
    const time = byId('time');
    const timeBar = byId('time-bar');
    const score = byId('score');
    const accuracy = byId('accuracy');
    const streak = byId('streak');
    const feedback = byId('hit-feedback');
    const marker = byId('hit-marker');
    const pauseButton = byId('pause-button');
    const resumeButton = byId('resume-button');
    const keyboardResume = byId('keyboard-resume');
    const fireButton = byId('fire-button');
    const aimButton = byId('aim-button');
    const reloadButton = byId('reload-button');
    const gyroTools = byId('gyro-tools');
    const gyroStatus = byId('gyro-status');
    const recenterButton = byId('recenter-button');
    const gyroscope = createGyroscope(showGyroStatus);
    const weaponReadout = byId('weapon-readout');
    const weaponStatus = byId('weapon-status');
    const ammoCurrent = byId('ammo-current');
    const reloadTrack = byId('reload-track');
    const reloadBar = byId('reload-bar');
    const background = document.querySelectorAll('.topbar, .lobby, .records, .footer, .range-toolbar, .training-panels');
    const keys = new Set();
    const heldFire = new Set();
    const walk = new Vector2();
    let drag = null;
    let state = 'lobby';
    let pendingLock = null;
    let pendingMotion = false;
    let pausedPhase;
    let phaseEnds;
    let round;
    let lastFrame = performance.now();
    let lastPerformanceLabel = 0;
    stage.tabIndex = -1;

    function setState(next) {
        const wasRunning = !combat.hidden;
        const running = next === 'countdown' || next === 'active';
        state = next;
        stage.dataset.state = state;
        combat.hidden = !running;
        pausePanel.hidden = state !== 'paused';
        resultsPanel.hidden = state !== 'results';
        document.body.classList.toggle('in-range', state !== 'lobby');
        for (const item of background) item.inert = state !== 'lobby';
        if (running !== wasRunning && round?.control === 'gyro') {
            if (!running) gyroscope.disconnect();
            else if (round.motionAccess === 'granted') gyroscope.connect();
            else showGyroStatus(round.motionAccess);
        }
    }

    function showGyroStatus(status) {
        gyroStatus.textContent = gyroMessages[status];
        recenterButton.hidden = status !== 'ready';
    }

    function setControlUI() {
        const { control, automatic, weapon } = round;
        const touch = isTouchControl(control);
        stage.dataset.control = control;
        stage.toggleAttribute('data-touch', touch);
        const guide = controlHints[control];
        const trigger = automatic ? `Hold ${guide.trigger} to fire` : `${guide.trigger} to fire`;
        const reload = !touch && weapon.magazine != null ? ' · R reload' : '';
        const pauseHint = touch ? '' : ' · Esc pause';
        byId('combat-hint').textContent = `${guide.look} · ${trigger} · ${guide.aim}${reload}${pauseHint}`;
        pauseButton.hidden = control === 'mouse';
        fireButton.hidden = control === 'mouse';
        aimButton.hidden = control === 'mouse';
        reloadButton.hidden = control === 'mouse' || weapon.magazine == null;
        gyroTools.hidden = control !== 'gyro';
        fireButton.textContent = automatic ? 'Hold Fire' : 'Fire';
    }

    function updateWeaponHud() {
        const { weapon, ammo, aimed, automatic, reloadUntil } = round;
        const reloading = reloadUntil != null;
        ammoCurrent.textContent = ammo == null ? '∞' : String(ammo).padStart(2, '0');
        const status = reloading ? 'RELOADING' : aimed ? `ADS · ${weapon.zoom}×` : automatic ? 'AUTO' : 'SEMI';
        if (weaponStatus.textContent !== status) weaponStatus.textContent = status;
        weaponReadout.toggleAttribute('data-low', ammo != null && ammo <= Math.ceil(weapon.magazine * .25));
        reloadTrack.hidden = !reloading;
        reloadButton.disabled = reloading || ammo === weapon.magazine;
        aimButton.disabled = reloading;
        aimButton.setAttribute('aria-pressed', aimed);
        stage.dataset.aiming = aimed;
    }

    function setTarget(target, point, radius) {
        target.position.set(...point);
        target.scale.setScalar(radius);
        target.visible = true;
    }

    function showPreview() {
        arena.resetCamera(true);
        arena.clearSparks();
        setTarget(targets[0], [-5.3, 3.75, -12.5], 1.04);
        setTarget(targets[1], [.35, 4.25, -19], 1.04);
        setTarget(targets[2], [6.25, 4.9, -15.6], 1.04);
        arena.resize();
        arena.render();
    }

    function updateStats() {
        score.textContent = round.score.toLocaleString();
        accuracy.textContent = round.shots ? `${Math.round(round.hits * 100 / round.shots)}%` : '—';
        streak.textContent = round.streak;
    }

    function updateTimer(remaining) {
        const label = `0:${String(Math.ceil(remaining / 1000)).padStart(2, '0')}`;
        if (time.textContent !== label) time.textContent = label;
        timeBar.style.transform = `scaleX(${remaining / (round.mode.duration * 1000)})`;
        time.closest('.hud').toggleAttribute('data-urgent', remaining <= 5000);
    }

    function spawnTarget(target, point, elapsed) {
        setTarget(target, point, round.radius);
        target.userData.spawnAt = elapsed;
        target.userData.attempted = false;
        target.userData.expiresAt = elapsed + round.difficulty.exposure;
    }

    function startRound(control, motionAccess = 'unavailable') {
        const mode = modes[selected];
        const difficulty = difficulties[preferences.difficulty];
        const loadout = preferences.loadout;
        const weapon = weapons[loadout];
        round = {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            key: selected, mode, control, motionAccess, difficulty, difficultyKey: preferences.difficulty,
            targetSize: preferences.targetSize, environment: preferences.environment,
            radius: mode.radius * difficulty.radius * preferences.targetSize,
            score: 0, shots: 0, hits: 0, bullseyes: 0, streak: 0, bestStreak: 0, escaped: 0,
            lastShot: -Infinity, lastSpawn: positions[1][0], flickSide: 1, elapsed: 0,
            responses: [], intervals: [], placements: [], lastHitAt: null, sprayIndex: 0,
            loadout, weapon, ammo: weapon.magazine, reloadUntil: null, reloads: 0, aimed: false, aimedHits: 0,
            automatic: weapon.automatic || (selected === 'recoil' && loadout === defaultLoadout),
            daily: dailyChallenge(),
        };
        clearInput();
        arena.setLoadout(loadout);
        arena.resetCamera(false);
        arena.clearSparks();
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            target.visible = i < mode.count;
            if (target.visible) spawnTarget(target, positions[mode.count === 1 ? 1 : i][0], 0);
            target.userData.lastSpawn = 0;
            target.visible = false;
        }
        byId('active-drill').textContent = mode.name;
        byId('combat-location').textContent = `${environments[round.environment].name.toUpperCase()} / ${difficulty.name.toUpperCase()}`;
        byId('combat-weapon').textContent = weapon.name;
        byId('ammo-capacity').textContent = weapon.magazine == null ? '' : `/ ${weapon.magazine}`;
        stage.dataset.optic = weapon.scoped ? 'scope' : 'sights';
        stage.style.setProperty('--weapon-accent', weapon.accent);
        setControlUI();
        updateWeaponHud();
        feedback.classList.remove('is-hit');
        marker.classList.remove('is-hit');
        updateStats();
        updateTimer(mode.duration * 1000);
        countdown.textContent = '3';
        countdown.hidden = false;
        setState('countdown');
        phaseEnds = performance.now() + 3000;
        audio.play('tick');
        stage.focus({ preventScroll: true });
        arena.update(0, 0, false);
        arena.resize();
        arena.render();
    }

    function clearInput() {
        keys.clear();
        heldFire.clear();
        if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
        drag = null;
    }

    function elapsedAt(now) {
        return MathUtils.clamp(round.mode.duration * 1000 - phaseEnds + now, 0, round.mode.duration * 1000);
    }

    function pause() {
        if (state !== 'active' && state !== 'countdown') return;
        const now = performance.now();
        if (state === 'active' && now >= phaseEnds) {
            finishRound();
            return;
        }
        if (state === 'active') round.elapsed = elapsedAt(now);
        pausedPhase = { state, remaining: Math.max(0, phaseEnds - now) };
        clearInput();
        showNotice(byId('pause-notice'), 'Your timer and score are on hold.');
        keyboardResume.hidden = round.control !== 'mouse';
        setState('paused');
        if (document.pointerLockElement === canvas) controls.unlock();
        resumeButton.focus({ preventScroll: true });
    }

    function resume(control) {
        round.control = control;
        setControlUI();
        setState(pausedPhase.state);
        phaseEnds = performance.now() + pausedPhase.remaining;
        lastFrame = performance.now();
        stage.focus({ preventScroll: true });
    }

    function finishRound() {
        if (state !== 'active') return;
        clearInput();
        setState('results');
        if (document.pointerLockElement === canvas) controls.unlock();
        const priorSessions = readSessions();
        const session = {
            id: round.id, mode: round.key, difficulty: round.difficultyKey, targetSize: round.targetSize,
            environment: round.environment, finishedAt: new Date().toISOString(),
            score: round.score, shots: round.shots, hits: round.hits, bullseyes: round.bullseyes,
            bestStreak: round.bestStreak, escaped: round.escaped,
            loadout: round.loadout, reloads: round.reloads, aimedHits: round.aimedHits,
            response: average(round.responses), interval: average(round.intervals),
            placements: round.placements, daily: round.daily,
        };
        const saved = saveSession(session);
        refreshProgress();
        const xpGained = profileFor(sessions).xp - profileFor(priorSessions).xp;
        renderReport(session, priorSessions, xpGained);
        showNotice(byId('result-notice'), saved ? '' : 'Browser storage is unavailable or full. This report is available for the current tab.');
        byId('replay-button').focus({ preventScroll: true });
        audio.play('complete');
    }

    function returnToLobby() {
        pendingLock = null;
        clearInput();
        setState('lobby');
        showPreview();
        refreshProgress();
        startButton.focus({ preventScroll: true });
    }

    function lockFailed() {
        if (!pendingLock) return;
        const action = pendingLock;
        pendingLock = null;
        if (action === 'resume') {
            showNotice(byId('pause-notice'), 'Mouse capture is unavailable here. You can resume with keyboard controls.');
        } else {
            selectControl('keyboard');
            showNotice(state === 'results' ? byId('result-notice') : notice,
                'Mouse capture is unavailable here. Start again to use keyboard controls.');
        }
    }

    async function requestPlay(action, control) {
        if (pendingLock || pendingMotion) return;
        if (action === 'start' && control === 'gyro') {
            const source = state;
            pendingMotion = true;
            const permission = requestMotionAccess();
            audio.ready();
            const access = await permission;
            pendingMotion = false;
            if (state === source && preferences.control === 'gyro') {
                startRound(control, access);
                if (document.hidden) pause();
            }
            return;
        }
        audio.ready();
        if (control !== 'mouse') {
            if (action === 'resume') resume(control);
            else startRound(control);
            return;
        }
        pendingLock = action;
        try {
            if (!canvas.requestPointerLock) {
                lockFailed();
                return;
            }
            canvas.requestPointerLock()?.catch(lockFailed);
        } catch {
            lockFailed();
        }
    }

    controls.addEventListener('lock', () => {
        const action = pendingLock;
        pendingLock = null;
        if (action === 'resume') resume('mouse');
        else if (action === 'start') startRound('mouse');
        else controls.unlock();
    });
    controls.addEventListener('unlock', () => {
        if (round?.control === 'mouse') pause();
    });
    document.addEventListener('pointerlockerror', lockFailed);
    startButton.addEventListener('click', () => requestPlay('start', preferences.control));
    byId('replay-button').addEventListener('click', () => requestPlay('start', preferences.control));
    pauseButton.addEventListener('click', pause);
    resumeButton.addEventListener('click', () => requestPlay('resume', round.control));
    keyboardResume.addEventListener('click', () => {
        selectControl('keyboard');
        requestPlay('resume', 'keyboard');
    });
    byId('quit-button').addEventListener('click', returnToLobby);
    byId('done-button').addEventListener('click', returnToLobby);
    byId('daily-button').addEventListener('click', () => {
        const daily = dailyChallenge();
        selected = daily.mode;
        document.querySelector(`input[name="drill"][value="${selected}"]`).checked = true;
        preferences.difficulty = 'standard';
        preferences.targetSize = 1;
        byId('difficulty').value = 'standard';
        byId('target-size').value = '1';
        byId('target-size-value').value = '1.0×';
        equipLoadout(defaultLoadout);
        requestPlay('start', preferences.control);
    });

    function nextPoint(target) {
        if (round.key === 'flick') {
            const lane = round.flickSide > 0 ? 2 : 0;
            round.flickSide *= -1;
            return positions[lane][Math.floor(Math.random() * positions[lane].length)];
        }
        if (round.key === 'precision') {
            const lane = positions[targets.indexOf(target)];
            const next = (target.userData.lastSpawn + 1 + Math.floor(Math.random() * (lane.length - 1))) % lane.length;
            target.userData.lastSpawn = next;
            return lane[next];
        }
        const candidates = positions.flat().filter(point => point !== round.lastSpawn);
        round.lastSpawn = candidates[Math.floor(Math.random() * candidates.length)];
        return round.lastSpawn;
    }

    function respawn(target, elapsed) {
        if (['tracking', 'strafe', 'recoil'].includes(round.key)) return;
        spawnTarget(target, nextPoint(target), elapsed);
    }

    function updateTargets(elapsed) {
        const t = elapsed / 1000 * round.difficulty.speed;
        if (round.key === 'tracking') {
            targets[0].position.set(6.1 * Math.sin(t * 1.18) * Math.cos(t * .21),
                3.65 + 1.22 * Math.sin(t * 1.76), -14 - 2 * Math.sin(t * .7) ** 2);
        } else if (round.key === 'strafe') {
            targets[0].position.set(6.7 * Math.asin(Math.sin(t * 1.2)) * 2 / Math.PI, 3.65, -14);
        } else if (round.key === 'peek') {
            const target = targets[0];
            if (target.visible && elapsed >= target.userData.expiresAt) {
                target.visible = false;
                target.userData.readyAt = elapsed + 300 / round.difficulty.speed;
                round.escaped++;
                round.streak = 0;
                updateStats();
            } else if (!target.visible && elapsed >= target.userData.readyAt) {
                spawnTarget(target, nextPoint(target), elapsed);
            }
        }
    }

    function shotFeedback(hit, bullseye) {
        feedback.classList.remove('is-hit');
        marker.classList.remove('is-hit');
        feedback.dataset.miss = !hit;
        feedback.textContent = hit ? bullseye ? '+150 · BULLSEYE' : '+100' : 'MISS';
        void feedback.offsetWidth;
        feedback.classList.add('is-hit');
        if (hit) {
            marker.dataset.bullseye = bullseye;
            marker.classList.add('is-hit');
        }
    }

    function beginReload(elapsed) {
        if (round.ammo == null || round.ammo === round.weapon.magazine || round.reloadUntil != null) return;
        round.reloadUntil = elapsed + round.weapon.reload;
        round.aimed = false;
        reloadBar.style.transform = 'scaleX(0)';
        updateWeaponHud();
        audio.play('reload');
    }

    function advanceReload(elapsed) {
        if (round.reloadUntil == null) return null;
        if (elapsed < round.reloadUntil) {
            const progress = MathUtils.clamp(1 - (round.reloadUntil - elapsed) / round.weapon.reload, 0, 1);
            reloadBar.style.transform = `scaleX(${progress})`;
            return progress;
        }
        round.reloadUntil = null;
        round.ammo = round.weapon.magazine;
        round.reloads++;
        round.sprayIndex = 0;
        updateWeaponHud();
        audio.play('chamber');
        return null;
    }

    function reload() {
        const now = performance.now();
        if (state !== 'active' || now >= phaseEnds) return;
        const elapsed = elapsedAt(now);
        advanceReload(elapsed);
        beginReload(elapsed);
    }

    function toggleAim() {
        if (state !== 'active' || round.reloadUntil != null) return;
        round.aimed = !round.aimed;
        updateWeaponHud();
    }

    function shoot() {
        if (state !== 'active') return;
        const now = performance.now();
        if (now >= phaseEnds) {
            finishRound();
            return;
        }
        round.elapsed = elapsedAt(now);
        advanceReload(round.elapsed);
        if (round.reloadUntil != null) return;
        const classicRecoil = round.key === 'recoil' && round.loadout === defaultLoadout;
        const interval = classicRecoil ? 110 : round.weapon.interval;
        if (round.elapsed - round.lastShot < interval) return;
        if (round.elapsed - round.lastShot > 350) round.sprayIndex = 0;
        round.lastShot = round.elapsed;
        updateTargets(round.elapsed);
        round.shots++;
        if (round.ammo != null) round.ammo--;
        audio.play('shot', round.weapon.sound);
        arena.fire();
        const shot = arena.traceShot();
        if (shot) {
            if (round.placements.length >= 300) round.placements.shift();
            round.placements.push(shot.placement);
            if (!shot.target.userData.attempted) {
                round.responses.push(round.elapsed - shot.target.userData.spawnAt);
                shot.target.userData.attempted = true;
            }
        }
        if (shot?.hit) {
            round.hits++;
            round.aimedHits += Number(round.aimed);
            round.bullseyes += Number(shot.bullseye);
            round.score += shot.bullseye ? 150 : 100;
            round.streak++;
            round.bestStreak = Math.max(round.bestStreak, round.streak);
            if (round.lastHitAt != null) round.intervals.push(round.elapsed - round.lastHitAt);
            round.lastHitAt = round.elapsed;
            arena.burst(shot.point);
            if (round.key === 'recoil') arena.markImpact(shot);
            respawn(shot.target, round.elapsed);
            audio.play(shot.bullseye ? 'bullseye' : 'hit');
        } else {
            round.streak = 0;
        }
        shotFeedback(Boolean(shot?.hit), shot?.bullseye);
        const recoil = classicRecoil ? trainerRecoil : round.weapon.recoil;
        if (recoil.pitch) {
            const index = round.sprayIndex++;
            const strength = (round.key === 'recoil' ? round.difficulty.speed : 1) * (round.aimed ? .82 : 1);
            aim(Math.sin(index * .72) * recoil.yaw * strength,
                (recoil.pitch + Math.min(index, 12) * recoil.climb) * strength);
        }
        updateStats();
        if (round.ammo === 0) beginReload(round.elapsed);
        else updateWeaponHud();
    }

    function aim(yaw, pitch) {
        camera.rotation.y += yaw;
        camera.rotation.x = MathUtils.clamp(camera.rotation.x + pitch, -1.22, 1.22);
    }

    function aimWithKeys(step) {
        step /= camera.zoom;
        const yaw = Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
        const pitch = Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
        if (yaw || pitch) aim(yaw * step, pitch * step);
    }

    document.addEventListener('keydown', (event) => {
        if (state !== 'active' && state !== 'countdown') return;
        if (event.code === 'Escape') {
            if (round.control !== 'mouse') pause();
            return;
        }
        if (event.code === 'KeyQ' || event.code === 'KeyR') {
            event.preventDefault();
            if (!event.repeat) {
                if (event.code === 'KeyQ') toggleAim();
                else reload();
            }
        } else if (event.code === 'Space' && !event.target.closest('button')) {
            event.preventDefault();
            if (!event.repeat) {
                heldFire.add('space');
                shoot();
            }
        } else if (movementKeys.includes(event.code)) {
            event.preventDefault();
            keys.add(event.code);
        } else if (round.control === 'keyboard' && aimKeys.includes(event.code)) {
            event.preventDefault();
            keys.add(event.code);
            if (!event.repeat) aimWithKeys(.018);
        }
    });
    document.addEventListener('keyup', (event) => {
        keys.delete(event.code);
        if (event.code === 'Space') heldFire.delete('space');
    });
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
    });
    canvas.addEventListener('pointerdown', (event) => {
        if (state !== 'active' && state !== 'countdown') return;
        if (event.button === 2 && round.control === 'mouse') {
            toggleAim();
            return;
        }
        if (event.button !== 0) return;
        if (!isTouchControl(round.control)) {
            heldFire.add(event.pointerId);
            shoot();
        } else if (!drag) {
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
            canvas.setPointerCapture(event.pointerId);
        }
    });
    canvas.addEventListener('pointermove', (event) => {
        if (drag?.id !== event.pointerId) return;
        const sensitivity = .005 / camera.zoom;
        aim((drag.x - event.clientX) * sensitivity, (event.clientY - drag.y) * sensitivity);
        drag.x = event.clientX;
        drag.y = event.clientY;
    });
    canvas.addEventListener('lostpointercapture', (event) => {
        if (drag?.id === event.pointerId) drag = null;
    });
    canvas.addEventListener('contextmenu', event => {
        if (state === 'active' || state === 'countdown') event.preventDefault();
    });
    const releaseFire = event => heldFire.delete(event.pointerId);
    document.addEventListener('pointerup', releaseFire);
    document.addEventListener('pointercancel', releaseFire);
    fireButton.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || !round?.automatic) return;
        heldFire.add(event.pointerId);
        fireButton.setPointerCapture(event.pointerId);
        shoot();
    });
    fireButton.addEventListener('click', (event) => {
        if (!round?.automatic || event.detail === 0) shoot();
    });
    fireButton.addEventListener('lostpointercapture', releaseFire);
    aimButton.addEventListener('click', toggleAim);
    reloadButton.addEventListener('click', reload);
    recenterButton.addEventListener('click', () => {
        gyroscope.clearMovement();
        camera.rotation.set(0, 0, 0);
    });

    function move(delta) {
        walk.set(Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
            Number(keys.has('KeyW')) - Number(keys.has('KeyS')));
        if (!walk.lengthSq()) return;
        walk.normalize().multiplyScalar(delta * 8);
        camera.updateMatrix();
        controls.moveRight(walk.x);
        controls.moveForward(walk.y);
        camera.position.x = MathUtils.clamp(camera.position.x, -11.6, 11.6);
        camera.position.z = MathUtils.clamp(camera.position.z, 2.15, firingPosition.z + 4.8);
    }

    function frame(now) {
        requestAnimationFrame(frame);
        const realDelta = Math.max(0, (now - lastFrame) / 1000);
        const delta = Math.min(.045, realDelta);
        lastFrame = now;
        if (state !== 'active' && state !== 'countdown') return;
        if (round.control === 'gyro') {
            const motion = gyroscope.read(realDelta);
            const sensitivity = preferences.gyroSensitivity / camera.zoom;
            aim(motion.x * sensitivity, motion.y * sensitivity);
        }
        const remaining = Math.max(0, phaseEnds - now);
        let reloadProgress = null;
        if (state === 'countdown') {
            if (!remaining) {
                countdown.hidden = true;
                setState('active');
                for (let i = 0; i < targets.length; i++) targets[i].visible = i < round.mode.count;
                phaseEnds = now + round.mode.duration * 1000;
                audio.play('start');
            } else {
                const label = String(Math.ceil(remaining / 1000));
                if (countdown.textContent !== label) {
                    countdown.textContent = label;
                    audio.play('tick');
                }
            }
        } else {
            if (!remaining) {
                finishRound();
                return;
            }
            round.elapsed = elapsedAt(now);
            updateTimer(remaining);
            updateTargets(round.elapsed);
            reloadProgress = advanceReload(round.elapsed);
            if (round.automatic && heldFire.size) shoot();
        }
        if (round.control === 'keyboard') aimWithKeys(delta * 1.05);
        move(delta);
        arena.update(realDelta, round.elapsed / 1000, walk.lengthSq() > 0, round.aimed, reloadProgress);
        controls.pointerSpeed = preferences.sensitivity / camera.zoom;
        if (now - lastPerformanceLabel > 1000) {
            const performance = arena.performance();
            byId('performance').textContent = `${performance.fps} FPS · ${preferences.quality.toUpperCase()}`;
            lastPerformanceLabel = now;
        }
        arena.render();
    }

    new ResizeObserver(() => {
        arena.resize();
        arena.render();
    }).observe(byId('arena'));
    window.addEventListener('storage', (event) => {
        if (stage.isConnected && (!event.key || event.key.startsWith('aimforge.range.v1.'))) refreshProgress();
    });
    setInterval(() => {
        if (state === 'lobby') refreshProgress();
    }, 60000);
    showPreview();
    showRangeStatus(true);
    startButton.disabled = false;
    byId('daily-button').disabled = false;
    requestAnimationFrame(frame);
}

init();
