import React, { useState, useRef, useEffect } from 'react';
import { VoiceRecording } from '../../types/chat';
import VoiceRecorder from './VoiceRecorder';
import voiceService from '../../services/voiceService';

interface ChatInputProps {
  onSendMessage: (message: string, isVoice?: boolean) => void;
  isVoiceMode: boolean;
  onToggleVoiceMode: () => void;
  voiceRecording: VoiceRecording;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isVoiceMode,
  onToggleVoiceMode,
  voiceRecording: _voiceRecording,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      const result = await voiceService.transcribeAudio(audioBlob);
      
      if (result.text.trim()) {
        // Send the transcribed text as a voice message
        onSendMessage(result.text.trim(), true);
      } else {
        alert('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('Failed to transcribe audio. Please try again or switch to text mode.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4">
      {/* Voice mode interface */}
      {isVoiceMode ? (
        <div className="space-y-4">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            isRecording={isRecording}
            disabled={disabled || isTranscribing}
          />
          
          {/* Transcription status */}
          {isTranscribing && (
            <div className="flex items-center justify-center text-blue-500 text-sm">
              <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Transcribing audio...
            </div>
          )}
          
          {/* Switch to text mode button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleVoiceMode}
              disabled={disabled || isRecording || isTranscribing}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
            >
              Switch to text mode
            </button>
          </div>
        </div>
      ) : (
        /* Text mode interface */
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* Voice mode toggle */}
          <button
            type="button"
            onClick={onToggleVoiceMode}
            disabled={disabled}
            className={`p-2 rounded-full transition-colors ${
              disabled
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Switch to voice mode"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Text input area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              disabled={disabled}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              rows={1}
              maxLength={1000}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/1000
            </div>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className={`p-3 rounded-full transition-colors ${
              message.trim() && !disabled
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatInput;