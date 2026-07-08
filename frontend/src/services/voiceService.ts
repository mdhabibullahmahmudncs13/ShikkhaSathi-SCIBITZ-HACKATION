/**
 * Voice Service Client for ShikkhaSathi
 * Handles API communication for voice transcription and synthesis
 */

import apiClient from './apiClient';
import {
  TranscriptionRequest,
  TranscriptionResponse,
  SynthesisRequest,
  SynthesisResponse,
  VoiceCapabilities,
  VoiceError,
  VoiceErrorType,
  AudioProcessingOptions
} from '../types/voice';

class VoiceService {
  private readonly maxRetries = 3;
  private readonly timeoutMs = 30000; // 30 seconds
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Convert speech to text using the backend transcription service
   */
  async transcribeAudio(
    audioBlob: Blob,
    language: 'bn' | 'en' | 'auto' = 'auto'
  ): Promise<TranscriptionResponse> {
    try {
      // Validate audio file size
      if (audioBlob.size > this.maxFileSize) {
        throw new Error(`Audio file too large: ${audioBlob.size} bytes (max: ${this.maxFileSize})`);
      }

      // Create form data for file upload
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      formData.append('language', language);

      // Make API request with retry logic
      const response = await this.withRetry(async () => {
        return await apiClient.post('/voice/transcribe', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: this.timeoutMs,
        });
      });

      return response.data as TranscriptionResponse;
    } catch (error) {
      console.error('Transcription error:', error);
      return this.handleTranscriptionError(error);
    }
  }

  /**
   * Convert text to speech using the backend synthesis service
   */
  async synthesizeText(
    text: string,
    language: 'bn' | 'en' = 'en',
    voiceId?: string
  ): Promise<SynthesisResponse> {
    try {
      // Validate text length
      if (!text.trim()) {
        throw new Error('Text cannot be empty');
      }

      if (text.length > 5000) {
        throw new Error('Text too long (max 5000 characters)');
      }

      const request: SynthesisRequest = {
        text: text.trim(),
        language,
        voiceId
      };

      // Use test endpoint for now (no auth required)
      const response = await this.withRetry(async () => {
        return await apiClient.post('/voice/test-synthesize', request, {
          timeout: this.timeoutMs,
        });
      });

      return response.data as SynthesisResponse;
    } catch (error) {
      console.error('Synthesis error:', error);
      return this.handleSynthesisError(error);
    }
  }

  /**
   * Get audio file URL for playback
   */
  getAudioUrl(audioId: string): string {
    return `${apiClient.defaults.baseURL}/voice/test-audio/${audioId}`;
  }

  /**
   * Get voice service capabilities
   */
  async getCapabilities(): Promise<VoiceCapabilities | null> {
    try {
      const response = await apiClient.get('/voice/capabilities');
      return response.data as VoiceCapabilities;
    } catch (error) {
      console.error('Failed to get voice capabilities:', error);
      return null;
    }
  }

  /**
   * Check if voice services are available
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      // Test with a simple synthesis request
      const testResponse = await this.synthesizeText('test', 'en');
      return testResponse.success;
    } catch (error) {
      console.error('Voice service availability check failed:', error);
      return false;
    }
  }

  /**
   * Process audio blob for optimal API transmission
   */
  async processAudioBlob(
    audioBlob: Blob,
    _options: AudioProcessingOptions = {}
  ): Promise<Blob> {
    try {
      // For now, return the blob as-is
      // In the future, we could add compression, format conversion, etc.
      return audioBlob;
    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  /**
   * Convert audio blob to different format if needed
   */
  async convertAudioFormat(
    audioBlob: Blob,
    _targetFormat: 'wav' | 'mp3' | 'webm' = 'wav'
  ): Promise<Blob> {
    // For now, return the original blob
    // Future implementation could use Web Audio API for format conversion
    return audioBlob;
  }

  /**
   * Retry wrapper for API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Retrying operation, ${retries} attempts remaining`);
        await this.delay(1000); // Wait 1 second before retry
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    
    if (error.response?.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Handle transcription errors
   */
  private handleTranscriptionError(error: any): TranscriptionResponse {
    let errorMessage = 'Failed to transcribe audio';
    
    if (error.response?.status === 413) {
      errorMessage = 'Audio file too large';
    } else if (error.response?.status === 415) {
      errorMessage = 'Unsupported audio format';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection failed';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Handle synthesis errors
   */
  private handleSynthesisError(error: any): SynthesisResponse {
    let errorMessage = 'Failed to synthesize speech';
    
    if (error.response?.status === 400) {
      errorMessage = 'Invalid text input';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection failed';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a VoiceError object
   */
  createError(type: VoiceErrorType, message: string, details?: any): VoiceError {
    return {
      type,
      message,
      details,
      timestamp: new Date()
    };
  }

  /**
   * Check browser support for voice features
   */
  checkBrowserSupport() {
    return {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      audioPlayback: typeof Audio !== 'undefined',
      fileDownload: typeof document.createElement('a').download !== 'undefined'
    };
  }

  /**
   * Get supported audio MIME types for recording
   */
  getSupportedMimeTypes(): string[] {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
export default voiceService;