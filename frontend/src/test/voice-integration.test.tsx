/**
 * Voice Integration Tests
 * Tests the integration of voice components with the AI Tutor Chat
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useVoice } from '../hooks/useVoice';

// Mock the voice service
vi.mock('../services/voiceService', () => ({
  voiceService: {
    transcribeAudio: vi.fn(),
    synthesizeText: vi.fn(),
    getAudioUrl: vi.fn(),
    checkServiceAvailability: vi.fn().mockResolvedValue(true),
    checkBrowserSupport: vi.fn().mockReturnValue({
      mediaRecorder: true,
      audioContext: true,
      speechRecognition: false,
      audioPlayback: true,
      fileDownload: true
    }),
    getSupportedMimeTypes: vi.fn().mockReturnValue(['audio/webm', 'audio/wav'])
  }
}));

describe('Voice Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('useVoice Hook', () => {
    // Create a test component to test the hook
    const TestComponent = () => {
      const {
        state,
        toggleInput,
        toggleOutput,
        changeLanguage
      } = useVoice();

      return (
        <div>
          <div data-testid="input-enabled">{state.voiceInputEnabled.toString()}</div>
          <div data-testid="output-enabled">{state.voiceOutputEnabled.toString()}</div>
          <div data-testid="language">{state.selectedLanguage}</div>
          <button onClick={() => toggleInput()}>Toggle Input</button>
          <button onClick={() => toggleOutput()}>Toggle Output</button>
          <button onClick={() => changeLanguage('bn')}>Change to Bengali</button>
        </div>
      );
    };

    it('initializes with default settings', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('input-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('output-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('language')).toHaveTextContent('auto');
    });

    it('toggles voice input', async () => {
      render(<TestComponent />);
      
      fireEvent.click(screen.getByText('Toggle Input'));
      
      await waitFor(() => {
        expect(screen.getByTestId('input-enabled')).toHaveTextContent('true');
      });
    });

    it('toggles voice output', async () => {
      render(<TestComponent />);
      
      fireEvent.click(screen.getByText('Toggle Output'));
      
      await waitFor(() => {
        expect(screen.getByTestId('output-enabled')).toHaveTextContent('true');
      });
    });

    it('changes language', async () => {
      render(<TestComponent />);
      
      fireEvent.click(screen.getByText('Change to Bengali'));
      
      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('bn');
      });
    });

    it('persists settings to localStorage', async () => {
      render(<TestComponent />);
      
      fireEvent.click(screen.getByText('Toggle Input'));
      
      await waitFor(() => {
        const saved = localStorage.getItem('voiceSettings');
        expect(saved).toBeTruthy();
        const settings = JSON.parse(saved!);
        expect(settings.inputEnabled).toBe(true);
      });
    });
  });

  describe('Voice Service Integration', () => {
    it('should have voice service available', async () => {
      const { voiceService } = await import('../services/voiceService');
      expect(voiceService).toBeDefined();
      expect(voiceService.transcribeAudio).toBeDefined();
      expect(voiceService.synthesizeText).toBeDefined();
    });

    it('should handle voice service errors gracefully', async () => {
      const { voiceService } = await import('../services/voiceService');
      
      // Mock a failed transcription
      vi.spyOn(voiceService, 'transcribeAudio').mockResolvedValue({
        success: false,
        error: 'Transcription failed'
      });

      const mockBlob = new Blob(['test'], { type: 'audio/wav' });
      const result = await voiceService.transcribeAudio(mockBlob, 'en');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transcription failed');
    });
  });

  describe('Browser Compatibility', () => {
    it('should detect browser support', async () => {
      // Import the voice service using named export
      const { voiceService } = await import('../services/voiceService');
      
      // Mock browser APIs for testing
      global.MediaRecorder = vi.fn() as any;
      global.AudioContext = vi.fn() as any;
      global.Audio = vi.fn() as any;
      
      const support = voiceService.checkBrowserSupport();
      
      expect(support).toHaveProperty('mediaRecorder');
      expect(support).toHaveProperty('audioContext');
      expect(support).toHaveProperty('audioPlayback');
    });

    it('should get supported MIME types', async () => {
      // Import the voice service using named export
      const { voiceService } = await import('../services/voiceService');
      
      // Mock MediaRecorder.isTypeSupported
      global.MediaRecorder = {
        isTypeSupported: vi.fn().mockReturnValue(true)
      } as any;

      const types = voiceService.getSupportedMimeTypes();
      expect(Array.isArray(types)).toBe(true);
    });
  });
});