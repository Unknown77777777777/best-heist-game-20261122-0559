// levels.js — the three rooms of The Quiet Vault.
// Each room: walls (block sight and movement), cover (blocks sight, low crates
// and pedestals you can hide behind), shadow zones (detection fills half as
// fast), guards with patrol waypoints, wall cameras, one locked loot case and
// an exit door that opens once the loot is taken.
// Coordinates are in the 1280x720 logical space. Outer walls frame every room.

function borderWalls() {
  return [
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 696, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 720 },
    { x: 1256, y: 0, w: 24, h: 720 },
  ];
}

export const LEVELS = [
  {
    name: 'Room 1 — The Gallery',
    objective: 'Steal the Starlight Sapphire, then slip out the north door.',
    lootName: 'Starlight Sapphire',
    start: { x: 90, y: 620 },
    loot: { x: 640, y: 345 },
    exit: { x: 1150, y: 24, w: 82, h: 34, label: 'NORTH DOOR' },
    walls: [
      ...borderWalls(),
      { x: 560, y: 280, w: 160, h: 120 }, // central display block
      { x: 300, y: 120, w: 24, h: 200 },  // west stub
      { x: 940, y: 380, w: 24, h: 200 },  // east stub
      { x: 560, y: 90, w: 200, h: 24 },   // north stub
    ],
    cover: [
      { x: 180, y: 500, w: 64, h: 64, kind: 'crate' },
      { x: 1050, y: 140, w: 64, h: 64, kind: 'crate' },
      { x: 420, y: 180, w: 40, h: 40, kind: 'pedestal' },
      { x: 820, y: 500, w: 40, h: 40, kind: 'pedestal' },
      { x: 640, y: 140, w: 80, h: 48, kind: 'case' },
    ],
    shadows: [
      { x: 120, y: 420, w: 260, h: 180 },
      { x: 900, y: 380, w: 240, h: 200 },
    ],
    guards: [
      { name: 'Guard Mara', waypoints: [{ x: 320, y: 180 }, { x: 960, y: 180 }], speed: 70 },
      { name: 'Guard Ivo', waypoints: [{ x: 980, y: 520 }, { x: 980, y: 220 }], speed: 70 },
    ],
    cameras: [
      { x: 640, y: 26, baseAngle: Math.PI / 2, sweep: 0.65, speed: 0.45 },
    ],
    route: [
      { x: 90, y: 620 }, { x: 260, y: 620 }, { x: 260, y: 470 },
      { x: 480, y: 470 }, { x: 640, y: 470 }, { x: 640, y: 420 },
    ],
    exitRoute: [
      { x: 900, y: 470 }, { x: 900, y: 340 }, { x: 1100, y: 340 },
      { x: 1180, y: 340 }, { x: 1180, y: 120 },
    ],
  },
  {
    name: 'Room 2 — The Vault Corridor',
    objective: 'Lift the Crown of Embers from the south vault, then leave by the north door.',
    lootName: 'Crown of Embers',
    start: { x: 90, y: 90 },
    loot: { x: 640, y: 620 },
    exit: { x: 1150, y: 24, w: 82, h: 34, label: 'NORTH DOOR' },
    walls: [
      ...borderWalls(),
      { x: 300, y: 120, w: 24, h: 420 }, // west spine
      { x: 700, y: 180, w: 24, h: 420 }, // east spine
      { x: 940, y: 120, w: 24, h: 300 }, // east stub
      { x: 420, y: 420, w: 280, h: 24 }, // south bar
      { x: 420, y: 180, w: 180, h: 24 }, // north bar
    ],
    cover: [
      { x: 150, y: 150, w: 64, h: 64, kind: 'crate' },
      { x: 1100, y: 560, w: 64, h: 64, kind: 'crate' },
      { x: 560, y: 560, w: 40, h: 40, kind: 'pedestal' },
      { x: 850, y: 120, w: 40, h: 40, kind: 'pedestal' },
      { x: 480, y: 300, w: 80, h: 48, kind: 'case' },
    ],
    shadows: [
      { x: 60, y: 60, w: 200, h: 160 },
      { x: 1000, y: 480, w: 200, h: 160 },
    ],
    guards: [
      { name: 'Guard Mara', waypoints: [{ x: 420, y: 300 }, { x: 680, y: 300 }], speed: 75 },
      { name: 'Guard Ivo', waypoints: [{ x: 820, y: 520 }, { x: 820, y: 180 }], speed: 75 },
      { name: 'Guard Petya', waypoints: [{ x: 200, y: 560 }, { x: 660, y: 560 }], speed: 70 },
    ],
    cameras: [
      { x: 400, y: 26, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.5 },
      { x: 1254, y: 360, baseAngle: Math.PI, sweep: 0.55, speed: 0.4 },
    ],
    route: [
      { x: 90, y: 90 }, { x: 90, y: 620 }, { x: 260, y: 620 },
      { x: 400, y: 620 }, { x: 640, y: 620 },
    ],
    exitRoute: [
      { x: 400, y: 620 }, { x: 90, y: 620 }, { x: 90, y: 90 },
      { x: 300, y: 90 }, { x: 1100, y: 90 },
    ],
  },
  {
    name: 'Room 3 — The Vault',
    objective: 'Crack the Heart of Midnight and vanish through the south door.',
    lootName: 'Heart of Midnight',
    start: { x: 90, y: 620 },
    loot: { x: 640, y: 472 },
    exit: { x: 1150, y: 662, w: 82, h: 34, label: 'SOUTH DOOR' },
    walls: [
      ...borderWalls(),
      { x: 520, y: 260, w: 240, h: 200 }, // the vault block
      { x: 300, y: 100, w: 24, h: 240 },  // west stub
      { x: 956, y: 380, w: 24, h: 240 },  // east stub
    ],
    cover: [
      { x: 180, y: 560, w: 64, h: 64, kind: 'crate' },
      { x: 1060, y: 120, w: 64, h: 64, kind: 'crate' },
      { x: 420, y: 480, w: 40, h: 40, kind: 'pedestal' },
      { x: 860, y: 200, w: 40, h: 40, kind: 'pedestal' },
      { x: 640, y: 560, w: 80, h: 48, kind: 'case' },
    ],
    shadows: [
      { x: 80, y: 300, w: 220, h: 220 },
      { x: 980, y: 120, w: 220, h: 200 },
    ],
    guards: [
      { name: 'Guard Mara', waypoints: [{ x: 360, y: 140 }, { x: 980, y: 140 }], speed: 80 },
      { name: 'Guard Ivo', waypoints: [{ x: 200, y: 360 }, { x: 480, y: 360 }], speed: 75 },
      { name: 'Guard Petya', waypoints: [{ x: 1080, y: 360 }, { x: 1080, y: 600 }], speed: 75 },
    ],
    cameras: [
      { x: 640, y: 26, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.55 },
      { x: 26, y: 360, baseAngle: 0, sweep: 0.55, speed: 0.45 },
    ],
    route: [
      { x: 90, y: 620 }, { x: 90, y: 420 }, { x: 260, y: 420 },
      { x: 420, y: 480 }, { x: 640, y: 500 },
    ],
    exitRoute: [
      { x: 640, y: 620 }, { x: 900, y: 660 }, { x: 1100, y: 660 },
    ],
  },
];
