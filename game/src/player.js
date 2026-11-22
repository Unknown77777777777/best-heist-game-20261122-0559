// player.js — Wren, the thief. Walks, sneaks, throws coins to distract
// guards, and channels a lockpick (hold E, standing still) to open a loot case.

import { clamp, dist, pointInRect, resolveCircleRects } from './geometry.js';
import { GAME_W, GAME_H } from './input.js';

export const PLAYER_RADIUS = 12;
export const WALK_SPEED = 175;
export const SNEAK_SPEED = 85;
export const LOCKPICK_TIME = 1.6;
export const LOCKPICK_RANGE = 90;
export const COIN_RANGE = 280;
export const COINS_PER_ROOM = 3;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.angle = -Math.PI / 2;
    this.sneaking = false;
    this.inShadow = false;
    this.moving = false;
    this.coins = COINS_PER_ROOM;
    this.lockpicking = false;
    this.lockpickProgress = 0;
    this.caughtBy = null;
    this.coin = null; // a coin currently flying
    this.coinFrom = null;
    this.stepAccum = 0;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.angle = -Math.PI / 2;
    this.coins = COINS_PER_ROOM;
    this.lockpicking = false;
    this.lockpickProgress = 0;
    this.caughtBy = null;
    this.coin = null;
    this.sneaking = false;
  }

  inShadowNow(shadows) {
    for (const s of shadows) {
      if (pointInRect(this.x, this.y, s)) return true;
    }
    return false;
  }

  throwCoin(targetX, targetY, sound) {
    if (this.coins <= 0 || this.coin) return null;
    const d = dist(this.x, this.y, targetX, targetY);
    const max = COIN_RANGE;
    const ratio = d > max ? max / d : 1;
    const tx = this.x + (targetX - this.x) * ratio;
    const ty = this.y + (targetY - this.y) * ratio;
    this.coins -= 1;
    this.coin = { x: this.x, y: this.y, tx, ty, t: 0, duration: 0.35, landed: false, ring: 0 };
    this.coinFrom = { x: this.x, y: this.y };
    sound.coinThrow();
    return this.coin;
  }

  update(dt, input, solidRects, shadows, loot, lootTaken, sound, onLockpickDone) {
    this.inShadow = this.inShadowNow(shadows);
    this.sneaking = input.sneaking();

    // Movement: keyboard wins over click-to-move.
    const kv = input.moveVector();
    let vx = 0, vy = 0;
    if (kv) {
      vx = kv.x;
      vy = kv.y;
      input.moveTarget = null;
    } else if (input.moveTarget) {
      const dx = input.moveTarget.x - this.x;
      const dy = input.moveTarget.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        input.moveTarget = null;
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }

    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const wasMoving = this.moving;
    this.moving = vx !== 0 || vy !== 0;
    if (this.moving) {
      this.angle = Math.atan2(vy, vx);
      // Move one axis at a time so the thief slides along walls instead of
      // sticking to them.
      this.x += vx * speed * dt;
      let resolved = resolveCircleRects(this.x, this.y, PLAYER_RADIUS, solidRects);
      this.x = resolved[0];
      this.y = resolved[1];
      this.y += vy * speed * dt;
      resolved = resolveCircleRects(this.x, this.y, PLAYER_RADIUS, solidRects);
      this.x = resolved[0];
      this.y = resolved[1];
      this.x = clamp(this.x, PLAYER_RADIUS, GAME_W - PLAYER_RADIUS);
      this.y = clamp(this.y, PLAYER_RADIUS, GAME_H - PLAYER_RADIUS);
      // Footstep sounds, slower while sneaking.
      this.stepAccum += dt * (this.sneaking ? 1.6 : 3.2);
      if (this.stepAccum >= 1) {
        this.stepAccum = 0;
        sound.footstep(this.sneaking);
      }
    } else if (wasMoving) {
      this.stepAccum = 0;
    }

    // Flying coin.
    if (this.coin && !this.coin.landed) {
      this.coin.t += dt / this.coin.duration;
      if (this.coin.t >= 1) {
        this.coin.t = 1;
        this.coin.landed = true;
        this.coin.ring = 0;
        this.coin.x = this.coin.tx;
        this.coin.y = this.coin.ty;
        sound.coinClink();
      } else {
        const e = this.coin.t;
        this.coin.x = this.coinFrom.x + (this.coin.tx - this.coinFrom.x) * e;
        this.coin.y = this.coinFrom.y + (this.coin.ty - this.coinFrom.y) * e;
      }
    } else if (this.coin && this.coin.landed) {
      this.coin.ring += dt;
      if (this.coin.ring > 1.2) this.coin = null;
    }

    // Lockpick: hold E (or click the case) near the loot, standing still.
    const nearLoot = !lootTaken && dist(this.x, this.y, loot.x, loot.y) < LOCKPICK_RANGE;
    const wantsPick = input.down('KeyE') || (input.clicked && nearLoot &&
      dist(input.mouseX, input.mouseY, loot.x, loot.y) < 60);
    if (nearLoot && wantsPick && !this.moving) {
      this.lockpicking = true;
      const before = this.lockpickProgress;
      this.lockpickProgress += dt / LOCKPICK_TIME;
      if (Math.floor(this.lockpickProgress * 8) !== Math.floor(before * 8)) {
        sound.lockpickClick();
      }
      if (this.lockpickProgress >= 1) {
        this.lockpickProgress = 0;
        this.lockpicking = false;
        sound.lockpickDone();
        onLockpickDone();
      }
    } else {
      // Moving, walking away or letting go of E cancels the channel.
      this.lockpicking = false;
      this.lockpickProgress = 0;
    }
  }
}
