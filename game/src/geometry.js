// geometry.js — small 2D helpers: segments, line of sight, circle-vs-rectangle.
// The Quiet Vault uses these for vision cones, camera sight and movement collision.

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Do segments (ax,ay)-(bx,by) and (cx,cy)-(dx,dy) intersect?
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Does segment (ax,ay)-(bx,by) cross rectangle r {x,y,w,h}?
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  const x2 = r.x + r.w, y2 = r.y + r.h;
  return segmentsIntersect(ax, ay, bx, by, r.x, r.y, x2, r.y) ||
         segmentsIntersect(ax, ay, bx, by, x2, r.y, x2, y2) ||
         segmentsIntersect(ax, ay, bx, by, x2, y2, r.x, y2) ||
         segmentsIntersect(ax, ay, bx, by, r.x, y2, r.x, r.y);
}

// True when nothing blocks the view between (ax,ay) and (bx,by).
// blockers is an array of rects (walls and tall cover).
export function hasLineOfSight(ax, ay, bx, by, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(ax, ay, bx, by, r)) return false;
  }
  return true;
}

// Push a circle (cx,cy,radius) out of every rect it overlaps. Returns corrected [x, y].
export function resolveCircleRects(x, y, radius, rects) {
  for (const r of rects) {
    const nx = clamp(x, r.x, r.x + r.w);
    const ny = clamp(y, r.y, r.y + r.h);
    const dx = x - nx, dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        y = ny + (dy / d) * radius;
      } else {
        // Centre inside the rect: push out along the smallest penetration.
        const left = x - r.x, right = r.x + r.w - x;
        const top = y - r.y, bottom = r.y + r.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = r.x - radius;
        else if (m === right) x = r.x + r.w + radius;
        else if (m === top) y = r.y - radius;
        else y = r.y + r.h + radius;
      }
    }
  }
  return [x, y];
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
