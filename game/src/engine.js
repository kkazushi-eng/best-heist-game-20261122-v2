// engine.js — small geometry and collision helpers shared by the game.
//
// Everything here works in pixel space. The room is a tile grid; walls and
// crates are solid, everything else is open floor. Vision checks walk a
// straight line and stop at the first solid tile they hit.

import { TILE, COLS, ROWS } from './levels.js';

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Shortest signed turn from angle a towards angle b, in (-PI, PI].
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

// Is the tile at (col, row) solid? Out of bounds counts as solid.
export function tileSolid(grid, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const ch = grid[row][col];
  return ch === '#' || ch === 'o';
}

// Circle (x, y, r) against the solid tiles around it. Returns true when the
// circle overlaps any solid tile.
export function circleHitsSolid(grid, x, y, r) {
  const c0 = Math.floor((x - r) / TILE);
  const c1 = Math.floor((x + r) / TILE);
  const r0 = Math.floor((y - r) / TILE);
  const r1 = Math.floor((y + r) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!tileSolid(grid, col, row)) continue;
      const nearestX = clamp(x, col * TILE, col * TILE + TILE);
      const nearestY = clamp(y, row * TILE, row * TILE + TILE);
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

// Move a circle by (dx, dy) one axis at a time so it slides along walls
// instead of sticking in corners.
export function moveCircle(grid, pos, dx, dy, r) {
  if (dx !== 0 && !circleHitsSolid(grid, pos.x + dx, pos.y, r)) pos.x += dx;
  if (dy !== 0 && !circleHitsSolid(grid, pos.x, pos.y + dy, r)) pos.y += dy;
}

// Line of sight between two points: sample along the segment and stop at
// the first solid tile. Smoke clouds are checked by the caller.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    if (tileSolid(grid, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
  }
  return true;
}

// Does the segment (x0,y0)-(x1,y1) cross the circle at (cx,cy,r)?
export function segmentHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x0) * dx + (cy - y0) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x0 + dx * t;
  const py = y0 + dy * t;
  const ddx = cx - px;
  const ddy = cy - py;
  return ddx * ddx + ddy * ddy < r * r;
}

// Point-in-cone test: within range, within half-angle of the facing, and
// with a clear line of sight.
export function inVisionCone(grid, ox, oy, facing, halfAngle, range, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDelta(facing, ang)) > halfAngle) return false;
  return hasLineOfSight(grid, ox, oy, tx, ty);
}
