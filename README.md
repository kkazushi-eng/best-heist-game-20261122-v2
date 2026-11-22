# The Midnight Vault

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/kkazushi-eng/best-heist-game-20261122-v2/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/kkazushi-eng/best-heist-game-20261122-v2/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A top-down stealth heist game, built for the [make.fun "Make the best heist game" bounty](https://make.fun/c/best-heist-game-20261122-0559). You are a thief in a night museum with three rooms to clear — the Lobby, the Gallery, and the Vault — and one getaway to make.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080). No build step, no network requests, no libraries — plain HTML, CSS and canvas JavaScript.

- **Move** with WASD or the arrow keys. **Shift** sneaks: slower, but much harder to spot.
- **Steal the ★ main loot** in each room to unlock the exit door, then slip out.
- **Gems ◆** are worth points; the main loot is worth far more. A fast, quiet room pays a getaway bonus.
- **Guards** patrol set routes with sweeping vision cones. Stand in a cone and their suspicion climbs — full suspicion means a chase, and a chase that catches you means arrest.
- **Cameras** sweep their arcs and feed the alarm meter directly. **Lasers** trip the alarm in one jump when you cross them.
- **The alarm** (0–100) drains slowly while nobody sees you. At 100, the museum locks down and the heist is over.
- **Tools, each with limited stock per room:**
  - **1 / click — Coin:** throw a coin; nearby guards walk over to investigate the clink.
  - **2 — Smoke bomb:** a cloud at your feet that blocks every vision cone for a few seconds.
  - **3 — EMP:** shuts down every camera and laser in the room for 10 seconds.
- **Enter** starts (and restarts) the heist. **R** retries the room after being caught. **M** mutes the sound.

## The three rooms

1. **The Lobby** — two patrolling guards, no cameras. Learn the cones.
2. **The Gallery** — cameras sweep the hall; the Emerald Idol waits behind glass.
3. **The Vault** — lasers guard the Crown of Midnight, with three guards and two cameras on top.

## Files

- `game/index.html` — page shell and styling.
- `game/src/main.js` — boot, input, game loop, staged `?shot=` states for screenshots.
- `game/src/game.js` — state machine, rooms, alarm, loot, scoring.
- `game/src/levels.js` — the three room maps, patrols, cameras and lasers.
- `game/src/guards.js` — guard patrol, suspicion, chase and investigation AI.
- `game/src/cameras.js` — sweeping cameras and laser beams.
- `game/src/player.js` — movement, sneaking and the three tools.
- `game/src/render.js` — all canvas drawing: room, cones, HUD and screens.
- `game/src/engine.js` — tile collision, line of sight and vision-cone geometry.
- `game/src/audio.js` — synthesized WebAudio effects (no audio files).
- `main.ts` — the make.fun hand-in program; copies `game/` and `screenshots/` and writes `dossier.json`.
- `serve.ts` — a tiny local static server for play-testing.

## License

MIT — see [LICENSE](LICENSE).
