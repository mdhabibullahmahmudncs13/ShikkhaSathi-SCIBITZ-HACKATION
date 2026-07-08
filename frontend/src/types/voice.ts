/**
 * Voice-related TypeScript interfaces and types for ShikkhaSathi
 * Supports Bengali and English voice input/output functionality
 */

// Core voice state management
export interface VoiceState {
  // Recording state
  isRecording: boolean;
  audioLevel: number;
  recordingDuration: number;
  
  // Playback state
  isPlaying: boolean;
  currentAudio: string | null;
  playbackProgress: number;
  
  // Settings
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  selectedLanguage: 'bn' | 'en' | 'auto';
  playbackSpeed: number;
  
  // Status
  isProcessing: boolean;
  lastError: string | null;
  serviceAvailable: boolean;
}

// Voice message representation
export interface VoiceMessage {
  id: string;
  type: 'voice_input' | 'voice_output';
  text: string;
  audioUrl?: string;
  language: 'bn' | 'en';
  duration?: number;
  timestamp: Date;
  status: 'processing' | 'ready' | 'error';
}

// User voice preferences
export interface VoiceSettings {
  inputEnabled: boolean;
  outputEnabled: boolean;
  language: 'bn' | 'en' | 'auto';
  playbackSpeed: number;
  autoPlay: boolean;
  showVisualizer: boolean;
  microphoneGain: number;
}

// API request/response types
export interface TranscriptionRequest {
  audioBlob: Blob;
  language: 'bn' | 'en' | 'auto';
}

export interface TranscriptionResponse {
  success: boolean;
  text?: string;
  language?: string;
  confidence?: number;
  error?: string;
}

export interface SynthesisRequest {
  text: string;
  language: 'bn' | 'en';
  voiceId?: string;
}

export interface SynthesisResponse {
  success: boolean;
  audioUrl?: string;
  audioId?: string;
  fallback?: boolean;
  message?: string;
  error?: string;
}

// Voice capabilities from backend
export interface VoiceCapabilities {
  supportedLanguages: Record<string, string>;
  availableVoices: Record<string, string>;
  features: string[];
}

// Error types
export enum VoiceErrorType {
  MICROPHONE_PERMISSION_DENIED = 'microphone_permission_denied',
  RECORDING_FAILED = 'recording_failed',
  TRANSCRIPTION_FAILED = 'transcription_failed',
  SYNTHESIS_FAILED = 'synthesis_failed',
  PLAYBACK_FAILED = 'playback_failed',
  NETWORK_ERROR = 'network_error',
  UNSUPPORTED_BROWSER = 'unsupported_browser',
  SERVICE_UNAVAILABLE = 'service_unavailable'
}

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

// Status enums
export enum RecordingStatus {
  IDLE = 'idle',
  REQUESTING_PERMISSION = 'requesting_permission',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export enum PlaybackStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ERROR = 'error'
}

// Component prop interfaces
export interface VoiceInputButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  isEnabled: boolean;
  className?: string;
}

export interface VoiceRecorderProps {
  onAudioReady: (audioBlob: Blob) => void;
  onError: (error: VoiceError) => void;
  language: 'bn' | 'en' | 'auto';
  maxDuration?: number;
}

export interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  type: 'recording' | 'playback';
  className?: string;
}

export interface VoicePlayerProps {
  audioUrl: string;
  onPlayStateChange: (isPlaying: boolean) => void;
  onProgress: (progress: number) => void;
  autoPlay?: boolean;
  showControls?: boolean;
}

export interface VoiceControlsProps {
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  selectedLanguage: 'bn' | 'en' | 'auto';
  onToggleInput: (enabled: boolean) => void;
  onToggleOutput: (enabled: boolean) => void;
  onLanguageChange: (language: 'bn' | 'en' | 'auto') => void;
}

export interface VoiceStatusProps {
  isProcessing: boolean;
  error: VoiceError | null;
  serviceAvailable: boolean;
  onRetry?: () => void;
  onDismissError?: () => void;
}

// Utility types
export type SupportedLanguage = 'bn' | 'en';
export type LanguageOption = SupportedLanguage | 'auto';

export interface AudioProcessingOptions {
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  format?: 'wav' | 'mp3' | 'webm';
}

export interface VoiceAnalytics {
  inputUsage: number;
  outputUsage: number;
  languagePreference: Record<SupportedLanguage, number>;
  errorRate: number;
  averageResponseTime: number;
}

// Browser compatibility
export interface BrowserVoiceSupport {
  mediaRecorder: boolean;
  audioContext: boolean;
  speechRecognition: boolean;
  audioPlayback: boolean;
  fileDownload: boolean;
}

// Voice service configuration
export interface VoiceServiceConfig {
  apiBaseUrl: string;
  maxRecordingDuration: number;
  maxFileSize: number;
  retryAttempts: number;
  timeoutMs: number;
}

// Hook return types
export interface UseVoiceInputReturn {
  isRecording: boolean;
  audioLevel: number;
  duration: number;
  error: VoiceError | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearError: () => void;
}

export interface UseVoiceOutputReturn {
  isPlaying: boolean;
  progress: number;
  error: VoiceError | null;
  play: (audioUrl: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  clearError: () => void;
}

export interface UseVoiceSettingsReturn {
  settings: VoiceSettings;
  updateSettings: (updates: Partial<VoiceSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}