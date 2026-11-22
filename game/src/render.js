// render.js — everything the player sees, drawn on one canvas.
//
// The look: a night museum — deep navy carpet with a faint checker, walls
// in charcoal with a gold trim, crates as dark wood. Danger reads at a
// glance: guard and camera cones are warm yellow, turning red as suspicion
// or the alarm climbs; lasers are hot red; loot glows cyan and gold; the
// exit is green only once it is open. The HUD sits on top of the room.

import { TILE, COLS, ROWS } from './levels.js';
import { CONE_HALF_ANGLE, CONE_RANGE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './cameras.js';
import { VIEW_W, VIEW_H } from './game.js';

const WALL_TOP = '#3a3f52';
const WALL_FACE = '#232637';
const WALL_TRIM = '#c9a227';
const FLOOR_A = '#1b2036';
const FLOOR_B = '#171b2e';

export function drawCone(ctx, x, y, facing, halfAngle, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawRoom(ctx, game) {
  const grid = game.grid;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = grid[row][col];
      const px = col * TILE;
      const py = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = WALL_FACE;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, 6);
        ctx.strokeStyle = WALL_TRIM;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.35;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(px, py, TILE, TILE);
        // Faint carpet diamonds so the floor is not flat.
        ctx.fillStyle = 'rgba(201, 162, 39, 0.05)';
        ctx.beginPath();
        ctx.moveTo(px + TILE / 2, py + 8);
        ctx.lineTo(px + TILE - 8, py + TILE / 2);
        ctx.lineTo(px + TILE / 2, py + TILE - 8);
        ctx.lineTo(px + 8, py + TILE / 2);
        ctx.closePath();
        ctx.fill();
      }
      if (ch === 'o') {
        ctx.fillStyle = '#4a3421';
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#6b4c2f';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 4);
        ctx.lineTo(px + TILE - 4, py + TILE - 4);
        ctx.moveTo(px + TILE - 4, py + 4);
        ctx.lineTo(px + 4, py + TILE - 4);
        ctx.stroke();
      }
    }
  }
}

export function drawLoot(ctx, game, time) {
  for (const gem of game.gems) {
    if (gem.taken) continue;
    const bob = Math.sin(time * 3 + gem.bob) * 3;
    const x = gem.x;
    const y = gem.y + bob;
    ctx.save();
    ctx.shadowColor = '#37e0e6';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#37e0e6';
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#d9fbff';
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 3, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 3, y);
    ctx.closePath();
    ctx.fill();
  }

  const loot = game.mainLoot;
  if (loot && !loot.taken) {
    const pulse = 0.7 + Math.sin(time * 4) * 0.3;
    ctx.save();
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 22 * pulse;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 16 : 7;
      const x = loot.x + Math.cos(ang) * r;
      const y = loot.y + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawExit(ctx, game, time) {
  const exit = game.exit;
  if (!exit) return;
  const open = exit.open;
  const glow = open ? 0.6 + Math.sin(time * 5) * 0.4 : 0.15;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = open ? '#39d98a' : '#5a6b7d';
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = open ? '#39d98a' : '#7d8aa0';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 14, exit.y - 16, 28, 32);
  ctx.fillStyle = open ? '#39d98a' : '#7d8aa0';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x, exit.y + 30);
}

export function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    const heat = guard.state === 'chase' ? 1 : guard.suspicion;
    const coneColor = guard.state === 'chase'
      ? 'rgba(255, 64, 64, 0.34)'
      : `rgba(255, 196, 66, ${0.14 + heat * 0.22})`;
    drawCone(ctx, guard.x, guard.y, guard.facing, CONE_HALF_ANGLE, CONE_RANGE, coneColor);

    // Body: dark uniform, red epaulettes when chasing.
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.facing);
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.state === 'chase' ? '#ff4040' : '#8b93a7';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cap brim and torch dot, so the facing reads clearly.
    ctx.fillStyle = guard.state === 'chase' ? '#ff4040' : '#c9a227';
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Suspicion ticks above the head.
    if (guard.suspicion > 0.05 && guard.state !== 'chase') {
      const w = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(guard.x - w / 2, guard.y - guard.radius - 12, w, 5);
      ctx.fillStyle = guard.suspicion > 0.7 ? '#ff5040' : '#ffc442';
      ctx.fillRect(guard.x - w / 2, guard.y - guard.radius - 12, w * guard.suspicion, 5);
    }
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - guard.radius - 8);
    }
  }
}

export function drawCamerasAndLasers(ctx, game, time) {
  for (const camera of game.cameras) {
    const off = camera.disabled > 0;
    if (!off) {
      const color = camera.spotted > 0.3
        ? 'rgba(255, 64, 64, 0.32)'
        : 'rgba(255, 196, 66, 0.18)';
      drawCone(ctx, camera.eyeX, camera.eyeY, camera.facing, CAMERA_HALF_ANGLE, camera.range, color);
    }
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.fillStyle = off ? '#3a4152' : '#1c1f2a';
    ctx.fillRect(-11, -7, 22, 14);
    ctx.strokeStyle = off ? '#5a6b7d' : '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-11, -7, 22, 14);
    ctx.fillStyle = off ? '#5a6b7d' : (camera.spotted > 0.3 ? '#ff4040' : '#ff5040');
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (off) {
      ctx.fillStyle = '#8b93a7';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      // Bottom-wall cameras get the label above them, so it stays on screen.
      const labelY = camera.y > VIEW_H - 60 ? camera.y - 22 : camera.y + 22;
      ctx.fillText('OFF ' + Math.ceil(camera.disabled) + 's', camera.x, labelY);
    }
  }

  for (const laser of game.lasers) {
    if (laser.disabled > 0) {
      ctx.strokeStyle = 'rgba(120, 130, 150, 0.5)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(laser.x0, laser.y0);
      ctx.lineTo(laser.x1, laser.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const flicker = laser.tripped > 0 ? 0.9 : 0.55 + Math.sin(time * 9) * 0.2;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.strokeStyle = '#ff2e4d';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff2e4d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(laser.x0, laser.y0);
    ctx.lineTo(laser.x1, laser.y1);
    ctx.stroke();
    ctx.restore();
    for (const [ex, ey] of [[laser.x0, laser.y0], [laser.x1, laser.y1]]) {
      ctx.fillStyle = '#2a2f42';
      ctx.fillRect(ex - 5, ey - 5, 10, 10);
      ctx.fillStyle = '#ff2e4d';
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawPlayer(ctx, game) {
  const p = game.player;
  // Smoke clouds first (they sit under the thief).
  for (const cloud of p.smokeClouds) {
    const alpha = Math.min(0.85, cloud.life * 0.4);
    const grad = ctx.createRadialGradient(cloud.x, cloud.y, 4, cloud.x, cloud.y, cloud.radius);
    grad.addColorStop(0, `rgba(180, 190, 210, ${alpha})`);
    grad.addColorStop(1, 'rgba(180, 190, 210, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Thrown coins and their ping rings.
  for (const coin of p.coinsThrown) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 217, 77, ${1 - coin.ring})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6 + coin.ring * 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The thief: a dark figure with a slouch hat; bobbing as they walk.
  const bob = p.moving ? Math.sin(p.stepPhase) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#10131c';
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.strokeStyle = p.sneaking ? '#37e0e6' : '#e8eaf2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Hat brim, turned to the facing.
  ctx.rotate(p.facing);
  ctx.fillStyle = '#232637';
  ctx.beginPath();
  ctx.ellipse(3, 0, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8eaf2';
  ctx.beginPath();
  ctx.arc(7, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (p.empTimer > 0) {
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8 + Math.sin(p.stepPhase * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawHud(ctx, game) {
  const W = VIEW_W;
  // Top bar.
  ctx.fillStyle = 'rgba(8, 10, 20, 0.92)';
  ctx.fillRect(0, 0, W, 46);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 46.5);
  ctx.lineTo(W, 46.5);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8eaf2';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(game.level.name, 14, 24);

  // Alarm meter.
  const ax = 330;
  const aw = 260;
  ctx.fillStyle = '#e8eaf2';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', ax - 52, 24);
  ctx.fillStyle = '#10131c';
  ctx.fillRect(ax, 14, aw, 18);
  const alarmFrac = game.alarm / 100;
  const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
  grad.addColorStop(0, '#ffc442');
  grad.addColorStop(0.6, '#ff8c42');
  grad.addColorStop(1, '#ff2e4d');
  ctx.fillStyle = grad;
  ctx.fillRect(ax, 14, aw * alarmFrac, 18);
  ctx.strokeStyle = '#8b93a7';
  ctx.strokeRect(ax + 0.5, 14.5, aw, 18);
  if (game.alarm >= 75) {
    ctx.fillStyle = '#ff2e4d';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LOCKDOWN IMMINENT', ax + aw + 10, 24);
  }

  // Score and loot.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SCORE ' + game.score, W - 14, 16);
  ctx.fillStyle = '#37e0e6';
  ctx.font = '12px sans-serif';
  const gemsLeft = game.gems.filter((g) => !g.taken).length;
  ctx.fillText(`◆ ${game.gems.length - gemsLeft}/${game.gems.length}   ★ ${game.mainLootTaken ? 'taken' : 'steal me'}`, W - 14, 34);

  // Tool strip, bottom left.
  const tools = game.player.tools;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8, 10, 20, 0.85)';
  ctx.fillRect(10, VIEW_H - 40, 400, 30);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '13px sans-serif';
  ctx.fillText(`[1] Coin ×${tools.coins}    [2] Smoke ×${tools.smoke}    [3] EMP ×${tools.emp}`, 20, VIEW_H - 24);
  ctx.fillStyle = '#8b93a7';
  ctx.fillText('Shift: sneak    M: mute', 268, VIEW_H - 24);

  // Bottom-right timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8b93a7';
  ctx.font = '13px sans-serif';
  const t = Math.floor(game.timePlayed);
  ctx.fillText(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, W - 14, VIEW_H - 24);

  // Transient message banner.
  if (game.messageTimer > 0 && game.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8, 10, 20, 0.85)';
    const mw = ctx.measureText(game.message).width + 36;
    ctx.fillRect(W / 2 - mw / 2, 58, mw, 30);
    ctx.strokeStyle = '#c9a227';
    ctx.strokeRect(W / 2 - mw / 2, 58, mw, 30);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(game.message, W / 2, 74);
  }

  // Red flash when the alarm jumps.
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 46, 77, ${game.flash * 0.45})`;
    ctx.fillRect(0, 0, W, VIEW_H);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 190);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 250 + i * 30));
}

export function drawTitle(ctx, game) {
  // Show the room behind the title so the first frame already sells it.
  drawRoom(ctx, game);
  drawLoot(ctx, game, 0);
  drawGuards(ctx, game);
  drawExit(ctx, game, 0);
  ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText('THE MIDNIGHT VAULT', VIEW_W / 2, 170);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '19px sans-serif';
  ctx.fillText('A top-down stealth heist in three rooms. Steal the main loot, dodge the cones,', VIEW_W / 2, 220);
  ctx.fillText('and slip out the exit before the alarm hits 100.', VIEW_W / 2, 248);
  ctx.fillStyle = '#37e0e6';
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / Arrows — move      Shift — sneak      1 — throw coin      2 — smoke bomb      3 — EMP', VIEW_W / 2, 310);
  ctx.fillText('Click — throw a coin where you point. Guards chase what they see. Cameras feed the alarm.', VIEW_W / 2, 338);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER or click to begin the heist', VIEW_W / 2, 410);
  ctx.fillStyle = '#8b93a7';
  ctx.font = '14px sans-serif';
  ctx.fillText('Room 1: The Lobby  •  Room 2: The Gallery  •  Room 3: The Vault', VIEW_W / 2, 460);
}

export function drawCaught(ctx, game) {
  overlay(ctx, 'CAUGHT!', [
    game.caughtReason === 'lockdown'
      ? 'The alarm hit 100 and the museum locked down.'
      : 'A guard got their hands on you.',
    `You made it to ${game.level.name} with $${game.score} in loot.`,
    'Press R to try this room again, or ENTER to restart the heist.',
  ], '#ff5040');
}

export function drawRoomClear(ctx, game) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#39d98a';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 280);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '18px sans-serif';
  ctx.fillText(game.level.name + ' cleared. On to the next room…', VIEW_W / 2, 330);
}

export function drawWin(ctx, game) {
  const minutes = Math.floor(game.timePlayed / 60);
  const seconds = Math.floor(game.timePlayed % 60);
  overlay(ctx, 'THE VAULT IS YOURS', [
    'All three rooms cleared. The Crown of Midnight is in your pocket',
    'and the museum never knew you were there.',
    '',
    `Final score: ${game.score}   •   Gems taken: ${game.stats.gemsTaken}   •   Tools used: ${game.stats.toolsUsed}`,
    `Times spotted: ${game.stats.timesSpotted}   •   Time: ${minutes}:${String(seconds).padStart(2, '0')}`,
    '',
    'Press ENTER to run the heist again.',
  ], '#ffd94d');
}

export function draw(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') {
    drawTitle(ctx, game);
    return;
  }
  drawRoom(ctx, game);
  drawExit(ctx, game, time);
  drawLoot(ctx, game, time);
  drawCamerasAndLasers(ctx, game, time);
  drawGuards(ctx, game);
  drawPlayer(ctx, game);
  drawHud(ctx, game);
  if (game.state === 'roomclear') drawRoomClear(ctx, game);
  if (game.state === 'caught') drawCaught(ctx, game);
  if (game.state === 'win') drawWin(ctx, game);
}
