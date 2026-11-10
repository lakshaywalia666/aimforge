import {
    modes, difficulties, environments, matchingSessions, getRecord, profileFor,
    dailyChallenge, medalFor,
} from './training.js';
import { loadoutKey, weapons } from './weapons.js';

const byId = id => document.getElementById(id);
const milliseconds = value => Number.isFinite(value) ? `${Math.round(value).toLocaleString()} ms` : '—';
const accuracy = session => session.shots ? `${Math.round(session.hits * 100 / session.shots)}%` : '—';

export function renderProgress(sessions, selected, preferences) {
    const record = getRecord(sessions, selected, preferences.difficulty, preferences.targetSize, preferences.loadout);
    const weapon = weapons[loadoutKey(preferences.loadout)];
    const context = `${difficulties[preferences.difficulty].name} · ${preferences.targetSize.toFixed(1)}× · ${weapon.name}`;
    byId('record-mode').textContent = modes[selected].name;
    byId('best-score').textContent = record.completed ? record.score.toLocaleString() : '—';
    byId('best-accuracy').textContent = record.accuracy == null ? '—' : `${record.accuracy}%`;
    byId('completed').textContent = String(record.completed).padStart(2, '0');
    document.querySelector('.records').ariaLabel = `Records for ${modes[selected].name} · ${context}`;
    byId('record-context').textContent = context;
    const profile = profileFor(sessions);
    byId('player-level').textContent = `LEVEL ${String(profile.level).padStart(2, '0')}`;
    byId('player-xp').textContent = `${(profile.xp % 1000).toLocaleString()} / 1,000 XP to next level`;
    byId('xp-bar').style.width = `${profile.xp % 1000 / 10}%`;
    byId('medal-count').textContent = `${profile.medals.filter(medal => medal.earned).length} / ${profile.medals.length} medals`;
    const daily = dailyChallenge();
    const complete = profile.dailyDays.has(daily.day);
    byId('daily-title').textContent = `${modes[daily.mode].name} discipline`;
    byId('daily-description').textContent = `Land ${daily.hits} hits with ${daily.accuracy}% accuracy. Forge Trainer · Standard · 1.0× targets.`;
    byId('daily-status').textContent = complete ? '✓ Completed today' : `${daily.day} · Local time`;
    byId('daily-button').textContent = complete ? 'Play challenge again →' : 'Take challenge →';
}

function scoreTrend(sessions, selected, preferences) {
    const matching = matchingSessions(sessions, selected, preferences.difficulty, preferences.targetSize, preferences.loadout).slice(-10);
    const trend = byId('score-trend');
    trend.replaceChildren();
    byId('trend-section').hidden = matching.length < 2;
    if (matching.length < 2) return;
    const high = Math.max(1, ...matching.map(session => session.score));
    const points = matching.map((session, index) => [15 + index * 570 / (matching.length - 1), 85 - session.score * 70 / high]);
    const make = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
    const line = make('polyline');
    line.setAttribute('points', points.map(point => point.join(',')).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#ffad65');
    line.setAttribute('stroke-width', '2.5');
    trend.append(line);
    points.forEach(([x, y], index) => {
        const dot = make('circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', '4');
        dot.setAttribute('fill', '#ffe0b3');
        const title = make('title');
        title.textContent = `${matching[index].score.toLocaleString()} points`;
        dot.append(title);
        trend.append(dot);
    });
    const weapon = weapons[loadoutKey(preferences.loadout)];
    byId('trend-label').textContent = `Last ${matching.length} ${modes[selected].name} scores · ${difficulties[preferences.difficulty].name} · ${preferences.targetSize.toFixed(1)}× · ${weapon.name}`;
}

export function renderJournal(sessions, selected, preferences) {
    const profile = profileFor(sessions);
    byId('medal-collection').replaceChildren(...profile.medals.map((medal) => {
        const card = document.createElement('div');
        card.className = 'milestone';
        card.dataset.earned = medal.earned;
        const status = document.createElement('span');
        status.textContent = medal.earned ? '◇' : '○';
        status.ariaLabel = medal.earned ? 'Earned' : 'Locked';
        const name = document.createElement('strong');
        name.textContent = medal.name;
        const description = document.createElement('small');
        description.textContent = medal.description;
        card.append(status, name, description);
        return card;
    }));
    const recent = sessions.slice(-30).reverse();
    byId('history-count').textContent = `${sessions.length} completed · ${profile.hits.toLocaleString()} hits`;
    byId('history-empty').hidden = recent.length > 0;
    byId('history-table').hidden = recent.length === 0;
    byId('history-body').replaceChildren(...recent.map((session) => {
        const row = document.createElement('tr');
        const settings = document.createElement('td');
        settings.textContent = modes[session.mode].name;
        const context = document.createElement('small');
        const weapon = weapons[loadoutKey(session.loadout)];
        context.textContent = `${difficulties[session.difficulty].name} · ${session.targetSize.toFixed(1)}× · ${environments[session.environment]?.name ?? 'Foundry'} · ${weapon.name}`;
        settings.append(context);
        row.append(settings);
        const values = [
            session.score.toLocaleString(), accuracy(session), milliseconds(session.response),
            medalFor(session), new Date(session.finishedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ];
        for (const value of values) {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.append(cell);
        }
        return row;
    }));
    scoreTrend(sessions, selected, preferences);
}

export function renderShotMap(placements) {
    const canvas = byId('shot-map');
    const ctx = canvas.getContext('2d');
    const cx = 130;
    const cy = 100;
    const radius = 68;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#62616b';
    ctx.lineWidth = 1;
    for (const scale of [.26, .51, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.strokeStyle = '#383943';
    ctx.beginPath();
    ctx.moveTo(cx, 15);
    ctx.lineTo(cx, 185);
    ctx.moveTo(20, cy);
    ctx.lineTo(240, cy);
    ctx.stroke();
    for (const shot of placements) {
        const distance = Math.hypot(shot.x, shot.y);
        const limit = Math.min(1, 1.3 / Math.max(.001, distance));
        ctx.fillStyle = shot.hit ? '#ffb16a' : '#fb807b';
        ctx.beginPath();
        ctx.arc(cx + shot.x * limit * radius, cy - shot.y * limit * radius, shot.hit ? 3 : 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function renderReport(session, priorSessions, xpGained) {
    const record = getRecord(priorSessions, session.mode, session.difficulty, session.targetSize, session.loadout);
    const previous = matchingSessions(priorSessions, session.mode, session.difficulty, session.targetSize, session.loadout).at(-1);
    const weapon = weapons[loadoutKey(session.loadout)];
    byId('result-kicker').textContent = session.score > record.score ? 'NEW PERSONAL BEST' : 'DRILL COMPLETE';
    byId('result-mode').textContent = `${modes[session.mode].name} · ${difficulties[session.difficulty].name} · ${session.targetSize.toFixed(1)}× · ${environments[session.environment].name} · ${weapon.name}`;
    byId('result-score').textContent = session.score.toLocaleString();
    byId('result-accuracy').textContent = accuracy(session);
    byId('result-hits').textContent = `${session.hits} / ${session.shots}`;
    byId('result-streak').textContent = session.bestStreak;
    byId('result-response').textContent = milliseconds(session.response);
    byId('result-interval').textContent = milliseconds(session.interval);
    const aimedHits = session.aimedHits ?? 0;
    const reloads = session.reloads ?? 0;
    byId('result-weapon-stats').textContent = `${aimedHits} aimed ${aimedHits === 1 ? 'hit' : 'hits'} · ${reloads} ${reloads === 1 ? 'reload' : 'reloads'}`;
    const medal = medalFor(session);
    byId('result-medal').textContent = medal === 'Practice' ? 'Practice complete' : `${medal} performance`;
    byId('result-medal').dataset.medal = medal;
    byId('result-xp').textContent = `+${xpGained.toLocaleString()} XP`;
    const delta = session.score - (previous?.score ?? 0);
    byId('result-comparison').textContent = previous
        ? `${delta > 0 ? '+' : ''}${delta.toLocaleString()} points versus your previous matching run.`
        : 'Your first session with these settings. Your next run will have a comparison.';
    byId('shot-summary').textContent = `${session.bullseyes} bullseyes · ${session.escaped} targets expired. Showing the last ${session.placements.length} projected shots.`;
    renderShotMap(session.placements);
}
