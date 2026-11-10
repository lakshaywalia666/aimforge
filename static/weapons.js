export const defaultLoadout = 'trainer';

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
};

export function loadoutKey(value) {
    return typeof value === 'string' && Object.hasOwn(weapons, value) ? value : defaultLoadout;
}
