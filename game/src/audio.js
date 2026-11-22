// audio.js — tiny synthesized sound effects.
//
// No audio files: every effect is an oscillator through a gain envelope,
// built on the first user gesture (browsers block audio before that).
// A soft bass pulse loops quietly while the alarm is up, so tension has a
// sound as well as a meter.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarmLoop();
    return this.muted;
  }

  blip(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Sound is garnish; a failure never breaks the game.
    }
  }

  pickup() {
    this.blip(880, 0.12, 'sine', 0.1);
    setTimeout(() => this.blip(1318, 0.16, 'sine', 0.1), 70);
  }

  mainLoot() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.12), i * 90));
  }

  coin() {
    this.blip(1567, 0.08, 'square', 0.05);
    setTimeout(() => this.blip(1567, 0.08, 'square', 0.04), 160);
  }

  smoke() {
    this.blip(220, 0.5, 'sine', 0.08, 90);
  }

  emp() {
    this.blip(1200, 0.4, 'sawtooth', 0.06, 120);
  }

  spotted() {
    this.blip(196, 0.28, 'sawtooth', 0.14, 392);
  }

  caught() {
    [392, 311, 233, 155].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.12), i * 140));
  }

  roomClear() {
    [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.12), i * 110));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'triangle', 0.12), i * 130));
  }

  startAlarmLoop() {
    if (!this.ctx || this.muted || this.alarmNodes) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 1.6;
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      lfo.start();
      this.alarmNodes = { osc, lfo, gain };
    } catch {
      this.alarmNodes = null;
    }
  }

  stopAlarmLoop() {
    if (!this.alarmNodes) return;
    try {
      this.alarmNodes.osc.stop();
      this.alarmNodes.lfo.stop();
    } catch {
      // Already stopped.
    }
    this.alarmNodes = null;
  }
}
