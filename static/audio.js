const zombieRecordings = {
    roar: new URL('./sounds/roar.wav', import.meta.url).href,
    growl: new URL('./sounds/growl.wav', import.meta.url).href,
};

export function createAudio(preferences) {
    let context;
    let noise;
    let zombieVoice;
    const samples = new Map();

    function loadSample(url) {
        if (!url || samples.has(url)) return;
        const sample = {};
        samples.set(url, sample);
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Recording unavailable');
                return response.arrayBuffer();
            })
            .then(data => context.decodeAudioData(data))
            .then(buffer => { sample.buffer = buffer; })
            .catch(() => samples.delete(url));
    }

    function ready(shotSound, survival) {
        if (!preferences.sound || !window.AudioContext) return;
        try {
            context ??= new AudioContext();
            if (!noise) {
                noise = context.createBuffer(1, context.sampleRate * .16, context.sampleRate);
                const channel = noise.getChannelData(0);
                for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
            }
            context.resume().catch(() => {});
            loadSample(shotSound?.sample);
            if (survival) {
                loadSample(zombieRecordings.roar);
                loadSample(zombieRecordings.growl);
            }
        } catch {
            // Effects are optional when audio is unavailable.
        }
    }

    function stopZombie() {
        if (!zombieVoice) return;
        zombieVoice.stop();
        zombieVoice = undefined;
    }

    function playZombie(voice, camera) {
        if (!preferences.sound || preferences.volume <= 0 || context?.state !== 'running') return;
        const recorded = samples.get(zombieRecordings[voice.kind])?.buffer;
        if (!recorded) return;
        stopZombie();
        const source = context.createBufferSource();
        source.buffer = recorded;
        source.playbackRate.value = .94 + Math.random() * .12;
        const dx = voice.position.x - camera.position.x;
        const dz = voice.position.z - camera.position.z;
        const distance = Math.hypot(dx, dz);
        const gain = context.createGain();
        const strength = voice.kind === 'roar' ? .57 : .38;
        gain.gain.value = strength * preferences.volume / (1 + distance * .055);
        source.connect(gain);
        if (context.createStereoPanner) {
            const pan = context.createStereoPanner();
            const yaw = camera.rotation.y;
            pan.pan.value = .82 * (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, distance);
            gain.connect(pan).connect(context.destination);
        } else {
            gain.connect(context.destination);
        }
        source.onended = () => {
            if (zombieVoice === source) zombieVoice = undefined;
        };
        zombieVoice = source;
        source.start();
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

    function play(name, shotSound) {
        if (!preferences.sound || preferences.volume <= 0 || context?.state !== 'running') return;
        if (name === 'shot') {
            const recorded = samples.get(shotSound.sample)?.buffer;
            if (recorded) {
                const source = context.createBufferSource();
                const gain = context.createGain();
                const time = context.currentTime;
                const tail = Math.min(.32, recorded.duration);
                gain.gain.setValueAtTime(preferences.volume * .5, time);
                gain.gain.setValueAtTime(preferences.volume * .5, time + Math.min(.09, tail / 2));
                gain.gain.exponentialRampToValueAtTime(.001, time + tail);
                source.buffer = recorded;
                source.connect(gain).connect(context.destination);
                source.start(time, 0, tail);
                return;
            }
            const { pitch, tail, length, cutoff, crack } = shotSound;
            tone(pitch, tail, length, .22, 'triangle');
            const source = context.createBufferSource();
            source.buffer = noise;
            const filter = context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = cutoff;
            const gain = context.createGain();
            const time = context.currentTime;
            gain.gain.setValueAtTime(crack * preferences.volume, time);
            gain.gain.exponentialRampToValueAtTime(.001, time + Math.min(.1, length * .72));
            source.connect(filter).connect(gain).connect(context.destination);
            source.start();
            source.stop(time + Math.min(.13, length));
        } else if (name === 'reload') {
            tone(320, 160, .12, .065, 'triangle');
        } else if (name === 'chamber') {
            tone(470, 290, .095, .07, 'triangle');
            tone(890, 610, .067, .035, 'triangle', .035);
        } else if (name === 'hit') {
            tone(780, 500, .08, .1);
        } else if (name === 'bullseye') {
            tone(880, 1100, .12, .13);
            tone(1320, 1500, .12, .07, 'sine', .045);
        } else if (name === 'tick') {
            tone(470, 420, .12, .07);
        } else if (name === 'start') {
            tone(540, 820, .2, .11);
        } else if (name === 'damage') {
            tone(125, 49, .18, .16, 'triangle');
        } else if (name === 'complete') {
            tone(520, 660, .18, .09);
            tone(780, 1040, .23, .09, 'sine', .12);
        }
    }

    return { ready, play, playZombie, stopZombie };
}
