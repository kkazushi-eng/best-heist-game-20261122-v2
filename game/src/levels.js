// levels.js — the three rooms of The Midnight Vault.
//
// Each room is a tile map plus the patrols, cameras and laser beams that
// live in it. Tiles are 40px. Legend:
//   '#' wall   '.' floor   'o' crate (blocks movement and sight)
//   'P' player start   'G' guard spawn   'g' gem loot
//   'V' the room's main loot   'E' exit door   'C' camera mount
// Patrols, cameras and lasers are described in tile coordinates below
// each map so the map stays readable on its own.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;

export const LEVELS = [
  {
    name: 'Room 1 — The Lobby',
    subtitle: 'Two guards on patrol. Grab the Moonlight Diamond, then slip out.',
    mainLootName: 'Moonlight Diamond',
    mainLootValue: 500,
    gemValue: 100,
    tools: { coins: 5, smoke: 2, emp: 1 },
    map: [
      '########################',
      '#P.....#......#....g...#',
      '#......#..g...#........#',
      '#..o...#......#...o....#',
      '#......#......#........#',
      '#......####.###...##...#',
      '#......................#',
      '#..g......o......o..g..#',
      '#......................#',
      '#....####...####.......#',
      '#....#........#........#',
      '#.G..#...V....#....E...#',
      '#....#........#........#',
      '#....####...####.......#',
      '#......................#',
      '########################',
    ],
    guards: [
      { spawn: [6, 2], waypoints: [[6, 2], [17, 2], [17, 6], [6, 6]], speed: 62 },
      { spawn: [17, 11], waypoints: [[17, 11], [6, 11], [6, 14], [17, 14]], speed: 58 },
    ],
    cameras: [],
    lasers: [],
  },
  {
    name: 'Room 2 — The Gallery',
    subtitle: 'Cameras sweep the hall. The Emerald Idol waits behind the glass.',
    mainLootName: 'Emerald Idol',
    mainLootValue: 750,
    gemValue: 100,
    tools: { coins: 5, smoke: 3, emp: 2 },
    map: [
      '########################',
      '#P....#.......#....g...#',
      '#.....#...g...#........#',
      '#..o..#.......#...o....#',
      '#.....##.######........#',
      '#......................#',
      '#..g......o.....o....g.#',
      '#......................#',
      '###.#####....#####.#####',
      '#......................#',
      '#.g...o..........o...g.#',
      '#......................#',
      '#....####..V..####.....#',
      '#....#..........#...E..#',
      '#.G..#..........#......#',
      '########################',
    ],
    guards: [
      { spawn: [3, 6], waypoints: [[3, 6], [20, 6], [20, 9], [3, 9]], speed: 68 },
      { spawn: [20, 12], waypoints: [[20, 12], [9, 12], [9, 14], [20, 14]], speed: 64 },
    ],
    cameras: [
      { col: 12, row: 0, base: Math.PI / 2, sweep: 1.1, range: 260 },
      { col: 12, row: 15, base: -Math.PI / 2, sweep: 0.9, range: 240 },
    ],
    lasers: [],
  },
  {
    name: 'Room 3 — The Vault',
    subtitle: 'Lasers guard the Crown of Midnight. One wrong step and the alarm screams.',
    mainLootName: 'Crown of Midnight',
    mainLootValue: 1000,
    gemValue: 150,
    tools: { coins: 6, smoke: 3, emp: 2 },
    map: [
      '########################',
      '#P.....#......#....g...#',
      '#......#..g...#........#',
      '#..o...#......#...o....#',
      '#......#......#........#',
      '#...g..####.###..g.....#',
      '#......................#',
      '#..o.....o....o......g.#',
      '#......................#',
      '#####.######.######.####',
      '#......................#',
      '#.g...o....V.....o...g.#',
      '#......................#',
      '#....####......####....#',
      '#.G..#............#.E..#',
      '########################',
    ],
    guards: [
      { spawn: [4, 6], waypoints: [[4, 6], [19, 6], [19, 8], [4, 8]], speed: 74 },
      { spawn: [19, 12], waypoints: [[19, 12], [4, 12], [4, 13], [19, 13]], speed: 70 },
      { spawn: [12, 2], waypoints: [[12, 2], [12, 7], [20, 7], [20, 2]], speed: 66 },
    ],
    cameras: [
      { col: 6, row: 0, base: Math.PI / 2, sweep: 1.0, range: 250 },
      { col: 18, row: 15, base: -Math.PI / 2, sweep: 1.0, range: 250 },
    ],
    // Laser beams in tile coordinates: one across the middle corridor, one
    // guarding the approach to the exit. EMP shuts them off.
    lasers: [
      { from: [9, 6], to: [15, 6] },
      { from: [19, 10], to: [19, 13] },
    ],
  },
];
