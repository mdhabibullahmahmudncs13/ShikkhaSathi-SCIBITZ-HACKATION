/**
 * Custom hook for managing voice input/output functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { voiceService } from '../services/voiceService';
import {
  VoiceState,
  VoiceSettings,
  TranscriptionResponse,
  SynthesisResponse
} from '../types/voice';

const DEFAULT_SETTINGS: VoiceSettings = {
  inputEnabled: false,
  outputEnabled: false,
  language: 'auto',
  playbackSpeed: 1,
  autoPlay: true,
  showVisualizer: true,
  microphoneGain: 1
};

export const useVoice = () => {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    audioLevel: 0,
    recordingDuration: 0,
    isPlaying: false,
    currentAudio: null,
    playbackProgress: 0,
    voiceInputEnabled: false,
    voiceOutputEnabled: false,
    selectedLanguage: 'auto',
    playbackSpeed: 1,
    isProcessing: false,
    lastError: null,
    serviceAvailable: true
  });

  const [settings, setSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    setState(prev => ({
      ...prev,
      voiceInputEnabled: settings.inputEnabled,
      voiceOutputEnabled: settings.outputEnabled,
      selectedLanguage: settings.language,
      playbackSpeed: settings.playbackSpeed
    }));
  }, [settings]);

  // Check service availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await voiceService.checkServiceAvailability();
      setState(prev => ({ ...prev, serviceAvailable: available }));
    };
    checkAvailability();
  }, []);

  const updateSettings = useCallback((updates: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('voiceSettings');
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, lastError: error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<TranscriptionResponse> => {
    setState(prev => ({ ...prev, isProcessing: true, lastError: null }));
    
    try {
      const response = await voiceService.transcribeAudio(
        audioBlob,
        settings.language
      );
      
      if (!response.success) {
        setError(response.error || 'Transcription failed');
      }
      
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Transcription failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [settings.language, setError]);

  const synthesizeText = useCallback(async (text: string): Promise<SynthesisResponse> => {
    setState(prev => ({ ...prev, isProcessing: true, lastError: null }));
    
    try {
      const language = settings.language === 'auto' ? 'en' : settings.language;
      const response = await voiceService.synthesizeText(text, language);
      
      if (!response.success) {
        setError(response.error || 'Synthesis failed');
      } else if (response.audioId) {
        setState(prev => ({ 
          ...prev, 
          currentAudio: voiceService.getAudioUrl(response.audioId!)
        }));
      }
      
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Synthesis failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [settings.language, setError]);

  const toggleInput = useCallback((enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !settings.inputEnabled;
    updateSettings({ inputEnabled: newValue });
  }, [settings.inputEnabled, updateSettings]);

  const toggleOutput = useCallback((enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !settings.outputEnabled;
    updateSettings({ outputEnabled: newValue });
  }, [settings.outputEnabled, updateSettings]);

  const changeLanguage = useCallback((language: 'bn' | 'en' | 'auto') => {
    updateSettings({ language });
  }, [updateSettings]);

  return {
    state,
    settings,
    updateSettings,
    resetSettings,
    transcribeAudio,
    synthesizeText,
    toggleInput,
    toggleOutput,
    changeLanguage,
    clearError
  };
};
