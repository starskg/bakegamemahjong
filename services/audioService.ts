class AudioService {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Music State
  private isMusicPlaying: boolean = false;
  private bgMusicBuffer: AudioBuffer | null = null;
  private bgMusicSource: AudioBufferSourceNode | null = null;
  private isFileLoaded: boolean = false;

  // SFX File States
  private matchBuffer: AudioBuffer | null = null;
  private isMatchFileLoaded: boolean = false;
  
  private loseBuffer: AudioBuffer | null = null;
  private isLoseFileLoaded: boolean = false;

  // Default volumes
  private _musicVolume: number = 0.3;
  private _sfxVolume: number = 0.5;

  constructor() {
    // Context is initialized on user interaction
  }

  private init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Music Pipeline
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = this._musicVolume;
      this.musicGain.connect(this.context.destination);

      // SFX Pipeline
      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setMusicVolume(vol: number) {
    this._musicVolume = vol;
    if (this.musicGain && this.context) {
      this.musicGain.gain.setTargetAtTime(vol, this.context.currentTime, 0.1);
    }
  }

  setSfxVolume(vol: number) {
    this._sfxVolume = vol;
    if (this.sfxGain && this.context) {
      this.sfxGain.gain.setTargetAtTime(vol, this.context.currentTime, 0.1);
    }
  }

  async startMusic() {
    this.init();
    if (this.isMusicPlaying) return;

    // Load buffer if not already loaded
    if (!this.isFileLoaded && this.context) {
        try {
            // Attempt to load the background music file provided by the user
            const response = await fetch('/background.mp3');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.bgMusicBuffer = await this.context.decodeAudioData(arrayBuffer);
                this.isFileLoaded = true;
            } else {
                console.warn("background.mp3 not found. Music will be silent.");
            }
        } catch (error) {
            console.error("Error loading background music:", error);
        }
    }

    if (this.bgMusicBuffer && this.context && this.musicGain) {
        // Stop any existing source just in case
        this.stopMusicSource();

        this.bgMusicSource = this.context.createBufferSource();
        this.bgMusicSource.buffer = this.bgMusicBuffer;
        this.bgMusicSource.loop = true;
        this.bgMusicSource.connect(this.musicGain);
        this.bgMusicSource.start(0);
        this.isMusicPlaying = true;
    }
  }

  private stopMusicSource() {
    if (this.bgMusicSource) {
        try { 
          this.bgMusicSource.stop(); 
        } catch(e) {}
        this.bgMusicSource.disconnect();
        this.bgMusicSource = null;
    }
  }

  stopMusic() {
    this.isMusicPlaying = false;
    this.stopMusicSource();
  }

  // --- Sound Effects ---

  playHover() {
    // Very light stone friction sound
    this.init();
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    // Noise buffer for friction texture
    const bufferSize = this.context.sampleRate * 0.05; // 50ms short burst
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    // High pass filter to make it sound like light stone scrape
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start(now);
  }

  // "Shrq" etgan ko'tarilish ovozi
  playLift() {
    this.init();
    if (!this.context || !this.sfxGain) return;
    
    const now = this.context.currentTime;
    
    // Create white noise
    const bufferSize = this.context.sampleRate * 0.15; // 150ms
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    // Bandpass filter to make it sound like "Swish/Clack"
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(2500, now + 0.1); // Pitch goes up
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start(now);
  }

  playClick() {
    // Standard wood click (kept for UI buttons)
    this.init();
    if (!this.context || !this.sfxGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, this.context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.15);
  }

  async playMatch() {
    this.init();
    if (!this.context || !this.sfxGain) return;

    // Try to load explosion.mp3 if not already loaded or checked
    if (!this.matchBuffer && !this.isMatchFileLoaded) {
        this.isMatchFileLoaded = true; // Mark as checked so we don't fetch repeatedly on failure
        try {
            const response = await fetch('/explosion.mp3');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.matchBuffer = await this.context.decodeAudioData(arrayBuffer);
            } else {
                console.warn("explosion.mp3 not found, using fallback synthesis.");
            }
        } catch (error) {
            console.error("Error loading explosion.mp3:", error);
        }
    }

    if (this.matchBuffer) {
        // Play the file
        const source = this.context.createBufferSource();
        source.buffer = this.matchBuffer;
        source.connect(this.sfxGain);
        source.start(0);
    } else {
        // Fallback: Synthesized cracking sound
        const now = this.context.currentTime;

        const createCrack = (timeOffset: number, vol: number, pitch: number) => {
            if (!this.context || !this.sfxGain) return;
            
            const bufferSize = this.context.sampleRate * 0.1;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = pitch;
            
            const gain = this.context.createGain();
            gain.gain.setValueAtTime(vol, now + timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.08);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now + timeOffset);
        };

        createCrack(0, 0.6, 2000);
        createCrack(0.05, 0.4, 3000);
        createCrack(0.1, 0.3, 1500);

        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        
        const oscGain = this.context.createGain();
        oscGain.gain.setValueAtTime(0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }
  }

  async playLose() {
    this.init();
    if (!this.context || !this.sfxGain) return;

    if (!this.loseBuffer && !this.isLoseFileLoaded) {
      this.isLoseFileLoaded = true;
      try {
        const response = await fetch('/lose.mp3');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          this.loseBuffer = await this.context.decodeAudioData(arrayBuffer);
        } else {
          console.warn("lose.mp3 not found, using fallback.");
        }
      } catch (error) {
        console.error("Error loading lose.mp3:", error);
      }
    }

    if (this.loseBuffer) {
      const source = this.context.createBufferSource();
      source.buffer = this.loseBuffer;
      source.connect(this.sfxGain);
      source.start(0);
    } else {
       // Fallback sad sound
       const now = this.context.currentTime;
       const osc = this.context.createOscillator();
       const gain = this.context.createGain();
       
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(400, now);
       osc.frequency.linearRampToValueAtTime(100, now + 1);
       
       gain.gain.setValueAtTime(0.3, now);
       gain.gain.linearRampToValueAtTime(0, now + 1);
       
       osc.connect(gain);
       gain.connect(this.sfxGain);
       osc.start(now);
       osc.stop(now + 1);
    }
  }

  playShuffle() {
    this.init();
    if (!this.context || !this.sfxGain) return;
    
    const now = this.context.currentTime;
    for(let i=0; i<6; i++) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.frequency.value = 300 + Math.random() * 300;
        gain.gain.setValueAtTime(0, now + i*0.03);
        gain.gain.linearRampToValueAtTime(0.15, now + i*0.03 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i*0.03 + 0.1);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i*0.03);
        osc.stop(now + i*0.03 + 0.15);
    }
  }

  playWin() {
    this.init();
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const notes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 2.0);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startTime);
      osc.stop(startTime + 2.5);
    });
  }

  playUndo() {
    this.init();
    if (!this.context || !this.sfxGain) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.context.currentTime);
    osc.frequency.linearRampToValueAtTime(400, this.context.currentTime + 0.15);
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }

  playHint() {
    this.init();
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    [880, 1100, 1320, 1760].forEach((freq, i) => {
        const osc = this.context!.createOscillator();
        const gain = this.context!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i*0.1);
        gain.gain.linearRampToValueAtTime(0.1, now + i*0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i*0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + i*0.1);
        osc.stop(now + i*0.1 + 0.5);
    });
  }
}

export const audioService = new AudioService();