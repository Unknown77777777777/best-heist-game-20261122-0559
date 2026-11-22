// input.js — keyboard and mouse state, plus click-to-move targeting.
// The canvas is scaled to fit the window, so mouse positions are mapped back
// into the game's 1280x720 logical space.

export const GAME_W = 1280;
export const GAME_H = 720;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed once per frame
    this.mouseX = GAME_W / 2;
    this.mouseY = GAME_H / 2;
    this.moveTarget = null; // {x, y} set by a mouse click, cleared by keys
    this.clicked = false; // a click happened this frame

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const p = this.toGameCoords(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      const p = this.toGameCoords(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.moveTarget = { x: p.x, y: p.y };
      this.clicked = true;
    });
  }

  toGameCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / GAME_W, rect.height / GAME_H);
    const ox = (rect.width - GAME_W * scale) / 2;
    const oy = (rect.height - GAME_H * scale) / 2;
    return {
      x: (clientX - rect.left - ox) / scale,
      y: (clientY - rect.top - oy) / scale,
    };
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  moveVector() {
    let x = 0, y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    return null;
  }

  sneaking() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
