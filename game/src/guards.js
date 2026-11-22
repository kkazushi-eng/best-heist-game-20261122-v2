// guards.js — the museum guards.
//
// A guard walks a loop of waypoints. While patrolling it sweeps a vision
// cone; when the thief is inside the cone and in line of sight, suspicion
// climbs (faster up close, slower when the thief sneaks). A full meter
// turns the guard to CHASE: it runs at the thief, and touching the thief
// is an arrest. Losing sight for a while drops the guard back to patrol,
// and a thrown coin sends it to INVESTIGATE the noise instead.

import { TILE } from './levels.js';
import { TAU, angleDelta, clamp, inVisionCone, moveCircle } from './engine.js';

export const CONE_HALF_ANGLE = 0.62; // about 71 degrees of total vision
export const CONE_RANGE = 230;

const PATROL = 'patrol';
const INVESTIGATE = 'investigate';
const CHASE = 'chase';

export class Guard {
  constructor(def) {
    this.spawn = { x: (def.spawn[0] + 0.5) * TILE, y: (def.spawn[1] + 0.5) * TILE };
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.waypoints = def.waypoints.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }));
    this.speed = def.speed;
    this.wpIndex = 0;
    this.facing = 0;
    this.state = PATROL;
    this.suspicion = 0; // 0..1, fills while the thief is seen
    this.loseSight = 0; // seconds since the thief was last seen
    this.investigateTarget = null;
    this.investigateTimer = 0;
    this.radius = 13;
    this.pauseTimer = 0; // brief stop at each waypoint, looks around
    this.scanPhase = Math.random() * TAU;
  }

  reset() {
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.wpIndex = 0;
    this.state = PATROL;
    this.suspicion = 0;
    this.loseSight = 0;
    this.investigateTarget = null;
    this.investigateTimer = 0;
    this.pauseTimer = 0;
  }

  // How clearly this guard can see the thief right now, 0..1.
  // Smoke between them blocks the view entirely.
  seeStrength(grid, thief, smokeClouds) {
    const dist = Math.hypot(thief.x - this.x, thief.y - this.y);
    if (dist > CONE_RANGE) return 0;
    if (!inVisionCone(grid, this.x, this.y, this.facing, CONE_HALF_ANGLE, CONE_RANGE, thief.x, thief.y)) return 0;
    for (const cloud of smokeClouds) {
      // A smoke cloud between guard and thief blocks the view.
      if (segmentBlocksView(this.x, this.y, thief.x, thief.y, cloud)) return 0;
    }
    // Closer and standing (not sneaking) is easier to spot.
    const closeness = 1 - dist / CONE_RANGE;
    const sneakFactor = thief.sneaking ? 0.45 : 1;
    return clamp(0.35 + closeness * 0.85, 0, 1.2) * sneakFactor;
  }

  hearCoin(coin) {
    if (this.state === CHASE) return;
    const dist = Math.hypot(coin.x - this.x, coin.y - this.y);
    if (dist < 300) {
      this.state = INVESTIGATE;
      this.investigateTarget = { x: coin.x, y: coin.y };
      this.investigateTimer = 5;
      this.suspicion = Math.max(this.suspicion, 0.35);
    }
  }

  update(dt, grid, thief, smokeClouds, onSpotted) {
    // Vision first: suspicion rises while seen, falls while hidden.
    const seen = this.seeStrength(grid, thief, smokeClouds);
    if (seen > 0) {
      this.suspicion += seen * dt * 0.55;
      this.loseSight = 0;
      if (this.suspicion >= 1 && this.state !== CHASE) {
        this.state = CHASE;
        onSpotted(this);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.22);
      this.loseSight += dt;
    }

    if (this.state === CHASE) {
      this.chase(dt, grid, thief);
      if (this.loseSight > 4) {
        this.state = PATROL;
        this.suspicion = 0.4;
      }
      return;
    }

    if (this.state === INVESTIGATE) {
      this.investigateTimer -= dt;
      if (this.investigateTarget) this.walkToward(dt, grid, this.investigateTarget, this.speed * 1.25);
      const arrived = this.investigateTarget
        && Math.hypot(this.investigateTarget.x - this.x, this.investigateTarget.y - this.y) < 14;
      if (arrived || this.investigateTimer <= 0) {
        this.state = PATROL;
        this.investigateTarget = null;
        this.pauseTimer = 1.2; // look around before resuming the route
      }
      return;
    }

    // Patrol: walk to the next waypoint, pause and scan at each one.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.facing += Math.sin(this.scanPhase += dt * 2.2) * dt * 0.9;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const arrived = this.walkToward(dt, grid, target, this.speed);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = 0.7;
    }
  }

  chase(dt, grid, thief) {
    this.walkToward(dt, grid, thief, this.speed * 2.1);
  }

  // Walk toward a point, turning to face the direction of travel.
  // Returns true when the point is reached.
  walkToward(dt, grid, target, speed) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, speed * dt);
    const nx = (dx / dist) * step;
    const ny = (dy / dist) * step;
    const want = Math.atan2(dy, dx);
    this.facing += angleDelta(this.facing, want) * Math.min(1, dt * 8);
    moveCircle(grid, this, nx, ny, this.radius);
    return dist - step < 6;
  }

  // True when the guard has caught the thief (touching, while chasing or
  // with a full suspicion meter).
  caughtThief(thief) {
    return Math.hypot(thief.x - this.x, thief.y - this.y) < this.radius + thief.radius - 2;
  }
}

// Does the segment guard->thief pass through the smoke cloud?
function segmentBlocksView(x0, y0, x1, y1, cloud) {
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
