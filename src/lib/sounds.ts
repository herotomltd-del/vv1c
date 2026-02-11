class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (this.isMuted || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playBet() {
    this.playTone(400, 0.1, 'sine', 0.2);
  }

  playSpin() {
    if (this.isMuted || !this.audioContext) return;

    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.playTone(200 + i * 50, 0.05, 'square', 0.1);
      }, i * 50);
    }
  }

  playWin() {
    if (this.isMuted || !this.audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.3);
      }, i * 100);
    });
  }

  playBigWin() {
    if (this.isMuted || !this.audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.4);
      }, i * 80);
    });

    setTimeout(() => {
      this.playTone(1046.50, 0.5, 'sine', 0.3);
    }, 500);
  }

  playLose() {
    if (this.isMuted || !this.audioContext) return;

    const notes = [400, 350, 300, 250];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.2);
      }, i * 100);
    });
  }

  playCashout() {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(1000, 0.1, 'sine', 0.3);
    setTimeout(() => {
      this.playTone(1200, 0.15, 'sine', 0.3);
    }, 100);
  }

  playClick() {
    this.playTone(800, 0.05, 'sine', 0.15);
  }

  playCrash() {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(100, 0.3, 'sawtooth', 0.3);
  }

  playCardFlip() {
    this.playTone(600, 0.08, 'square', 0.2);
  }

  playDrop() {
    if (this.isMuted || !this.audioContext) return;

    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playTone(800 - i * 80, 0.05, 'sine', 0.15);
      }, i * 40);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  isSoundMuted() {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
