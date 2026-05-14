export class AudioEngine {
  private static instance: AudioEngine;
  
  public context: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: Uint8Array | null = null;
  public source: MediaStreamAudioSourceNode | null = null;
  
  // Expose analyzed data for Three.js to read synchronously without React state overhead
  public current = {
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
  };

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public isSimulating: boolean = false;
  private simTime: number = 0;

  public async initialize(): Promise<void> {
    if (this.context) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.context.resume();
      
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isSimulating = false;
    } catch (err) {
      console.warn('Failed to initialize audio capture. Falling back to simulated audio:', err);
      this.isSimulating = true;
      // We don't throw error so the app can continue
    }
  }

  public update(gain: number = 1.0): void {
    if (this.isSimulating) {
      this.simTime += 0.016;
      // Simulate beat
      const beat = Math.pow(Math.sin(this.simTime * 4), 2);
      this.current.volume = (0.2 + beat * 0.3) * gain;
      this.current.bass = beat * 0.8 * gain;
      this.current.mid = (Math.sin(this.simTime * 2) * 0.2 + 0.3) * gain;
      this.current.treble = (Math.sin(this.simTime * 8) * 0.1 + 0.2) * gain;
      return;
    }

    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    let sum = 0;
    let bSum = 0;
    let mSum = 0;
    let tSum = 0;

    const length = this.dataArray.length;
    const bassEnd = Math.floor(length * 0.1);
    const midEnd = Math.floor(length * 0.5);

    for (let i = 0; i < length; i++) {
      const value = this.dataArray[i];
      sum += value;
      
      if (i < bassEnd) {
        bSum += value;
      } else if (i < midEnd) {
        mSum += value;
      } else {
        tSum += value;
      }
    }

    // Normalize and apply generic gain
    this.current.volume = (sum / length / 255) * gain;
    this.current.bass = (bSum / bassEnd / 255) * gain;
    this.current.mid = (mSum / (midEnd - bassEnd) / 255) * gain;
    this.current.treble = (tSum / (length - midEnd) / 255) * gain;
  }

  public destroy() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.context?.close();
    this.context = null;
  }
}

export const audioEngine = AudioEngine.getInstance();
