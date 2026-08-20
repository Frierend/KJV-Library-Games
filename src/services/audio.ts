class AudioCueService {
  private context: AudioContext | null = null;

  play(enabled: boolean, frequency = 760, duration = 0.1) {
    if (!enabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextClass) return;
      this.context ??= new AudioContextClass();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    } catch {
      // Sound is an optional enhancement and may be blocked by the browser.
    }
  }
}

export const audioCues = new AudioCueService();
