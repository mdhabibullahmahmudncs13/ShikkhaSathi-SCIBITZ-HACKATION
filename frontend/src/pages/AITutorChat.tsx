import React from 'react';
import { Bot, BookOpen, Download, Settings } from 'lucide-react';
import { ChatContainer } from '../components/chat';
import { VoiceControls } from '../components/voice/VoiceControls';
import { ConversationExport } from '../components/chat/ConversationExport';
import { useVoice } from '../hooks/useVoice';

const AITutorChat: React.FC = () => {
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');

  // Voice functionality
  const {
    state: voiceState,
    settings: voiceSettings,
    toggleInput,
    toggleOutput,
    changeLanguage,
    clearError
  } = useVoice();

  const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Bangla', 'English'];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Tutor</h1>
              <p className="text-sm text-gray-500">ShikkhaSathi Learning Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Export Conversation"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Voice Settings Button */}
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Voice Settings"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">Voice</span>
            </button>

            {/* Voice Controls */}
            <VoiceControls
              voiceInputEnabled={voiceState.voiceInputEnabled}
              voiceOutputEnabled={voiceState.voiceOutputEnabled}
              selectedLanguage={voiceState.selectedLanguage}
              onToggleInput={toggleInput}
              onToggleOutput={toggleOutput}
              onLanguageChange={changeLanguage}
              serviceStatus={{
                whisperAvailable: voiceState.serviceAvailable,
                ttsAvailable: voiceState.serviceAvailable,
                processing: voiceState.isProcessing
              }}
              className="hidden md:block"
            />
            
            {/* Subject Selector */}
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Voice Controls */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <VoiceControls
            voiceInputEnabled={voiceState.voiceInputEnabled}
            voiceOutputEnabled={voiceState.voiceOutputEnabled}
            selectedLanguage={voiceState.selectedLanguage}
            onToggleInput={toggleInput}
            onToggleOutput={toggleOutput}
            onLanguageChange={changeLanguage}
            serviceStatus={{
              whisperAvailable: voiceState.serviceAvailable,
              ttsAvailable: voiceState.serviceAvailable,
              processing: voiceState.isProcessing
            }}
          />
        </div>

        {/* Error Display */}
        {voiceState.lastError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-red-700 text-sm">{voiceState.lastError}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Chat Container with AI Mode Selection */}
      <div className="flex-1 flex flex-col">
        <ChatContainer className="flex-1" />
      </div>

      {/* Export Modal */}
      <ConversationExport
        messages={[]} // This would need to be connected to ChatContainer's messages
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Voice Settings</h3>
              <button
                onClick={() => setShowVoiceSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            <VoiceControls
              voiceInputEnabled={voiceState.voiceInputEnabled}
              voiceOutputEnabled={voiceState.voiceOutputEnabled}
              selectedLanguage={voiceState.selectedLanguage}
              onToggleInput={toggleInput}
              onToggleOutput={toggleOutput}
              onLanguageChange={changeLanguage}
              serviceStatus={{
                whisperAvailable: voiceState.serviceAvailable,
                ttsAvailable: voiceState.serviceAvailable,
                processing: voiceState.isProcessing
              }}
              showLabels={true}
            />

            {voiceState.lastError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{voiceState.lastError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowVoiceSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorChat;