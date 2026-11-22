// render.js — every pixel of The Quiet Vault: the night museum, vision cones,
// guards, cameras, loot, HUD and the menu / caught / clear / win screens.
// Canvas 2D only, no images: all art is drawn shapes.

import { GAME_W, GAME_H } from './input.js';
import { PLAYER_RADIUS } from './player.js';
import { GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE } from './guards.js';
import { CAMERA_RANGE, CAMERA_HALF_ANGLE } from './cameras.js';

const FLOOR_A = '#1b2138';
const FLOOR_B = '#171c30';
const WALL_FILL = '#3a4157';
const WALL_TOP = '#5a6280';
const GOLD = '#ffd166';
const ALARM_RED = '#ff4d4d';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fillStyle = fill;
  ctx.fill();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  drawFloor(ctx) {
    ctx.fillStyle = FLOOR_A;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    // Checkerboard marble tiles.
    const tile = 64;
    for (let y = 0; y < GAME_H; y += tile) {
      for (let x = 0; x < GAME_W; x += tile) {
        if (((x + y) / tile) % 2 === 0) {
          ctx.fillStyle = FLOOR_B;
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
    // Faint gold inlay lines.
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GAME_W; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); ctx.stroke();
    }
    for (let y = 0; y <= GAME_H; y += tile) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke();
    }
  }

  drawShadows(ctx, shadows) {
    for (const s of shadows) {
      ctx.fillStyle = 'rgba(4, 8, 20, 0.55)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(120, 150, 255, 0.18)';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      ctx.setLineDash([]);
    }
  }

  drawShadowLabels(ctx, shadows) {
    // Labels draw after the walls so a wall never cuts the text.
    for (const s of shadows) {
      ctx.fillStyle = 'rgba(140, 170, 255, 0.5)';
      ctx.font = '11px monospace';
      ctx.fillText('SHADOW', s.x + 8, s.y + 16);
    }
  }

  drawWalls(ctx, walls) {
    for (const w of walls) {
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(w.x, w.y, w.w, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
    }
  }

  drawCover(ctx, cover) {
    for (const c of cover) {
      if (c.kind === 'crate') {
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#8a6238';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
        ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
        ctx.stroke();
      } else if (c.kind === 'pedestal') {
        ctx.fillStyle = '#c9cdd8';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#8d93a8';
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 4, 9, 0, Math.PI * 2);
        ctx.fill();
      } else { // glass display case
        ctx.fillStyle = 'rgba(150, 200, 255, 0.16)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, 8);
      }
    }
  }

  drawExit(ctx, exit, lootTaken, time) {
    const open = lootTaken;
    const pulse = open ? 0.6 + 0.4 * Math.sin(time * 4) : 0.25;
    ctx.fillStyle = open ? `rgba(80, 255, 140, ${0.35 + pulse * 0.4})` : 'rgba(255, 80, 80, 0.3)';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = open ? '#50ff8c' : '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = open ? '#b6ffd2' : '#ffb3b3';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    // Label sits clear of the HUD bar (top exits) and the hint bar (bottom exits).
    const labelY = exit.y < 360 ? exit.y + exit.h + 14 : exit.y - 8;
    ctx.fillText(open ? 'EXIT OPEN' : 'EXIT LOCKED', exit.x + exit.w / 2, labelY);
    ctx.textAlign = 'left';
  }

  drawLoot(ctx, loot, lootName, lootTaken, time) {
    if (lootTaken) return;
    const glow = 0.5 + 0.5 * Math.sin(time * 3);
    const grad = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 46 + glow * 14);
    grad.addColorStop(0, 'rgba(255, 209, 102, 0.55)');
    grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 60, 0, Math.PI * 2);
    ctx.fill();
    // Glass case with the jewel inside.
    ctx.fillStyle = 'rgba(150, 200, 255, 0.25)';
    ctx.fillRect(loot.x - 22, loot.y - 16, 44, 32);
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
    ctx.strokeRect(loot.x - 22, loot.y - 16, 44, 32);
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = GOLD;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-9, -9, 18, 6);
    ctx.restore();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lootName.toUpperCase(), loot.x, loot.y - 30);
    ctx.textAlign = 'left';
  }

  drawCoin(ctx, coin) {
    if (!coin) return;
    if (coin.landed) {
      const alpha = Math.max(0, 1 - coin.ring / 1.2);
      ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6 + coin.ring * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¢', coin.x, coin.y + 3);
    ctx.textAlign = 'left';
  }

  drawGuards(ctx, guards) {
    for (const g of guards) {
      // Vision cone, coloured by state.
      let fill = 'rgba(255, 220, 90, 0.13)';
      if (g.state === 'suspicious') fill = 'rgba(255, 160, 40, 0.22)';
      if (g.state === 'alert') fill = 'rgba(255, 60, 60, 0.28)';
      if (g.state === 'investigate') fill = 'rgba(255, 160, 40, 0.18)';
      drawCone(ctx, g.x, g.y, g.angle, GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE, fill);
      ctx.strokeStyle = fill.replace(/[\d.]+\)$/, '0.5)');
      ctx.lineWidth = 1;
      conePath(ctx, g.x, g.y, g.angle, GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE);
      ctx.stroke();

      // Body: navy uniform, brass buttons, facing tick.
      ctx.fillStyle = '#232a4a';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8d93a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#d8b25c';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8ecf5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
      ctx.stroke();

      // Detection meter above the guard's head.
      if (g.detection > 0.02) {
        const w = 34;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(g.x - w / 2, g.y - 30, w, 6);
        ctx.fillStyle = g.detection >= 1 ? ALARM_RED : '#ffb020';
        ctx.fillRect(g.x - w / 2 + 1, g.y - 29, (w - 2) * g.detection, 4);
      }
      if (g.state === 'suspicious' || g.state === 'alert') {
        ctx.fillStyle = g.state === 'alert' ? ALARM_RED : '#ffb020';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 34);
        ctx.textAlign = 'left';
      }
    }
  }

  drawCameras(ctx, cameras, time) {
    for (const c of cameras) {
      drawCone(ctx, c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE,
        c.spotted ? 'rgba(255, 60, 60, 0.30)' : 'rgba(255, 60, 60, 0.10)');
      // Wall mount + lens.
      ctx.fillStyle = '#2c3145';
      ctx.fillRect(c.x - 11, c.y - 8, 22, 16);
      ctx.fillStyle = '#c9cdd8';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fill();
      const blinkOn = c.spotted || (Math.floor(time * 2) % 2 === 0);
      ctx.fillStyle = blinkOn ? ALARM_RED : '#5a1f1f';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (c.spotted) {
        ctx.fillStyle = ALARM_RED;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPOTTED', c.x, c.y - 16);
        ctx.textAlign = 'left';
      }
    }
  }

  drawPlayer(ctx, player, time) {
    const p = player;
    // Sneak = lower, tighter silhouette.
    const r = p.sneaking ? 10 : PLAYER_RADIUS;
    // Soft shadow underfoot.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.8, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded thief: dark teal cloak, gold clasp, pale face.
    ctx.fillStyle = '#0f3d3e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Direction tick.
    ctx.strokeStyle = '#e8ecf5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * (r + 7), p.y + Math.sin(p.angle) * (r + 7));
    ctx.stroke();
    // Lockpick progress ring.
    if (p.lockpicking) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.lockpickProgress);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PICKING…', p.x, p.y - 30);
      ctx.textAlign = 'left';
    }
    // Name tag.
    ctx.fillStyle = 'rgba(232, 236, 245, 0.85)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WREN', p.x, p.y - 18);
    ctx.textAlign = 'left';
  }

  drawHud(ctx, game) {
    const level = game.level;
    const alarm = game.alarm;
    // Top bar.
    ctx.fillStyle = 'rgba(8, 10, 22, 0.82)';
    ctx.fillRect(0, 0, GAME_W, 52);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(level.name, 16, 22);
    ctx.fillStyle = '#9aa3bd';
    ctx.font = '12px monospace';
    ctx.fillText(game.lootTaken ? 'Loot secured — reach the exit unseen.' : level.objective, 16, 40);

    // Loot pips: one per room, gold when taken.
    for (let i = 0; i < 3; i++) {
      const x = 760 + i * 30;
      ctx.fillStyle = i < game.lootCount ? GOLD : 'rgba(255,255,255,0.15)';
      ctx.save();
      ctx.translate(x, 26);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }
    ctx.fillStyle = '#9aa3bd';
    ctx.font = '12px monospace';
    ctx.fillText('LOOT', 712, 30);

    // Coins.
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(920, 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¢', 920, 30);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`x ${game.player.coins}`, 934, 31);

    // Alarm meter.
    const ax = 1000, ay = 16, aw = 240, ah = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(ax - 1, ay - 1, aw + 2, ah + 2);
    const alarmColour = alarm > 70 ? ALARM_RED : alarm > 35 ? '#ffb020' : '#50c878';
    ctx.fillStyle = alarmColour;
    ctx.fillRect(ax, ay, aw * (alarm / 100), ah);
    ctx.strokeStyle = '#e8ecf5';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax, ay, aw, ah);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ALARM ${Math.round(alarm)}%`, ax + aw / 2, ay + 15);
    ctx.textAlign = 'left';
    if (alarm > 70) {
      ctx.fillStyle = ALARM_RED;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('LOCKDOWN IMMINENT', 1000, 48);
    }

    // Bottom hint bar.
    ctx.fillStyle = 'rgba(8, 10, 22, 0.7)';
    ctx.fillRect(0, GAME_H - 26, GAME_W, 26);
    ctx.fillStyle = '#9aa3bd';
    ctx.font = '12px monospace';
    ctx.fillText('WASD / arrows move · Shift sneak · Q throw coin · E pick lock (hold) · Click to move · M mute', 16, GAME_H - 8);
  }

  drawOverlay(ctx, title, lines, accent, footer) {
    ctx.fillStyle = 'rgba(5, 7, 16, 0.82)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, GAME_W / 2, 250);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = '16px monospace';
    let y = 300;
    for (const line of lines) {
      ctx.fillText(line, GAME_W / 2, y);
      y += 28;
    }
    ctx.fillStyle = '#9aa3bd';
    ctx.font = '14px monospace';
    ctx.fillText(footer, GAME_W / 2, y + 30);
    ctx.textAlign = 'left';
  }

  draw(game, time) {
    const ctx = this.ctx;
    const level = game.level;
    this.drawFloor(ctx);
    this.drawShadows(ctx, level.shadows);
    this.drawExit(ctx, level.exit, game.lootTaken, time);
    this.drawCover(ctx, level.cover);
    this.drawWalls(ctx, level.walls);
    this.drawShadowLabels(ctx, level.shadows);
    // Loot sits on top of its display block, so it draws after the walls.
    this.drawLoot(ctx, level.loot, level.lootName, game.lootTaken, time);
    this.drawCameras(ctx, game.cameras, time);
    this.drawGuards(ctx, game.guards);
    this.drawCoin(ctx, game.player.coin);
    this.drawPlayer(ctx, game.player, time);
    this.drawHud(ctx, game);

    if (game.screen === 'menu') {
      this.drawOverlay(ctx, 'THE QUIET VAULT', [
        'A night museum. Three rooms. One thief: Wren.',
        'Cross each room unseen, crack the loot case, and slip out the door.',
        '',
        'WASD / arrows — move      Shift — sneak (slow, quiet, harder to spot)',
        'Q — throw a coin to distract a guard      E — pick the lock (hold, stand still)',
        'Click — walk there      Stay out of the yellow cones. Red cones are cameras.',
        'Hide in shadows. If the alarm hits 100%, the vault seals shut.',
      ], GOLD, 'Press ENTER to begin the heist');
    } else if (game.screen === 'caught') {
      this.drawOverlay(ctx, 'CAUGHT', [
        game.caughtReason,
        `Room: ${level.name}   ·   Loot taken: ${game.lootCount} of 3`,
        'The guards knew exactly where you were.',
      ], ALARM_RED, 'Press R to try this room again');
    } else if (game.screen === 'clear') {
      this.drawOverlay(ctx, 'ROOM CLEAR', [
        `${level.lootName} is yours.`,
        `Alarm peaked at ${Math.round(game.peakAlarm)}%   ·   Time in room: ${game.roomTime.toFixed(1)}s`,
        'The next room is darker, and the patrols are tighter.',
      ], '#50ff8c', 'Press ENTER for the next room');
    } else if (game.screen === 'win') {
      this.drawOverlay(ctx, 'THE GETAWAY', [
        'All three rooms cleared. Every jewel is yours.',
        `Total time: ${game.totalTime.toFixed(1)}s   ·   Coins left: ${game.player.coins}`,
        'Wren melts into the night before the first siren fades.',
      ], GOLD, 'Press R to run the heist again');
    }
  }
}
