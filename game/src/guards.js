// guards.js — patrol guards with vision cones, suspicion and chase.
// A guard patrols waypoints, fills a detection meter while the thief is in
// its cone and line of sight, gets suspicious, then chases. A thrown coin
// sends it to investigate the noise instead.

import { angleDiff, dist, hasLineOfSight } from './geometry.js';

export const GUARD_VISION_RANGE = 230;
export const GUARD_VISION_HALF_ANGLE = 0.62; // ~35 degrees each side
const PATROL_SPEED = 70;
const INVESTIGATE_SPEED = 115;
const CHASE_SPEED = 152;
const TOUCH_DISTANCE = 26;

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints;
    this.patrolSpeed = def.speed || PATROL_SPEED;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.wpIndex = 1 % def.waypoints.length;
    this.angle = 0;
    this.state = 'patrol'; // patrol | suspicious | alert | investigate
    this.detection = 0; // 0..1, fills while the thief is seen
    this.suspicionTimer = 0;
    this.investigateTarget = null;
    this.investigateTimer = 0;
    this.loseSightTimer = 0;
    this.chaseTimer = 0;
    this.lastSeen = null;
    this.pauseTimer = 0;
  }

  canSee(px, py, blockers) {
    const d = dist(this.x, this.y, px, py);
    if (d > GUARD_VISION_RANGE) return false;
    const toPlayer = Math.atan2(py - this.y, px - this.x);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > GUARD_VISION_HALF_ANGLE) return false;
    return hasLineOfSight(this.x, this.y, px, py, blockers);
  }

  // How fast detection fills right now (0 when the thief is not visible).
  detectionRate(px, py, sneaking, inShadow) {
    const d = dist(this.x, this.y, px, py);
    let rate = 1.15 * (1 - 0.55 * (d / GUARD_VISION_RANGE));
    if (sneaking) rate *= 0.45;
    if (inShadow) rate *= 0.5;
    return rate;
  }

  hearCoin(cx, cy) {
    if (this.state === 'alert') return;
    if (dist(this.x, this.y, cx, cy) > 340) return;
    this.state = 'investigate';
    this.investigateTarget = { x: cx, y: cy };
    this.investigateTimer = 6;
    this.detection = Math.max(0, this.detection - 0.3);
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.angle = Math.atan2(dy, dx);
    return d - step < 4;
  }

  update(dt, player, blockers, sound) {
    const sees = this.canSee(player.x, player.y, blockers);
    if (sees) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      const rate = this.detectionRate(player.x, player.y, player.sneaking, player.inShadow);
      const before = this.detection;
      this.detection = Math.min(1, this.detection + rate * dt);
      if (before < 0.35 && this.detection >= 0.35 && this.state === 'patrol') {
        this.state = 'suspicious';
        this.suspicionTimer = 1.4;
        sound.suspiciousBlip();
      }
      if (this.detection >= 1 && this.state !== 'alert') {
        this.state = 'alert';
        this.chaseTimer = 6;
        sound.alertBlip();
      }
    } else {
      this.detection = Math.max(0, this.detection - 0.6 * dt);
      if (this.state === 'suspicious' && this.detection < 0.35) {
        this.state = 'patrol';
      }
    }

    switch (this.state) {
      case 'patrol': {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          break;
        }
        const wp = this.waypoints[this.wpIndex];
        if (this.moveToward(wp.x, wp.y, this.patrolSpeed, dt)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseTimer = 0.8;
        }
        break;
      }
      case 'suspicious': {
        // Freeze, stare at where the thief was glimpsed, then go look.
        this.suspicionTimer -= dt;
        if (this.lastSeen) {
          this.angle = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
        }
        if (this.suspicionTimer <= 0) {
          this.state = 'investigate';
          this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
          this.investigateTimer = 5;
        }
        break;
      }
      case 'investigate': {
        this.investigateTimer -= dt;
        if (this.investigateTarget) {
          if (this.moveToward(this.investigateTarget.x, this.investigateTarget.y, INVESTIGATE_SPEED, dt)) {
            this.investigateTarget = null;
            this.investigateTimer = Math.min(this.investigateTimer, 1.6);
          }
        } else {
          // Look around, then give up and resume the patrol.
          this.angle += dt * 1.8;
          if (this.investigateTimer <= 0) {
            this.state = 'patrol';
            this.detection = 0;
          }
        }
        break;
      }
      case 'alert': {
        this.chaseTimer -= dt;
        if (sees) this.chaseTimer = Math.max(this.chaseTimer, 2.5);
        const target = this.lastSeen || { x: player.x, y: player.y };
        this.moveToward(target.x, target.y, CHASE_SPEED, dt);
        if (dist(this.x, this.y, player.x, player.y) < TOUCH_DISTANCE) {
          player.caughtBy = this.name;
        }
        if (this.chaseTimer <= 0 && !sees) {
          this.state = 'investigate';
          this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : null;
          this.investigateTimer = 4;
          this.detection = 0.5;
        }
        break;
      }
    }
  }
}
