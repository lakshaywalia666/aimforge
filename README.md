# AimForge 3D Trainer

AimForge is a browser-based 3D aim trainer built with Three.js and served by Flask. Train across seven drills in three arenas, customize your aim setup, and track your progress in a personal journal.

[Play on GitHub Pages](https://lakshaywalia666.github.io/aimforge-premium/) · [Portfolio](https://lakshaywalia.com/projects.html)

## Run locally

```bash
python -m venv venv
# Windows PowerShell: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000>. Alternatively:

```bash
docker build -t aimforge .
docker run --rm -p 127.0.0.1:5000:5000 aimforge
```

## GitHub Pages

The `Publish AimForge to GitHub Pages` workflow builds and publishes the game when `main` is updated. The repository uses GitHub Actions as its Pages source.

To generate the same static site locally, install the Python dependencies and run `python build_pages.py`. The generated `dist/` directory contains the playable page and all game assets. Asset URLs are relative so the game works under a GitHub Pages repository path.

## Play

| Drill | Time | Objective |
| --- | --- | --- |
| Reflex | 30 seconds | Flick to a new target after each hit. |
| Precision | 45 seconds | Pick off three smaller targets that respawn across the range. |
| Tracking | 45 seconds | Stay on a moving target and land repeated hits. |
| Strafe | 30 seconds | Follow a target that reverses direction across the range. |
| Wide flick | 30 seconds | Alternate between targets on opposite sides of the range. |
| Quick peek | 30 seconds | Hit targets before they disappear. |
| Recoil | 30 seconds | Hold fire and pull your aim down to compensate for a repeatable recoil pattern. |

Use WASD to move. With a captured mouse, aim with the mouse and click to fire. In keyboard mode, aim with the arrow keys and press Space or select **Fire**. With touch controls, drag the range to aim and tap **Fire**. Press Esc on desktop or use the pause button in keyboard or touch mode.

A hit earns 100 points and a bullseye earns 150. The weapon has firing and slide animations, muzzle flashes, hit markers, and procedural sound effects. Hold the mouse button, Space, or the touch Fire button for automatic fire in Recoil.

Choose **Foundry**, **Laboratory**, or the outdoor **Outpost** above the arena preview. Select Relaxed, Standard, or Expert difficulty to change target size, movement speed, and peek exposure time.

**Settings** includes sensitivity, vertical field of view, target size and color, crosshair shape, size and color, sound and volume, weapon visibility, motion effects, graphics quality, and an optional performance counter. Auto quality adjusts rendering resolution to frame rate. A fullscreen button is available in browsers that support it. Target size changes apply to the next drill. Motion effects initially follow the device's reduced-motion preference.

The session report includes score, accuracy, hits, shots, best streak, average target response, average time between hits, and a map of the last 300 projected shots. Response measures the time from a target appearing to the first shot at it. Pauses are excluded from timing metrics. Shots aimed away from every target plane do not appear on the placement map.

Open the **Training journal** for your latest 30 sessions, milestone medals, and a score trend for the latest 10 matching runs. Personal records and comparisons use the same drill, difficulty, and target size. Existing records from the original three-drill game remain under Standard difficulty with 1.0× targets.

Completed drills award 100 XP, plus 10 XP per hit and 5 XP per bullseye. Every 1,000 XP earns a level. Performance medals require 5 hits at 50% accuracy for Bronze, 15 at 75% for Silver, or 25 at 90% for Gold.

The daily challenge rotates at midnight in the player's local time. Complete the selected drill with at least 15 hits and 70% accuracy on Standard difficulty and 1.0× targets to earn 250 bonus XP once that day. The challenge button selects those settings. A qualifying regular run also counts.

## Scope

AimForge stores completed sessions, personal records, milestones, and settings in the current browser. Each session is saved separately so simultaneous tabs can retain their own results. If browser storage is blocked or full, the current tab keeps the report in memory and shows a message on the results screen. The Flask development server serves the game locally.

The repository includes the required Three.js r160 browser modules and their MIT license under `static/lib/three`. No private configuration, databases or player data are needed.

## Project structure

```text
app.py                    Flask entry point
build_pages.py            Static export for GitHub Pages
templates/index.html      Lobby, controls, and session report
static/game.js            Drill rules, inputs, and local records
static/arena.js           3D range, targets, and hit detection
static/training.js        Drill catalog, saved sessions, and progression
static/reports.js         Session reports, shot maps, and journal
static/audio.js           Procedural shot and feedback sounds
static/game.css           Lobby and in-game HUD styling
static/lib/three/         Three.js modules and upstream license
requirements.txt          Python dependencies
Dockerfile                Local demo container
```

## Gameplay

![Reflex drill in the Foundry with the training weapon and live score](docs/gameplay.jpg)
