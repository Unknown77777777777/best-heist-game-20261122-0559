# The Quiet Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Unknown77777777777/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Unknown77777777777/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A night-museum heist game for the make.fun best-heist-game bounty. You are
**Wren**, a thief crossing three rooms — the Gallery, the Vault Corridor and
the Vault itself — to steal one jewel per room and slip out unseen.

## How to play

Serve `game/` with any static server and open `game/index.html` in a desktop
browser. No build step, no network, no libraries — plain canvas 2D and
synthesised WebAudio.

- **WASD / arrows** — move (or click to walk there)
- **Shift** — sneak: slower, quieter, harder to spot
- **Q** — throw a coin to distract a nearby guard
- **E** — pick the loot case's lock (hold, standing still)
- **M** — mute

Guards patrol with vision cones and line of sight; being seen fills their
detection meter, and a full meter means a chase. Wall cameras sweep their
cones and raise the alarm. Hide behind crates, pedestals and display cases,
or in the shadows, where you are spotted half as fast. At 100% alarm the
vault seals shut. Grab the loot, then reach the exit door.

## Structure

- `game/src/main.js` — game loop, screens, alarm, room flow
- `game/src/levels.js` — the three rooms (walls, cover, guards, cameras, loot, exit)
- `game/src/guards.js` — patrol / suspicious / alert / investigate AI
- `game/src/cameras.js` — sweeping camera cones
- `game/src/player.js` — Wren: movement, sneak, coins, lockpicking
- `game/src/render.js` — all drawing: museum, cones, HUD, screens
- `game/src/geometry.js` — line of sight and collision helpers
- `game/src/input.js` — keyboard, mouse, click-to-move
- `game/src/audio.js` — synthesised sound (no audio files)

`main.ts` hands the entry in: it copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the vendored
`vendor/makefun-game.ts` library.

## License

MIT — see `LICENSE`.
