// game.js — The Midnight Vault: state, rooms, alarm, loot and scoring.
//
// States: title -> playing -> roomclear -> playing ... -> win, or caught.
// The alarm meter (0-100) is the shared pressure: guards spotting the
// thief and cameras feed it, lasers jump it, and it drains slowly when
// nobody can see the thief. At 100 the museum locks down: caught.
// Each room's main loot must be taken before the exit door opens.

import { TILE, COLS, ROWS, LEVELS } from './levels.js';
import { Guard } from './guards.js';
import { Camera, Laser } from './cameras.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';

export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

const ALARM_MAX = 100;
const ALARM_DECAY = 2.2; // per second while unseen
const GUARD_SPOT_RATE = 9; // alarm per second from a chasing guard's sight

export class Game {
  constructor() {
    this.state = 'title'; // title | playing | roomclear | caught | win
    this.levelIndex = 0;
    this.grid = [];
    this.player = new Player(60, 60);
    this.guards = [];
    this.cameras = [];
    this.lasers = [];
    this.gems = [];
    this.mainLoot = null;
    this.exit = null;
    this.alarm = 0;
    this.score = 0;
    this.lootTaken = 0;
    this.timePlayed = 0;
    this.roomTime = 0;
    this.message = '';
    this.messageTimer = 0;
    this.flash = 0; // red flash timer for alarm hits
    this.sounds = new SoundBank();
    this.stats = { roomsCleared: 0, gemsTaken: 0, timesSpotted: 0, toolsUsed: 0 };
    this.stateTimer = 0;
    this.loadRoom(0);
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  get mainLootTaken() {
    return this.mainLoot === null || this.mainLoot.taken;
  }

  loadRoom(index) {
    this.levelIndex = index;
    const lv = LEVELS[index];
    this.grid = lv.map.map((row) => row.split(''));
    this.guards = lv.guards.map((g) => new Guard(g));
    this.cameras = lv.cameras.map((c) => new Camera(c));
    this.lasers = lv.lasers.map((l) => new Laser(l));
    this.gems = [];
    this.mainLoot = null;
    this.exit = null;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ch = this.grid[row][col];
        const cx = (col + 0.5) * TILE;
        const cy = (row + 0.5) * TILE;
        if (ch === 'P') this.player.reset(cx, cy, lv.tools);
        if (ch === 'g') this.gems.push({ x: cx, y: cy, taken: false, bob: Math.random() * 6 });
        if (ch === 'V') this.mainLoot = { x: cx, y: cy, taken: false, name: lv.mainLootName, value: lv.mainLootValue };
        if (ch === 'E') this.exit = { x: cx, y: cy, open: false };
      }
    }
    this.alarm = 0;
    this.roomTime = 0;
    this.message = '';
    this.messageTimer = 0;
    this.sounds.stopAlarmLoop();
  }

  start() {
    this.score = 0;
    this.lootTaken = 0;
    this.timePlayed = 0;
    this.stats = { roomsCleared: 0, gemsTaken: 0, timesSpotted: 0, toolsUsed: 0 };
    this.loadRoom(0);
    this.state = 'playing';
    this.showMessage('Steal the ' + this.level.mainLootName + ', then reach the exit.', 5);
  }

  nextRoom() {
    this.stats.roomsCleared += 1;
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'win';
      this.sounds.stopAlarmLoop();
      this.sounds.win();
      return;
    }
    this.loadRoom(this.levelIndex + 1);
    this.state = 'playing';
    this.showMessage('Steal the ' + this.level.mainLootName + ', then reach the exit.', 5);
  }

  showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  }

  addAlarm(amount, source) {
    if (this.state !== 'playing') return;
    const before = this.alarm;
    this.alarm = Math.min(ALARM_MAX, this.alarm + amount);
    if (amount >= 10 && this.alarm > before) this.flash = Math.max(this.flash, 0.35);
    if (this.alarm >= ALARM_MAX) this.getCaught('lockdown');
  }

  getCaught(reason) {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.stateTimer = 0;
    this.caughtReason = reason;
    this.sounds.stopAlarmLoop();
    this.sounds.caught();
  }

  useTool(kind, mx, my) {
    if (this.state !== 'playing') return;
    if (kind === 'coin') {
      const target = this.player.coinTarget(mx, my);
      const coin = this.player.throwCoin(target.x, target.y);
      if (coin) {
        for (const g of this.guards) g.hearCoin(coin);
        this.stats.toolsUsed += 1;
        this.sounds.coin();
      } else {
        this.showMessage('Out of coins!', 1.5);
      }
    } else if (kind === 'smoke') {
      if (this.player.dropSmoke()) {
        this.stats.toolsUsed += 1;
        this.sounds.smoke();
      } else {
        this.showMessage('Out of smoke bombs!', 1.5);
      }
    } else if (kind === 'emp') {
      if (this.player.fireEmp()) {
        for (const c of this.cameras) c.disabled = 10;
        for (const l of this.lasers) l.disabled = 10;
        this.stats.toolsUsed += 1;
        this.sounds.emp();
        this.showMessage('EMP burst — cameras and lasers down!', 2.5);
      } else {
        this.showMessage('Out of EMP charges!', 1.5);
      }
    }
  }

  update(dt, keys) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.flash > 0) this.flash -= dt;

    if (this.state === 'caught' || this.state === 'win') {
      this.stateTimer += dt;
      return;
    }
    if (this.state === 'roomclear') {
      this.stateTimer += dt;
      if (this.stateTimer > 1.6) this.nextRoom();
      return;
    }
    if (this.state !== 'playing') return;

    this.timePlayed += dt;
    this.roomTime += dt;
    const player = this.player;
    player.update(dt, this.grid, keys);

    let anySeeing = false;
    for (const guard of this.guards) {
      guard.update(dt, this.grid, player, player.smokeClouds, () => {
        this.stats.timesSpotted += 1;
        this.sounds.spotted();
        this.showMessage('Spotted! Break line of sight!', 2);
      });
      if (guard.state === 'chase') {
        anySeeing = true;
        this.addAlarm(GUARD_SPOT_RATE * dt, 'guard');
      } else if (guard.suspicion > 0.05) {
        anySeeing = true;
        this.addAlarm(guard.suspicion * dt * 3, 'guard');
      }
      if (guard.caughtThief(player)) {
        this.getCaught('guard');
        return;
      }
    }

    for (const camera of this.cameras) {
      camera.update(dt, this.grid, player, player.smokeClouds, (amount) => {
        anySeeing = true;
        this.addAlarm(amount, 'camera');
      });
    }
    for (const laser of this.lasers) {
      laser.update(dt, player, (amount) => {
        this.addAlarm(amount, 'laser');
        this.showMessage('Laser tripped! Alarm rising!', 2);
      });
    }

    // The alarm drains only while nobody can see the thief.
    if (!anySeeing && this.alarm > 0) {
      this.alarm = Math.max(0, this.alarm - ALARM_DECAY * dt);
    }
    if (this.alarm > 55) this.sounds.startAlarmLoop();
    else this.sounds.stopAlarmLoop();

    // Loot pickup.
    for (const gem of this.gems) {
      if (!gem.taken && Math.hypot(gem.x - player.x, gem.y - player.y) < player.radius + 14) {
        gem.taken = true;
        this.score += this.level.gemValue;
        this.lootTaken += this.level.gemValue;
        this.stats.gemsTaken += 1;
        this.sounds.pickup();
      }
    }
    if (this.mainLoot && !this.mainLoot.taken
      && Math.hypot(this.mainLoot.x - player.x, this.mainLoot.y - player.y) < player.radius + 16) {
      this.mainLoot.taken = true;
      this.score += this.mainLoot.value;
      this.lootTaken += this.mainLoot.value;
      this.sounds.mainLoot();
      this.showMessage(this.mainLoot.name + ' secured! Get to the exit!', 4);
      if (this.exit) this.exit.open = true;
    }

    // Exit: only open once the main loot is taken.
    if (this.exit && this.exit.open
      && Math.hypot(this.exit.x - player.x, this.exit.y - player.y) < player.radius + 16) {
      const timeBonus = Math.max(0, 300 - Math.floor(this.roomTime) * 2);
      this.score += 250 + timeBonus;
      this.state = 'roomclear';
      this.stateTimer = 0;
      this.sounds.roomClear();
      this.showMessage('Room clear! +' + (250 + timeBonus) + ' getaway bonus', 1.6);
    }
  }

  // Snapshot for the renderer and for tests.
  snapshot() {
    return {
      state: this.state,
      levelIndex: this.levelIndex,
      levelName: this.level.name,
      alarm: this.alarm,
      score: this.score,
      lootTaken: this.lootTaken,
      gemsLeft: this.gems.filter((g) => !g.taken).length,
      gemsTotal: this.gems.length,
      mainLootTaken: this.mainLootTaken,
      exitOpen: this.exit ? this.exit.open : false,
      tools: { ...this.player.tools },
      timePlayed: this.timePlayed,
      stats: { ...this.stats },
    };
  }
}
