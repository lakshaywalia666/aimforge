export const defaultLoadout = 'trainer';

const recording = name => new URL(`./sounds/${name}.mp3`, import.meta.url).href;

export const weapons = {
    trainer: {
        name: 'Forge Trainer',
        category: 'Training pistol',
        description: 'The classic range setup with unlimited rounds.',
        accent: '#ffad65',
        silhouette: 'M8 8h68v9H53l-7 12H33l4-12H8z M76 10h11v4H76z',
        magazine: null, interval: 115, reload: 0, zoom: 1.2, automatic: false,
        recoil: { pitch: 0, yaw: 0, climb: 0 },
        sound: { pitch: 140, tail: 48, length: .13, cutoff: 1500, crack: .17 },
    },
    pistol: {
        name: 'Viper P9',
        category: 'Sidearm',
        description: 'Quick single shots and the fastest reload in the armory.',
        accent: '#e9bc79',
        silhouette: 'M12 8h64l4 3v6H53l-5 12H34l5-12H12z M57 17h10v5H55z',
        magazine: 12, interval: 185, reload: 950, zoom: 1.35, automatic: false,
        recoil: { pitch: .009, yaw: .002, climb: .00035 },
        sound: { pitch: 240, tail: 82, length: .085, cutoff: 2700, crack: .14 },
    },
    smg: {
        name: 'Wraith SMG',
        category: 'Submachine gun',
        description: 'Fast bursts with a wider side-to-side recoil pattern.',
        accent: '#7fd5c2',
        silhouette: 'M3 11h21V7h44v4h17v6H55l4 11-10 2-5-13H33l-4 11H18l5-11H3z',
        magazine: 24, interval: 82, reload: 1330, zoom: 1.3, automatic: true,
        recoil: { pitch: .011, yaw: .008, climb: .00055 },
        sound: { pitch: 195, tail: 64, length: .067, cutoff: 2200, crack: .12 },
    },
    carbine: {
        name: 'Atlas C4',
        category: 'Carbine',
        description: 'A steady automatic rifle with a clear optic for longer lanes.',
        accent: '#c2d78e',
        silhouette: 'M2 11h22V8h25V4h14v4h17v4h17v4H61l-4 14H44l3-13h-9l-5 11H23l4-11H2z',
        magazine: 20, interval: 118, reload: 1560, zoom: 1.6, automatic: true,
        recoil: { pitch: .014, yaw: .004, climb: .00048 },
        sound: { pitch: 135, tail: 42, length: .13, cutoff: 1450, crack: .21 },
    },
    marksman: {
        name: 'Longshot DMR',
        category: 'Marksman rifle',
        description: 'A 2.4× scope and a deliberate, heavy shot for precise aim.',
        accent: '#aab9ff',
        silhouette: 'M2 13h24V9h12V5h5V2h24v3h6v4h6v4h19v4H59l-4 11H44l2-11h-8l-5 10H22l5-10H2z',
        magazine: 6, interval: 420, reload: 1800, zoom: 2.4, automatic: false, scoped: true,
        recoil: { pitch: .029, yaw: .003, climb: 0 },
        sound: { pitch: 102, tail: 31, length: .22, cutoff: 940, crack: .25 },
    },
    ak47: {
        name: 'AK-47',
        category: 'Assault rifle',
        description: 'Wood furniture, a curved magazine, and heavy recoil in automatic fire.',
        accent: '#e7a674',
        silhouette: 'M2 12 24 9h13V7h24l6 3h13V7h3v4h14v4H66l-5 4 1 6 4 3-5 3-8-4-3-9h-8l-5 10H26l5-11H20L2 22z',
        magazine: 30, interval: 100, reload: 1850, zoom: 1.45, automatic: true,
        recoil: { pitch: .019, yaw: .006, climb: .00075 },
        sound: { sample: recording('ak47'), pitch: 122, tail: 40, length: .15, cutoff: 1700, crack: .23 },
    },
    m4a1: {
        name: 'Colt M4A1 SOCOM',
        category: 'Carbine',
        description: 'A railed carbine with a fast cycle and a lighter recoil pattern.',
        accent: '#b9d5a1',
        silhouette: 'M3 10h23V8h16V5h15v3h18l4 3h18v4H75l-4 3H62l-1 11H49l2-11H38l-5 10H23l4-11H9l-2 6H3z',
        magazine: 30, interval: 80, reload: 1650, zoom: 1.55, automatic: true,
        recoil: { pitch: .012, yaw: .004, climb: .00045 },
        sound: { sample: recording('m4a1'), pitch: 158, tail: 48, length: .12, cutoff: 2200, crack: .21 },
    },
    m1911: {
        name: 'Colt 1911',
        category: 'Sidearm',
        description: 'A steel slide, walnut grips, and deliberate single shots.',
        accent: '#e2bc87',
        silhouette: 'M12 8h59l6 3v7H47l-5 12H28l5-13h-8l-6-4h-7z M42 16h14v5H45z M15 7h7v3h-7z',
        magazine: 7, interval: 220, reload: 1050, zoom: 1.35, automatic: false,
        recoil: { pitch: .015, yaw: .002, climb: .0004 },
        sound: { sample: recording('m1911'), pitch: 175, tail: 61, length: .12, cutoff: 2000, crack: .19 },
    },
};

export function loadoutKey(value) {
    return typeof value === 'string' && Object.hasOwn(weapons, value) ? value : defaultLoadout;
}
