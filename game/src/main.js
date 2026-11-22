// main.js — The Quiet Vault: game loop, screens, alarm, room flow.
// Owns the Game object: menu → playing → caught / room clear → win.
// Staging hooks (?shot=…) and window.__heist exist so the maker can take
// screenshots and drive playtests with real keyboard input.

import { Input, GAME_W, GAME_H } from './input.js';
import { LEVELS } from './levels.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Player, LOCKPICK_RANGE } from './player.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';
import { dist, pointInRect } from './geometry.js';

const ALARM_GUARD_RATE = 14; // per second while a guard chases
const ALARM_CAMERA_RATE = 20; // per second while a camera sees the thief
const ALARM_DRAIN_RATE = 5;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.sound = new SoundEngine();
    this.screen = 'menu'; // menu | playing | caught | clear | win
    this.roomIndex = 0;
    this.level = LEVELS[0];
    this.player = new Player(this.level.start);
    this.guards = [];
    this.cameras = [];
    this.alarm = 0;
    this.peakAlarm = 0;
    this.lootTaken = false;
    this.lootCount = 0;
    this.caughtReason = '';
    this.roomTime = 0;
    this.totalTime = 0;
    this.time = 0;
    this.lastNow = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.loadRoom(0);
  }

  solidRects() {
    // Walls plus tall cover block movement and sight; glass cases do not.
    const solids = [...this.level.walls];
    for (const c of this.level.cover) {
      if (c.kind !== 'case') solids.push(c);
    }
    return solids;
  }

  sightBlockers() {
    return this.solidRects();
  }

  loadRoom(index) {
    this.roomIndex = index;
    this.level = LEVELS[index];
    this.input.moveTarget = null; // a click from the last room must not carry over
    this.player.reset(this.level.start);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.alarm = 0;
    this.peakAlarm = 0;
    this.lootTaken = false;
    this.roomTime = 0;
  }

  startGame() {
    this.sound.ensure();
    this.lootCount = 0;
    this.totalTime = 0;
    this.loadRoom(0);
    this.screen = 'playing';
  }

  retryRoom() {
    this.sound.ensure();
    this.loadRoom(this.roomIndex);
    this.screen = 'playing';
  }

  nextRoom() {
    this.sound.ensure();
    if (this.roomIndex + 1 >= LEVELS.length) {
      this.screen = 'win';
      return;
    }
    this.loadRoom(this.roomIndex + 1);
    this.screen = 'playing';
  }

  onLootTaken() {
    this.lootTaken = true;
    this.lootCount += 1;
    this.sound.lootTaken();
  }

  onCaught(reason) {
    if (this.screen !== 'playing') return;
    this.caughtReason = reason;
    this.screen = 'caught';
    this.sound.caughtSting();
  }

  update(dt) {
    this.time += dt;
    if (this.screen !== 'playing') return;
    this.roomTime += dt;
    this.totalTime += dt;

    const solids = this.solidRects();
    const blockers = this.sightBlockers();

    // Coin throw: Q tosses toward the mouse.
    if (this.input.wasPressed('KeyQ')) {
      const coin = this.player.throwCoin(this.input.mouseX, this.input.mouseY, this.sound);
      if (coin) {
        // The guards react when it lands; track it below.
        this.pendingCoin = coin;
      }
    }
    if (this.input.wasPressed('KeyM')) {
      this.sound.setMuted(!this.sound.muted);
    }

    this.player.update(dt, this.input, solids, this.level.shadows,
      this.level.loot, this.lootTaken, this.sound, () => this.onLootTaken());

    // A landed coin distracts every guard in earshot.
    if (this.player.coin && this.player.coin.landed && !this.player.coin.announced) {
      this.player.coin.announced = true;
      for (const g of this.guards) g.hearCoin(this.player.coin.x, this.player.coin.y);
    }

    let anyGuardChasing = false;
    let anyCameraSpotted = false;
    for (const g of this.guards) {
      g.update(dt, this.player, blockers, this.sound);
      if (g.state === 'alert') anyGuardChasing = true;
    }
    for (const c of this.cameras) {
      c.update(dt, this.player, blockers);
      if (c.spotted) anyCameraSpotted = true;
    }

    // Alarm: rises on exposure, drains in the dark.
    let alarmDelta = 0;
    if (anyGuardChasing) alarmDelta += ALARM_GUARD_RATE;
    if (anyCameraSpotted) alarmDelta += ALARM_CAMERA_RATE;
    if (alarmDelta === 0) alarmDelta -= ALARM_DRAIN_RATE;
    this.alarm = Math.max(0, Math.min(100, this.alarm + alarmDelta * dt));
    this.peakAlarm = Math.max(this.peakAlarm, this.alarm);
    this.sound.updateAlarm(this.alarm);

    if (this.player.caughtBy) {
      this.onCaught(`Caught by ${this.player.caughtBy} — the guard grabbed Wren in the open.`);
      return;
    }
    if (anyCameraSpotted && this.alarm >= 100) {
      this.onCaught('Lockdown — the cameras held Wren in frame until the vault sealed shut.');
      return;
    }
    if (this.alarm >= 100) {
      this.onCaught('Lockdown — the alarm hit 100% and the vault sealed shut.');
      return;
    }

    // Exit: only open once the loot is taken.
    if (this.lootTaken && pointInRect(this.player.x, this.player.y, this.level.exit)) {
      this.sound.roomClear();
      if (this.roomIndex + 1 >= LEVELS.length) {
        this.screen = 'win';
      } else {
        this.screen = 'clear';
      }
    }
  }

  handleScreenKeys() {
    const input = this.input;
    if (this.screen === 'menu' && (input.wasPressed('Enter') || input.wasPressed('NumpadEnter'))) {
      this.startGame();
    } else if (this.screen === 'caught' && input.wasPressed('KeyR')) {
      this.retryRoom();
    } else if (this.screen === 'clear' && (input.wasPressed('Enter') || input.wasPressed('NumpadEnter'))) {
      this.nextRoom();
    } else if (this.screen === 'win' && input.wasPressed('KeyR')) {
      this.startGame();
    }
    // Clicking anywhere also starts from the menu.
    if (this.screen === 'menu' && input.clicked) this.startGame();
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastNow) / 1000 || 0.016);
    this.lastNow = now;
    this.frameCount += 1;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    this.handleScreenKeys();
    this.update(dt);
    this.renderer.draw(this, this.time);
    this.input.endFrame();
  }

  // ---- staging for screenshots and playtests (not part of normal play) ----
  stageShot(name) {
    if (name === 'cover' || name === 'gallery') {
      this.startGame();
      // Mid-room vantage: thief below the central display, both guards and
      // the camera in frame, loot glowing, alarm part-way up.
      this.player.x = 470;
      this.player.y = 480;
      this.player.angle = Math.PI / 4;
      this.alarm = name === 'cover' ? 38 : 12;
      this.peakAlarm = this.alarm;
    } else if (name === 'vault') {
      this.startGame();
      this.loadRoom(2);
      this.screen = 'playing';
      this.player.x = 420;
      this.player.y = 480;
      this.player.angle = 0;
      this.alarm = 55;
      this.peakAlarm = 55;
    } else if (name === 'escape') {
      this.startGame();
      this.loadRoom(2);
      this.screen = 'playing';
      this.lootTaken = true;
      this.lootCount = 3;
      this.player.x = 1080;
      this.player.y = 600;
      this.player.angle = Math.PI / 2;
      this.alarm = 72;
      this.peakAlarm = 72;
    }
  }

  stateSnapshot() {
    return {
      screen: this.screen,
      roomIndex: this.roomIndex,
      roomName: this.level.name,
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y), coins: this.player.coins, lockpicking: this.player.lockpicking },
      alarm: Math.round(this.alarm),
      lootTaken: this.lootTaken,
      lootCount: this.lootCount,
      loot: { ...this.level.loot },
      exit: { ...this.level.exit },
      route: this.level.route.map((p) => ({ ...p })),
      exitRoute: this.level.exitRoute.map((p) => ({ ...p })),
      guards: this.guards.map((g) => ({ name: g.name, x: Math.round(g.x), y: Math.round(g.y), state: g.state, detection: +g.detection.toFixed(2) })),
      cameras: this.cameras.map((c) => ({ x: c.x, y: c.y, spotted: c.spotted })),
      caughtReason: this.caughtReason,
      fps: Math.round(this.fps),
    };
  }
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = GAME_W;
  canvas.height = GAME_H;
  const game = new Game(canvas);

  // Screenshot staging: ?shot=cover|gallery|vault|escape
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    game.stageShot(shot);
    // Let a few frames run so cones, glow and the HUD settle, then signal ready.
    requestAnimationFrame(() => {
      game.frame(performance.now());
      window.__shotReady = true;
    });
  }

  // Test and playtest hook: read-only state plus safe staging helpers.
  window.__heist = {
    version: 1,
    state: () => game.stateSnapshot(),
    start: () => game.startGame(),
    loadRoom: (i) => { game.loadRoom(i); game.screen = 'playing'; },
    teleport: (x, y) => { game.player.x = x; game.player.y = y; },
    setAlarm: (v) => { game.alarm = v; },
    stage: (name) => game.stageShot(name),
  };

  function loop(now) {
    game.frame(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((now) => {
    game.lastNow = now;
    loop(now);
  });
}

boot();
