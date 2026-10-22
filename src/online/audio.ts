/** Quiet original procedural effects. No network audio, autoplay loop, or third-party recordings. */
export class CafeAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private brew?: AudioBufferSourceNode;
  private muted = false;
  private stepAt = 0;
  constructor(private button: HTMLButtonElement) {
    try {
      this.muted = localStorage.getItem("miaw-sound") === "off";
    } catch {}
    button.onclick = () => {
      this.muted = !this.muted;
      this.unlock();
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
      try {
        localStorage.setItem("miaw-sound", this.muted ? "off" : "on");
      } catch {}
      this.label();
    };
    this.label();
  }
  private label() {
    this.button.textContent = this.muted ? "Sound off" : "Sound on";
    this.button.setAttribute("aria-pressed", String(this.muted));
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.22;
        this.master.connect(this.context.destination);
      }
      void this.context.resume();
    } catch {
      this.button.textContent = "Sound unavailable";
      this.button.disabled = true;
    }
  }
  private note(frequency: number, duration: number, volume = 0.1, delay = 0) {
    if (!this.context || !this.master || this.muted) return;
    const t = this.context.currentTime + delay,
      osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  coin() {
    this.note(660, 0.18, 0.09);
    this.note(880, 0.25, 0.08, 0.08);
  }
  cat() {
    this.note(370, 0.32, 0.08);
    this.note(480, 0.26, 0.06, 0.13);
  }
  step(moving: boolean) {
    if (moving && performance.now() - this.stepAt > 340) {
      this.stepAt = performance.now();
      this.note(100, 0.055, 0.06);
    }
  }
  brewing(active: boolean) {
    if (!active) {
      this.brew?.stop();
      this.brew = undefined;
      return;
    }
    if (this.brew || !this.context || !this.master) return;
    const context = this.context,
      buffer = context.createBuffer(1, context.sampleRate, context.sampleRate),
      data = buffer.getChannelData(0);
    let n = 7;
    for (let i = 0; i < data.length; i++) {
      n = (Math.imul(n, 1664525) + 1013904223) | 0;
      data[i] = (n / 2147483648) * 0.11;
    }
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 1300;
    source.connect(filter);
    filter.connect(this.master);
    source.start();
    this.brew = source;
  }
  dispose() {
    this.brewing(false);
    void this.context?.close();
  }
}
