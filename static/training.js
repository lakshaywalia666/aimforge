export const modes = {
    reflex: { name: 'Reflex', duration: 30, count: 1, radius: 1.04, description: 'Snap between single targets', icon: 'reflex' },
    precision: { name: 'Precision', duration: 45, count: 3, radius: .64, description: 'Pick off smaller targets', icon: 'precision' },
    tracking: { name: 'Tracking', duration: 45, count: 1, radius: .94, description: 'Follow a flowing target', icon: 'tracking' },
    strafe: { name: 'Strafe', duration: 30, count: 1, radius: .9, description: 'Read lateral direction changes', icon: 'tracking' },
    flick: { name: 'Wide flick', duration: 30, count: 1, radius: .85, description: 'Alternate across the range', icon: 'reflex' },
    peek: { name: 'Quick peek', duration: 30, count: 1, radius: .95, description: 'Hit targets before they vanish', icon: 'precision' },
    recoil: { name: 'Recoil', duration: 30, count: 1, radius: 1.55, description: 'Hold fire and control the climb', icon: 'reflex' },
};

export const difficulties = {
    relaxed: { name: 'Relaxed', radius: 1.25, speed: .7, exposure: 1800 },
    standard: { name: 'Standard', radius: 1, speed: 1, exposure: 1250 },
    expert: { name: 'Expert', radius: .75, speed: 1.4, exposure: 850 },
};

export const environments = {
    foundry: { name: 'Foundry', subtitle: 'Industrial ballistics lab' },
    laboratory: { name: 'Laboratory', subtitle: 'Clean room precision range' },
    outpost: { name: 'Outpost', subtitle: 'Open air desert facility' },
};

const prefix = 'aimforge.range.v1.';
const memorySessions = new Map();
const choose = (value, options, fallback) => Object.hasOwn(options, value) ? value : fallback;
const number = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function readValue(key) {
    try {
        return JSON.parse(localStorage.getItem(prefix + key));
    } catch {
        return null;
    }
}

export function saveValue(key, value) {
    try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function loadPreferences(coarsePointer, reducedMotion) {
    const stored = readValue('preferences');
    return {
        control: choose(stored?.control, { mouse: 1, keyboard: 1, touch: 1 }, coarsePointer ? 'touch' : 'mouse'),
        sensitivity: number(stored?.sensitivity, .2, 2.5, 1),
        sound: stored?.sound !== false,
        volume: number(stored?.volume, 0, 1, .6),
        difficulty: choose(stored?.difficulty, difficulties, 'standard'),
        environment: choose(stored?.environment, environments, 'foundry'),
        targetSize: number(stored?.targetSize, .6, 1.5, 1),
        targetColor: color(stored?.targetColor, '#ffa05b'),
        fov: number(stored?.fov, 50, 100, 65),
        crosshair: choose(stored?.crosshair, { cross: 1, dot: 1, ring: 1 }, 'cross'),
        crosshairColor: color(stored?.crosshairColor, '#fff4e8'),
        crosshairSize: number(stored?.crosshairSize, 12, 40, 24),
        quality: choose(stored?.quality, { auto: 1, low: 1, medium: 1, high: 1 }, 'auto'),
        showPerformance: stored?.showPerformance === true,
        weapon: stored?.weapon !== false,
        motion: typeof stored?.motion === 'boolean' ? stored.motion : !reducedMotion,
    };
}

export function configurationKey(mode, difficulty, size) {
    return `${mode}.${difficulty}.${Number(size).toFixed(2)}`;
}

export function readSessions() {
    const sessions = new Map(memorySessions);
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(prefix + 'session.')) continue;
            try {
                const value = JSON.parse(localStorage.getItem(key));
                if (validSession(value)) sessions.set(value.id, value);
            } catch {
                // An invalid browser record should not block the range.
            }
        }
    } catch {
        // Session history stays available in memory when storage is restricted.
    }
    return [...sessions.values()].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
}

function validSession(session) {
    return session && typeof session.id === 'string' && typeof session.finishedAt === 'string'
        && Number.isFinite(Date.parse(session.finishedAt)) && Object.hasOwn(modes, session.mode)
        && Object.hasOwn(difficulties, session.difficulty) && Number.isFinite(session.targetSize)
        && Number.isSafeInteger(session.score) && session.score >= 0
        && Number.isSafeInteger(session.hits) && session.hits >= 0
        && Number.isSafeInteger(session.shots) && session.shots >= session.hits
        && Number.isSafeInteger(session.bestStreak) && session.bestStreak >= 0
        && Number.isSafeInteger(session.bullseyes) && session.bullseyes >= 0 && session.bullseyes <= session.hits;
}

export function saveSession(session) {
    memorySessions.set(session.id, session);
    return saveValue('session.' + session.id, session);
}

export function matchingSessions(sessions, mode, difficulty, size) {
    const key = configurationKey(mode, difficulty, size);
    return sessions.filter(session => configurationKey(session.mode, session.difficulty, session.targetSize) === key);
}

export function getRecord(sessions, mode, difficulty, size) {
    const matching = matchingSessions(sessions, mode, difficulty, size);
    const record = { score: 0, accuracy: null, completed: 0 };
    // Preserve records from the original three-drill version at their original size.
    if (difficulty === 'standard' && size === 1) {
        const previous = readValue(mode);
        if (Number.isSafeInteger(previous?.completed) && previous.completed > 0
            && Number.isSafeInteger(previous.score) && previous.score >= 0) {
            record.completed = previous.completed;
            record.score = previous.score;
            if (Number.isInteger(previous.accuracy) && previous.accuracy >= 0 && previous.accuracy <= 100) {
                record.accuracy = previous.accuracy;
            }
        }
    }
    for (const session of matching) {
        record.completed++;
        record.score = Math.max(record.score, session.score);
        if (session.shots) record.accuracy = Math.max(record.accuracy ?? 0, Math.round(session.hits * 100 / session.shots));
    }
    return record;
}

export function dateKey(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function dailyChallenge(date = new Date()) {
    const day = dateKey(date);
    const index = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) % Object.keys(modes).length;
    const mode = Object.keys(modes)[index];
    return { day, mode, hits: 15, accuracy: 70 };
}

export function qualifiesForDaily(session) {
    const daily = session.daily;
    return daily && session.mode === daily.mode && session.difficulty === 'standard' && session.targetSize === 1
        && dateKey(new Date(session.finishedAt)) === daily.day
        && session.hits >= daily.hits && session.shots > 0 && session.hits * 100 / session.shots >= daily.accuracy;
}

export function medalFor(session) {
    const accuracy = session.shots ? session.hits * 100 / session.shots : 0;
    if (session.hits >= 25 && accuracy >= 90) return 'Gold';
    if (session.hits >= 15 && accuracy >= 75) return 'Silver';
    if (session.hits >= 5 && accuracy >= 50) return 'Bronze';
    return 'Practice';
}

export function profileFor(sessions) {
    const hits = sessions.reduce((total, session) => total + session.hits, 0);
    const dailyDays = new Set(sessions.filter(qualifiesForDaily).map(session => session.daily.day));
    const xp = sessions.reduce((total, session) => total + 100 + session.hits * 10 + session.bullseyes * 5, 0) + dailyDays.size * 250;
    const medals = [
        { name: 'First steps', description: 'Complete your first drill', earned: sessions.length >= 1 },
        { name: 'On target', description: 'Land 100 total hits', earned: hits >= 100 },
        { name: 'Regular', description: 'Complete 10 drills', earned: sessions.length >= 10 },
        { name: 'Sharpshooter', description: '90% accuracy with at least 20 shots', earned: sessions.some(session => session.shots >= 20 && session.hits / session.shots >= .9) },
        { name: 'In the zone', description: 'Build a 20-hit streak', earned: sessions.some(session => session.bestStreak >= 20) },
        { name: 'All rounder', description: 'Complete all seven drills', earned: new Set(sessions.map(session => session.mode)).size === Object.keys(modes).length },
        { name: 'Daily discipline', description: 'Complete a daily challenge', earned: dailyDays.size > 0 },
    ];
    return { hits, xp, level: Math.floor(xp / 1000) + 1, medals, dailyDays };
}

export function average(values) {
    return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}
