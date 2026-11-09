export function createAudio(preferences) {
    let context;
    let noise;

    function ready() {
        if (!preferences.sound || !window.AudioContext) return;
        try {
            context ??= new AudioContext();
            if (!noise) {
                noise = context.createBuffer(1, context.sampleRate * .16, context.sampleRate);
                const channel = noise.getChannelData(0);
                for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
            }
            context.resume().catch(() => {});
        } catch {
            // Effects are optional when audio is unavailable.
        }
    }

    function tone(start, end, duration, volume, type = 'sine', delay = 0) {
        const time = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(start, time);
        oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
        gain.gain.setValueAtTime(.001, time);
        gain.gain.linearRampToValueAtTime(volume * preferences.volume, time + .005);
        gain.gain.exponentialRampToValueAtTime(.001, time + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + duration);
    }

    function play(name) {
        if (!preferences.sound || preferences.volume <= 0 || context?.state !== 'running') return;
        if (name === 'shot') {
            tone(140, 48, .13, .22, 'triangle');
            const source = context.createBufferSource();
            source.buffer = noise;
            const filter = context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1500;
            const gain = context.createGain();
            const time = context.currentTime;
            gain.gain.setValueAtTime(.17 * preferences.volume, time);
            gain.gain.exponentialRampToValueAtTime(.001, time + .065);
            source.connect(filter).connect(gain).connect(context.destination);
            source.start();
            source.stop(time + .08);
        } else if (name === 'hit') {
            tone(780, 500, .08, .1);
        } else if (name === 'bullseye') {
            tone(880, 1100, .12, .13);
            tone(1320, 1500, .12, .07, 'sine', .045);
        } else if (name === 'tick') {
            tone(470, 420, .12, .07);
        } else if (name === 'start') {
            tone(540, 820, .2, .11);
        } else if (name === 'complete') {
            tone(520, 660, .18, .09);
            tone(780, 1040, .23, .09, 'sine', .12);
        }
    }

    return { ready, play };
}
