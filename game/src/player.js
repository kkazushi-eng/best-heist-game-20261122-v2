// player.js — the thief.
//
// Moves with WASD or the arrow keys, holds Shift to sneak (slower, harder
// to spot). Three tools, each with a limited stock per room:
//   coin  — thrown toward the facing (or the mouse); guards nearby walk over
//           to investigate the clink, opening a gap in the patrol.
//   smoke — a cloud at the thief's feet that blocks every vision cone.
//   EMP   — shuts every camera and laser in the room down for a while.
// The thief carries what they steal; the room's main loot unlocks the exit.

import { moveCircle } from './engine.js';

export const WALK_SPEED = 165;
export const SNEAK_SPEED = 92;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.facing = 0; // radians; follows the last movement direction
    this.sneaking = false;
    this.moving = false;
    this.tools = { coins: 5, smoke: 2, emp: 1 };
    this.coinsThrown = [];
    this.smokeClouds = [];
    this.empTimer = 0;
    this.stepPhase = 0;
  }

  reset(x, y, tools) {
    this.x = x;
    this.y = y;
    this.facing = 0;
    this.sneaking = false;
    this.moving = false;
    this.tools = { ...tools };
    this.coinsThrown = [];
    this.smokeClouds = [];
    this.empTimer = 0;
    this.stepPhase = 0;
  }

  update(dt, grid, keys) {
    let mx = 0;
    let my = 0;
    if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
    if (keys.has('arrowright') || keys.has('d')) mx += 1;
    if (keys.has('arrowup') || keys.has('w')) my -= 1;
    if (keys.has('arrowdown') || keys.has('s')) my += 1;
    this.sneaking = keys.has('shift');
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.facing = Math.atan2(my, mx);
      const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
      moveCircle(grid, this, mx * speed * dt, my * speed * dt, this.radius);
      this.stepPhase += dt * (this.sneaking ? 6 : 11);
    }
    if (this.empTimer > 0) this.empTimer -= dt;
    for (const cloud of this.smokeClouds) cloud.life -= dt;
    this.smokeClouds = this.smokeClouds.filter((c) => c.life > 0);
    for (const coin of this.coinsThrown) {
      coin.life -= dt;
      if (coin.life > 0 && coin.ring < 1) coin.ring = Math.min(1, coin.ring + dt * 2.5);
    }
    this.coinsThrown = this.coinsThrown.filter((c) => c.life > 0);
  }

  // Throw a coin: it lands a few tiles ahead (or at the mouse point) and
  // pings. Returns the coin or null when out of stock.
  throwCoin(tx, ty) {
    if (this.tools.coins <= 0) return null;
    this.tools.coins -= 1;
    const coin = { x: tx, y: ty, life: 4, ring: 0 };
    this.coinsThrown.push(coin);
    return coin;
  }

  coinTarget(mx, my) {
    // A mouse point inside the room is used as-is; otherwise the coin flies
    // three tiles in the facing direction.
    if (Number.isFinite(mx) && Number.isFinite(my)) return { x: mx, y: my };
    return {
      x: this.x + Math.cos(this.facing) * 120,
      y: this.y + Math.sin(this.facing) * 120,
    };
  }

  dropSmoke() {
    if (this.tools.smoke <= 0) return false;
    this.tools.smoke -= 1;
    this.smokeClouds.push({ x: this.x, y: this.y, radius: 85, life: 6 });
    return true;
  }

  fireEmp() {
    if (this.tools.emp <= 0) return false;
    this.tools.emp -= 1;
    this.empTimer = 10;
    return true;
  }
}
