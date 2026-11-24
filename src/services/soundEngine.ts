class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playPinDrop(): void {
    this.playTone(520, 0.08, 'triangle', 0.07, 0);
    this.playTone(760, 0.11, 'sine', 0.06, 0.045);
  }

  public playPurchase(): void {
    this.playTone(440, 0.1, 'triangle', 0.08, 0);
    this.playTone(554.37, 0.11, 'triangle', 0.08, 0.07);
    this.playTone(659.25, 0.18, 'sine', 0.09, 0.14);
  }

  public playCashCollect(): void {
    this.playTone(880, 0.08, 'sine', 0.07, 0);
    this.playTone(1174.66, 0.14, 'sine', 0.08, 0.06);
  }

  public playUpgrade(): void {
    this.playTone(523.25, 0.09, 'triangle', 0.07, 0);
    this.playTone(659.25, 0.09, 'triangle', 0.07, 0.06);
    this.playTone(783.99, 0.1, 'triangle', 0.08, 0.12);
    this.playTone(1046.5, 0.2, 'sine', 0.09, 0.18);
  }

  public playNotification(): void {
    this.playTone(698.46, 0.09, 'sine', 0.05, 0);
    this.playTone(932.33, 0.14, 'sine', 0.05, 0.08);
  }

  public playClick(): void {
    this.playTone(600, 0.04, 'sine', 0.035, 0);
  }
}

export const soundEngine = new ProceduralSoundEngine();
