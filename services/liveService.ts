import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Language } from '../types';

// Audio helpers
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

class LiveService {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private currentLanguage: Language = 'ru';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public get isLive(): boolean {
    return this.isConnected;
  }

  public setLanguage(lang: Language) {
    this.currentLanguage = lang;
  }

  async connect(onStatusChange: (status: boolean) => void) {
    if (this.isConnected) return;

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine system instruction based on language
      const instructions = {
        uz: "Siz Vita Mahjong o'yinining quvnoq sharhlovchisisiz. O'yinchi yutganda yoki 'Combo' qilganda, juda qisqa, baland ovozda va xursand bo'lib maqtang: 'Zo'r!', 'Dahshat!', 'Qoyil!', 'Urra!'. O'yinchi bilan samimiy suhbatlashing. Agar o'yinchi yutqazsa, dalda bering.",
        ru: "Вы веселый комментатор игры Vita Mahjong. Когда игрок делает 'Combo' или побеждает, хвалите его очень коротко, громко и радостно: 'Супер!', 'Класс!', 'Отлично!', 'Молодец!'. Ведите дружескую беседу. Если игрок проигрывает, подбодрите.",
        en: "You are an energetic commentator for Vita Mahjong. When the player gets a 'Combo' or wins, praise them very shortly, loudly and happily with words like: 'Good!', 'Best!', 'Amazing!', 'Wow!'. Chat normally otherwise."
      };

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: instructions[this.currentLanguage] || instructions['ru'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            this.isConnected = true;
            onStatusChange(true);
            
            // Setup Mic Stream
            if (!this.inputAudioContext) return;
            const source = this.inputAudioContext.createMediaStreamSource(stream);
            const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16 for Gemini
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              
              const base64Data = arrayBufferToBase64(pcmData.buffer);
              
              sessionPromise.then(session => {
                 session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                 });
              });
            };
            
            source.connect(processor);
            processor.connect(this.inputAudioContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
                const audioData = base64ToUint8Array(base64Audio);
                
                // Decode raw PCM (1 channel, 24kHz)
                // We have to construct an AudioBuffer manually or use a workaround because 
                // native decodeAudioData expects headers (wav/mp3). 
                // Gemini sends raw PCM.
                
                // Convert Int16 bytes back to Float32
                const dataInt16 = new Int16Array(audioData.buffer);
                const float32Data = new Float32Array(dataInt16.length);
                for(let i=0; i<dataInt16.length; i++) {
                    float32Data[i] = dataInt16[i] / 32768.0;
                }

                const audioBuffer = this.outputAudioContext.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputAudioContext.destination);
                
                // Simple scheduling to avoid overlap glitching, though for live convo immediate is often okay
                const now = this.outputAudioContext.currentTime;
                const start = Math.max(now, this.nextStartTime);
                source.start(start);
                this.nextStartTime = start + audioBuffer.duration;
            }
          },
          onclose: () => {
             console.log("Gemini Live Closed");
             this.cleanup(onStatusChange);
          },
          onerror: (e) => {
             console.error("Gemini Live Error", e);
             this.cleanup(onStatusChange);
          }
        }
      });
      
      this.session = await sessionPromise;

    } catch (err) {
      console.error("Failed to connect to Live API", err);
      this.cleanup(onStatusChange);
    }
  }

  // Send a text event to the model (e.g., "User got a combo!")
  // The model will see this as user input and respond to it (Voice Output)
  sendGameEvent(text: string) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
        content: {
            role: 'user',
            parts: [{ text: text }]
        }
    });
  }

  async disconnect(onStatusChange: (status: boolean) => void) {
    if (this.session) {
        // There isn't a strict 'close' method on the session object in the SDK typings sometimes exposed, 
        // but typically we just drop references and stop contexts.
        // We will trigger cleanup.
    }
    this.cleanup(onStatusChange);
  }

  private cleanup(onStatusChange: (status: boolean) => void) {
    this.isConnected = false;
    onStatusChange(false);
    
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    this.session = null;
    this.nextStartTime = 0;
  }
}

export const liveService = new LiveService();
