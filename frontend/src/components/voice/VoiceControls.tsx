import React, { useState } from 'react';
import { Settings, Mic, Volume2, Globe, Info } from 'lucide-react';

interface VoiceControlsProps {
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  selectedLanguage: 'bn' | 'en' | 'auto';
  onToggleInput: (enabled: boolean) => void;
  onToggleOutput: (enabled: boolean) => void;
  onLanguageChange: (language: 'bn' | 'en' | 'auto') => void;
  serviceStatus?: {
    whisperAvailable: boolean;
    ttsAvailable: boolean;
    processing: boolean;
  };
  className?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  voiceInputEnabled,
  voiceOutputEnabled,
  selectedLanguage,
  onToggleInput,
  onToggleOutput,
  onLanguageChange,
  serviceStatus = {
    whisperAvailable: true,
    ttsAvailable: true,
    processing: false
  },
  className = ''
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const languages = [
    { code: 'auto' as const, name: 'Auto-detect', flag: '🌐' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'bn' as const, name: 'বাংলা', flag: '🇧🇩' }
  ];

  const getStatusColor = (available: boolean) => {
    return available ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = (available: boolean) => {
    return available ? 'Available' : 'Unavailable';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main controls */}
      <div className="flex items-center space-x-3">
        {/* Voice Input Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleInput(!voiceInputEnabled)}
            disabled={!serviceStatus.whisperAvailable || serviceStatus.processing}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all
              ${voiceInputEnabled 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-300 text-gray-600'
              }
              ${!serviceStatus.whisperAvailable || serviceStatus.processing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-100'
              }
            `}
            title={
              !serviceStatus.whisperAvailable 
                ? 'Voice input service unavailable' 
                : voiceInputEnabled 
                  ? 'Disable voice input' 
                  : 'Enable voice input'
            }
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Voice Input</span>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(serviceStatus.whisperAvailable)}`} />
          </button>
        </div>

        {/* Voice Output Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleOutput(!voiceOutputEnabled)}
            disabled={!serviceStatus.ttsAvailable || serviceStatus.processing}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all
              ${voiceOutputEnabled 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-300 text-gray-600'
              }
              ${!serviceStatus.ttsAvailable || serviceStatus.processing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-green-100'
              }
            `}
            title={
              !serviceStatus.ttsAvailable 
                ? 'Voice output service unavailable' 
                : voiceOutputEnabled 
                  ? 'Disable voice output' 
                  : 'Enable voice output'
            }
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-sm font-medium">Voice Output</span>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(serviceStatus.ttsAvailable)}`} />
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-gray-600" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value as 'bn' | 'en' | 'auto')}
            disabled={serviceStatus.processing}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Voice settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h3>
            
            {/* Service Status */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Service Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Speech Recognition</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(serviceStatus.whisperAvailable)}`} />
                    <span className={`text-sm ${getStatusColor(serviceStatus.whisperAvailable)}`}>
                      {getStatusText(serviceStatus.whisperAvailable)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Speech Synthesis</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(serviceStatus.ttsAvailable)}`} />
                    <span className={`text-sm ${getStatusColor(serviceStatus.ttsAvailable)}`}>
                      {getStatusText(serviceStatus.ttsAvailable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Information */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Language Support</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-sm text-gray-600">English - Full support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🇧🇩</span>
                  <span className="text-sm text-gray-600">বাংলা - Recognition + Basic synthesis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌐</span>
                  <span className="text-sm text-gray-600">Auto-detect - Automatic language detection</span>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Usage Tips</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-start space-x-2">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Speak clearly and at a normal pace for best recognition</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Use a quiet environment to reduce background noise</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Voice features work completely offline</span>
                </div>
              </div>
            </div>

            {/* Processing Status */}
            {serviceStatus.processing && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-700">Processing voice request...</span>
                </div>
              </div>
            )}

            {/* Close button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close settings */}
      {showSettings && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};