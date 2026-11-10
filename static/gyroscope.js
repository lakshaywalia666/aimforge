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
    const neutralInverse = new Quaternion();
    const screenRotation = new Quaternion();
    const change = new Quaternion();
    const pending = new Vector2();
    const step = new Vector2();
    let previousScreenAngle = null;
    let previousHadHeading = false;
    let timeout;

    function recenter() {
        neutralInverse.copy(current).invert();
        viewAngles.set(0, 0, 0, 'YXZ');
        pending.set(0, 0);
    }

    function onReading({ alpha, beta, gamma }) {
        if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
        const hasHeading = Number.isFinite(alpha);
        const screenAngle = window.screen.orientation?.angle ?? window.orientation ?? 0;
        const radians = MathUtils.degToRad;
        // Match the phone's screen axes in portrait and landscape before measuring tilt.
        deviceAngles.set(radians(beta), radians(gamma), hasHeading ? radians(alpha) : 0, 'ZXY');
        screenRotation.setFromAxisAngle(screenAxis, -radians(screenAngle));
        current.setFromEuler(deviceAngles).multiply(screenRotation);

        if (previousScreenAngle === screenAngle && previousHadHeading === hasHeading && previous.angleTo(current) < Math.PI / 2) {
            const { x: previousPitch, y: previousYaw, z: previousRoll } = viewAngles;
            change.copy(neutralInverse).multiply(current);
            viewAngles.setFromQuaternion(change, 'YXZ');
            // Both turning and dipping a side of the phone steer left and right.
            const turn = viewAngles.y - previousYaw + viewAngles.z - previousRoll;
            pending.x += MathUtils.euclideanModulo(turn + Math.PI, Math.PI * 2) - Math.PI;
            pending.y += viewAngles.x - previousPitch;
        } else {
            recenter();
            window.clearTimeout(timeout);
            onStatus('ready');
        }
        previous.copy(current);
        previousScreenAngle = screenAngle;
        previousHadHeading = hasHeading;
    }

    function disconnect() {
        window.removeEventListener('deviceorientation', onReading);
        window.clearTimeout(timeout);
        previousScreenAngle = null;
        pending.set(0, 0);
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
        if (pending.lengthSq() < 1e-12) pending.set(0, 0);
        return step;
    }

    return { connect, disconnect, recenter, read };
}
