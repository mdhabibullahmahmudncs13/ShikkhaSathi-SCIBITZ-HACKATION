/**
 * Audio processing utilities for voice functionality
 * Handles audio recording, processing, and playback operations
 */

import { VoiceError, VoiceErrorType } from '../types/voice';

/**
 * Audio recorder class for handling microphone input
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  /**
   * Initialize audio recording
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone permission
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Set up audio context for visualization
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Set up MediaRecorder
      const mimeType = this.getBestMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      throw this.createAudioError(VoiceErrorType.MICROPHONE_PERMISSION_DENIED, 'Microphone access denied');
    }
  }

  /**
   * Start recording audio
   */
  startRecording(): void {
    if (!this.mediaRecorder) {
      throw this.createAudioError(VoiceErrorType.RECORDING_FAILED, 'Recorder not initialized');
    }

    this.audioChunks = [];
    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(this.createAudioError(VoiceErrorType.RECORDING_FAILED, 'Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (_event) => {
        reject(this.createAudioError(VoiceErrorType.RECORDING_FAILED, 'Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current audio level for visualization
   */
  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    
    return sum / this.dataArray.length / 255; // Normalize to 0-1
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.dataArray = null;
    this.audioChunks = [];
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Create audio-specific error
   */
  private createAudioError(type: VoiceErrorType, message: string): VoiceError {
    return {
      type,
      message,
      timestamp: new Date()
    };
  }
}

/**
 * Audio player class for handling playback
 */
export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  /**
   * Load audio from URL
   */
  async loadAudio(audioUrl: string): Promise<void> {
    try {
      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      
      // Set up audio context for visualization
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        this.audio!.oncanplaythrough = resolve;
        this.audio!.onerror = reject;
        this.audio!.load();
      });

    } catch (error) {
      console.error('Failed to load audio:', error);
      throw this.createAudioError(VoiceErrorType.PLAYBACK_FAILED, 'Failed to load audio');
    }
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    if (!this.audio) {
      throw this.createAudioError(VoiceErrorType.PLAYBACK_FAILED, 'Audio not loaded');
    }

    try {
      await this.audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw this.createAudioError(VoiceErrorType.PLAYBACK_FAILED, 'Playback failed');
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Stop audio
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current playback progress (0-1)
   */
  getProgress(): number {
    if (!this.audio || !this.audio.duration) {
      return 0;
    }
    return this.audio.currentTime / this.audio.duration;
  }

  /**
   * Get current playback time in seconds
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  /**
   * Get total duration in seconds
   */
  getDuration(): number {
    return this.audio?.duration || 0;
  }

  /**
   * Check if audio is playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused && !this.audio.ended : false;
  }

  /**
   * Add event listeners
   */
  addEventListener(event: string, handler: EventListener): void {
    if (this.audio) {
      this.audio.addEventListener(event, handler);
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListener(event: string, handler: EventListener): void {
    if (this.audio) {
      this.audio.removeEventListener(event, handler);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.source = null;
    this.analyser = null;
  }

  /**
   * Create audio-specific error
   */
  private createAudioError(type: VoiceErrorType, message: string): VoiceError {
    return {
      type,
      message,
      timestamp: new Date()
    };
  }
}

/**
 * Utility functions for audio processing
 */

/**
 * Convert audio blob to base64 string
 */
export function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}

/**
 * Get audio duration from blob
 */
export function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    };
    
    audio.src = url;
  });
}

/**
 * Check if browser supports audio recording
 */
export function checkAudioSupport() {
  return {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    audioPlayback: typeof Audio !== 'undefined'
  };
}

/**
 * Format duration in MM:SS format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Download audio blob as file
 */
export function downloadAudio(audioBlob: Blob, filename: string = 'audio.wav'): void {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}