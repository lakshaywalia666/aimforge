import { Euler, MathUtils, Quaternion, Vector2, Vector3 } from 'three';

export async function requestMotionAccess() {
    const orientation = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !orientation) return 'unavailable';
    if (typeof orientation.requestPermission !== 'function') return 'granted';
    try {
        return await orientation.requestPermission() === 'granted' ? 'granted' : 'denied';
    } catch {
        return 'unavailable';
    }
}

export function createGyroscope(onStatus) {
    const screenAxis = new Vector3(0, 0, 1);
    const deviceAngles = new Euler();
    const viewAngles = new Euler();
    const current = new Quaternion();
    const previous = new Quaternion();
    const screenRotation = new Quaternion();
    const change = new Quaternion();
    const pending = new Vector2();
    const step = new Vector2();
    let previousScreenAngle = null;
    let receivedReading = false;
    let timeout;

    function clearMovement() {
        pending.set(0, 0);
    }

    function onReading({ alpha, beta, gamma }) {
        if (![alpha, beta, gamma].every(Number.isFinite)) return;
        const screenAngle = window.screen.orientation?.angle ?? window.orientation ?? 0;
        const radians = MathUtils.degToRad;
        // Express the sensor rotation in screen coordinates so landscape aiming uses the same axes.
        deviceAngles.set(radians(beta), radians(gamma), radians(alpha), 'ZXY');
        screenRotation.setFromAxisAngle(screenAxis, -radians(screenAngle));
        current.setFromEuler(deviceAngles).multiply(screenRotation);

        if (previousScreenAngle === screenAngle && previous.angleTo(current) < Math.PI / 2) {
            change.copy(previous).invert().multiply(current);
            viewAngles.setFromQuaternion(change, 'YXZ');
            pending.x += viewAngles.y;
            pending.y += viewAngles.x;
        } else {
            clearMovement();
        }
        previous.copy(current);
        previousScreenAngle = screenAngle;
        if (!receivedReading) {
            receivedReading = true;
            window.clearTimeout(timeout);
            onStatus('ready');
        }
    }

    function disconnect() {
        window.removeEventListener('deviceorientation', onReading);
        window.clearTimeout(timeout);
        previousScreenAngle = null;
        receivedReading = false;
        clearMovement();
    }

    function connect() {
        disconnect();
        onStatus('waiting');
        window.addEventListener('deviceorientation', onReading);
        timeout = window.setTimeout(() => onStatus('unavailable'), 2500);
    }

    function read(delta) {
        // Apply new movement over a few frames, retaining the full turn as the smoothing catches up.
        step.copy(pending).multiplyScalar(1 - Math.exp(-36 * delta));
        pending.sub(step);
        if (pending.lengthSq() < 1e-12) clearMovement();
        return step;
    }

    return { connect, disconnect, clearMovement, read };
}
