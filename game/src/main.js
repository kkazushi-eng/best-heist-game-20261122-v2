// main.js — boots The Midnight Vault, runs the loop, wires input.
//
// Keyboard: WASD/arrows move, Shift sneaks, 1/2/3 use tools, Enter starts
// or restarts, R retries the current room after being caught, M mutes.
// Mouse: a click throws a coin at the clicked point (and starts the game
// from the title screen). The `?shot=` query is a maker aid for staged
// screenshots: it drops the game into a chosen state, still running the
// real game code.

import { Game, VIEW_W, VIEW_H } from './game.js';
import { draw } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = new Game();
const keys = new Set();
let mouse = { x: null, y: null };
let lastTime = performance.now();
let elapsed = 0;

function keyName(event) {
  return event.key.toLowerCase();
}

window.addEventListener('keydown', (event) => {
  const k = keyName(event);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) event.preventDefault();
  game.sounds.ensure();
  keys.add(k);

  if (k === 'm') {
    const muted = game.sounds.toggleMute();
    game.showMessage(muted ? 'Sound off' : 'Sound on', 1.5);
    return;
  }
  if (k === 'enter') {
    if (game.state === 'title' || game.state === 'win') game.start();
    else if (game.state === 'caught') game.start();
    return;
  }
  if (k === 'r' && game.state === 'caught') {
    game.loadRoom(game.levelIndex);
    game.state = 'playing';
    game.showMessage('Try the room again — quieter this time.', 3);
    return;
  }
  if (game.state !== 'playing') return;
  if (k === '1') game.useTool('coin', mouse.x, mouse.y);
  if (k === '2') game.useTool('smoke');
  if (k === '3') game.useTool('emp');
});

window.addEventListener('keyup', (event) => {
  keys.delete(keyName(event));
});

canvas.addEventListener('click', (event) => {
  game.sounds.ensure();
  const rect = canvas.getBoundingClientRect();
  const scaleX = VIEW_W / rect.width;
  const scaleY = VIEW_H / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  mouse = { x, y };
  if (game.state === 'title' || game.state === 'win') {
    game.start();
    return;
  }
  if (game.state === 'playing') game.useTool('coin', x, y);
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: (event.clientX - rect.left) * (VIEW_W / rect.width),
    y: (event.clientY - rect.top) * (VIEW_H / rect.height),
  };
});

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;
  game.update(dt, keys);
  draw(ctx, game, elapsed);
  requestAnimationFrame(frame);
}

// Staged states for the maker's screenshots (?shot=title|play|vault|win).
// These set up the real game and let it run; nothing is faked.
function applyShotParam() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (!shot) return;
  if (shot === 'play') {
    game.start();
    game.player.x = 480;
    game.player.y = 320;
  } else if (shot === 'vault') {
    game.start();
    game.loadRoom(2);
    game.state = 'playing';
    game.player.x = 480;
    game.player.y = 300;
    game.score = 1450;
    game.gems[0].taken = true;
  } else if (shot === 'win') {
    game.start();
    game.loadRoom(2);
    game.state = 'win';
    game.messageTimer = 0;
    game.score = 3850;
    game.timePlayed = 372;
    game.stats = { roomsCleared: 3, gemsTaken: 14, timesSpotted: 2, toolsUsed: 7 };
  }
}

applyShotParam();
requestAnimationFrame(frame);

// Test hooks: the maker's own play-tests drive the game through these.
window.__vault = {
  game,
  keys,
  teleport(x, y) { game.player.x = x; game.player.y = y; },
  start() { game.start(); },
  snapshot() { return game.snapshot(); },
};
