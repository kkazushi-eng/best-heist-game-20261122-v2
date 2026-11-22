// cameras.js — security cameras and laser beams.
//
// A camera sits on a wall and sweeps its cone back and forth. It never
// chases: being seen by a camera feeds the alarm meter directly, and a
// camera that has spotted the thief flashes red. Lasers are fixed beams
// across a corridor; crossing one trips the alarm in a single jump.
// Both are dead while an EMP is active.

import { TILE } from './levels.js';
import { TAU, clamp, inVisionCone, segmentHitsCircle } from './engine.js';

export const CAMERA_HALF_ANGLE = 0.5;
export const LASER_ALARM_HIT = 22;

export class Camera {
  constructor(def) {
    this.x = (def.col + 0.5) * TILE;
    this.y = (def.row + 0.5) * TILE;
    this.base = def.base;
    this.sweep = def.sweep;
    this.range = def.range;
    this.phase = Math.random() * TAU;
    this.facing = this.base;
    this.spotted = 0; // seconds the thief has been in view, for the flash
    this.disabled = 0; // EMP countdown; > 0 means off
    // The lens sits on the wall's face, not inside the wall tile: the
    // camera's own tile must never block its line of sight.
    this.eyeX = this.x + Math.cos(this.base) * (TILE / 2 - 4);
    this.eyeY = this.y + Math.sin(this.base) * (TILE / 2 - 4);
  }

  update(dt, grid, thief, smokeClouds, onAlarm) {
    if (this.disabled > 0) {
      this.disabled -= dt;
      this.spotted = 0;
      return;
    }
    // Sweep: a slow sine swing around the base angle.
    this.phase += dt * 0.55;
    this.facing = this.base + Math.sin(this.phase) * this.sweep;
    const seen = this.seeStrength(grid, thief, smokeClouds);
    if (seen > 0) {
      this.spotted += dt;
      onAlarm(seen * dt * 14, 'camera');
    } else {
      this.spotted = Math.max(0, this.spotted - dt * 2);
    }
  }

  seeStrength(grid, thief, smokeClouds) {
    const dist = Math.hypot(thief.x - this.eyeX, thief.y - this.eyeY);
    if (dist > this.range) return 0;
    if (!inVisionCone(grid, this.eyeX, this.eyeY, this.facing, CAMERA_HALF_ANGLE, this.range, thief.x, thief.y)) return 0;
    for (const cloud of smokeClouds) {
      if (segmentThroughCloud(this.eyeX, this.eyeY, thief.x, thief.y, cloud)) return 0;
    }
    const closeness = 1 - dist / this.range;
    const sneakFactor = thief.sneaking ? 0.5 : 1;
    return clamp(0.4 + closeness * 0.8, 0, 1.2) * sneakFactor;
  }
}

export class Laser {
  constructor(def) {
    this.x0 = (def.from[0] + 0.5) * TILE;
    this.y0 = (def.from[1] + 0.5) * TILE;
    this.x1 = (def.to[0] + 0.5) * TILE;
    this.y1 = (def.to[1] + 0.5) * TILE;
    this.disabled = 0; // EMP countdown
    this.tripped = 0; // flash timer after a crossing
    this.cooldown = 0; // so one crossing counts once
  }

  update(dt, thief, onAlarm) {
    if (this.tripped > 0) this.tripped -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.disabled > 0) {
      this.disabled -= dt;
      return;
    }
    if (this.cooldown <= 0 && segmentHitsCircle(this.x0, this.y0, this.x1, this.y1, thief.x, thief.y, thief.radius)) {
      this.tripped = 0.6;
      this.cooldown = 1.2;
      onAlarm(LASER_ALARM_HIT, 'laser');
    }
  }
}

function segmentThroughCloud(x0, y0, x1, y1, cloud) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cloud.x - x0) * dx + (cloud.y - y0) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x0 + dx * t;
  const py = y0 + dy * t;
  const ddx = cloud.x - px;
  const ddy = cloud.y - py;
  return ddx * ddx + ddy * ddy < cloud.radius * cloud.radius;
}
