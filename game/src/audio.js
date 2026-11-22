// audio.js — all sound is synthesised with WebAudio. No audio files, no network.
// Footsteps, coin clinks, lockpick clicks, alarm, ambient hum and stings.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
    this.alarmNodes = null;
    this.stepTimer = 0;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseBurst(dur, vol, filterFreq, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  footstep(sneaking) {
    this.noiseBurst(0.07, sneaking ? 0.05 : 0.12, sneaking ? 300 : 700);
  }

  coinThrow() {
    this.noiseBurst(0.12, 0.08, 2400);
  }

  coinClink() {
    this.tone(2093, 0.18, 'sine', 0.16);
    this.tone(2637, 0.28, 'sine', 0.12, 0.07);
    this.tone(1568, 0.12, 'sine', 0.08, 0.02);
  }

  lockpickClick() {
    this.tone(1200, 0.05, 'square', 0.07);
    this.noiseBurst(0.03, 0.06, 3200);
  }

  lockpickDone() {
    this.tone(660, 0.12, 'triangle', 0.14);
    this.tone(990, 0.2, 'triangle', 0.14, 0.1);
  }

  lootTaken() {
    // Success sting: rising arpeggio.
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, i * 0.09));
  }

  roomClear() {
    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.15, i * 0.11));
  }

  caughtSting() {
    this.tone(220, 0.5, 'sawtooth', 0.16, 0, 110);
    this.tone(233, 0.5, 'sawtooth', 0.14, 0.05, 116);
  }

  suspiciousBlip() {
    this.tone(880, 0.12, 'sine', 0.1, 0, 1174);
  }

  alertBlip() {
    this.tone(1174, 0.16, 'square', 0.09);
    this.tone(1174, 0.16, 'square', 0.09, 0.2);
  }

  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    lfo.start();
    this.ambientNodes = { osc, lfo };
  }

  // Call every frame with the current alarm level (0..100).
  updateAlarm(alarm) {
    if (!this.ctx) return;
    const want = alarm > 55;
    if (want && !this.alarmNodes) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 620;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 1.6;
      const lg = this.ctx.createGain();
      lg.gain.value = 260;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      const g = this.ctx.createGain();
      g.gain.value = 0.045;
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      lfo.start();
      this.alarmNodes = { osc, lfo, g };
    } else if (!want && this.alarmNodes) {
      const { osc, lfo, g } = this.alarmNodes;
      try { g.gain.setTargetAtTime(0, this.now(), 0.1); osc.stop(this.now() + 0.5); lfo.stop(this.now() + 0.5); } catch (e) { /* already stopped */ }
      this.alarmNodes = null;
    }
  }
}
