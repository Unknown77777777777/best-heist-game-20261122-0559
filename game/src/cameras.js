// cameras.js — wall-mounted security cameras that sweep their cone back and
// forth. Being caught in a camera's cone raises the alarm meter; the alarm
// drains when no camera (or chasing guard) sees the thief.

import { angleDiff, dist, hasLineOfSight } from './geometry.js';

export const CAMERA_RANGE = 260;
export const CAMERA_HALF_ANGLE = 0.45;

export class Camera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.time = 0;
    this.angle = def.baseAngle;
    this.spotted = false; // currently seeing the thief
    this.blink = 0;
  }

  update(dt, player, blockers) {
    this.time += dt;
    this.angle = this.baseAngle + Math.sin(this.time * this.speed) * this.sweep;
    this.blink += dt;
    const d = dist(this.x, this.y, player.x, player.y);
    let seen = false;
    if (d < CAMERA_RANGE) {
      const toPlayer = Math.atan2(player.y - this.y, player.x - this.x);
      if (Math.abs(angleDiff(toPlayer, this.angle)) < CAMERA_HALF_ANGLE) {
        seen = hasLineOfSight(this.x, this.y, player.x, player.y, blockers);
      }
    }
    this.spotted = seen;
  }
}
