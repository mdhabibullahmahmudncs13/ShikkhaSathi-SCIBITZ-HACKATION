/**
 * Conversation Export Component
 * Allows users to export chat conversations with voice messages
 */

import React, { useState } from 'react';
import { Download, FileText, Volume2, Calendar, User, Bot, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  audioUrl?: string;
  isVoiceMessage?: boolean;
}

interface ConversationExportProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationExport: React.FC<ConversationExportProps> = ({
  messages,
  isOpen,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<'text' | 'html' | 'json'>('text');
  const [includeVoiceInfo, setIncludeVoiceInfo] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSources, setIncludeSources] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateTextExport = () => {
    let content = `ShikkhaSathi AI Tutor Conversation\n`;
    content += `Exported on: ${new Date().toLocaleString()}\n`;
    content += `Total Messages: ${messages.length}\n`;
    content += `Voice Messages: ${messages.filter(m => m.isVoiceMessage).length}\n`;
    content += `\n${'='.repeat(50)}\n\n`;

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'Student' : 'AI Tutor';
      const voiceIndicator = message.isVoiceMessage ? ' 🎤' : '';
      const audioIndicator = message.audioUrl ? ' 🔊' : '';
      
      content += `[${index + 1}] ${role}${voiceIndicator}${audioIndicator}`;
      
      if (includeTimestamps) {
        content += ` - ${formatDate(message.timestamp)}`;
      }
      
      content += `\n${message.content}\n`;
      
      if (includeVoiceInfo && message.isVoiceMessage) {
        content += `(Voice Input: Transcribed from speech)\n`;
      }
      
      if (includeVoiceInfo && message.audioUrl) {
        content += `(Voice Output: Audio available - ID: ${message.audioUrl})\n`;
      }
      
      if (includeSources && message.sources && message.sources.length > 0) {
        content += `Sources: ${message.sources.join(', ')}\n`;
      }
      
      content += `\n${'-'.repeat(30)}\n\n`;
    });

    return content;
  };

  const generateHTMLExport = () => {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShikkhaSathi AI Tutor Conversation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .assistant { background: #f3e5f5; border-left: 4px solid #9c27b0; }
        .role { font-weight: bold; margin-bottom: 5px; }
        .timestamp { font-size: 0.8em; color: #666; margin-bottom: 10px; }
        .content { line-height: 1.6; }
        .sources { margin-top: 10px; font-size: 0.9em; color: #555; }
        .voice-indicator { display: inline-block; margin-left: 5px; }
        .stats { display: flex; gap: 20px; margin-bottom: 10px; }
        .stat { background: white; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 ShikkhaSathi AI Tutor Conversation</h1>
        <div class="stats">
            <div class="stat"><strong>Exported:</strong> ${new Date().toLocaleString()}</div>
            <div class="stat"><strong>Messages:</strong> ${messages.length}</div>
            <div class="stat"><strong>Voice Messages:</strong> ${messages.filter(m => m.isVoiceMessage).length}</div>
        </div>
    </div>
`;

    messages.forEach((message, index) => {
      const roleClass = message.role === 'user' ? 'user' : 'assistant';
      const roleName = message.role === 'user' ? '👤 Student' : '🤖 AI Tutor';
      const voiceIndicator = message.isVoiceMessage ? '<span class="voice-indicator">🎤</span>' : '';
      const audioIndicator = message.audioUrl ? '<span class="voice-indicator">🔊</span>' : '';
      
      html += `
    <div class="message ${roleClass}">
        <div class="role">${roleName}${voiceIndicator}${audioIndicator}</div>`;
      
      if (includeTimestamps) {
        html += `<div class="timestamp">${formatDate(message.timestamp)}</div>`;
      }
      
      html += `<div class="content">${message.content.replace(/\n/g, '<br>')}</div>`;
      
      if (includeVoiceInfo && message.isVoiceMessage) {
        html += `<div class="sources"><em>Voice Input: Transcribed from speech</em></div>`;
      }
      
      if (includeVoiceInfo && message.audioUrl) {
        html += `<div class="sources"><em>Voice Output: Audio available (ID: ${message.audioUrl})</em></div>`;
      }
      
      if (includeSources && message.sources && message.sources.length > 0) {
        html += `<div class="sources"><strong>Sources:</strong> ${message.sources.join(', ')}</div>`;
      }
      
      html += `</div>`;
    });

    html += `
</body>
</html>`;

    return html;
  };

  const generateJSONExport = () => {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        voiceMessages: messages.filter(m => m.isVoiceMessage).length,
        platform: 'ShikkhaSathi',
        version: '1.0'
      },
      settings: {
        includeVoiceInfo,
        includeTimestamps,
        includeSources
      },
      conversation: messages.map((message, index) => ({
        id: index + 1,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        isVoiceMessage: message.isVoiceMessage || false,
        audioUrl: message.audioUrl || null,
        sources: includeSources ? (message.sources || []) : []
      }))
    };

    return JSON.stringify(exportData, null, 2);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportFormat) {
        case 'html':
          content = generateHTMLExport();
          filename = `shikkhasathi-conversation-${new Date().toISOString().split('T')[0]}.html`;
          mimeType = 'text/html';
          break;
        case 'json':
          content = generateJSONExport();
          filename = `shikkhasathi-conversation-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        default:
          content = generateTextExport();
          filename = `shikkhasathi-conversation-${new Date().toISOString().split('T')[0]}.txt`;
          mimeType = 'text/plain';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStats = () => {
    const totalMessages = messages.length;
    const voiceMessages = messages.filter(m => m.isVoiceMessage).length;
    const audioMessages = messages.filter(m => m.audioUrl).length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;

    return {
      totalMessages,
      voiceMessages,
      audioMessages,
      userMessages,
      assistantMessages
    };
  };

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export Conversation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Conversation Stats */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Conversation Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Total Messages:</span>
                <span className="font-medium">{stats.totalMessages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Your Messages:</span>
                <span className="font-medium">{stats.userMessages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">AI Responses:</span>
                <span className="font-medium">{stats.assistantMessages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-orange-600" />
                <span className="text-gray-600">Voice Messages:</span>
                <span className="font-medium">{stats.voiceMessages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-red-600" />
                <span className="text-gray-600">Audio Responses:</span>
                <span className="font-medium">{stats.audioMessages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">
                  {messages.length > 1 
                    ? Math.round((new Date(messages[messages.length - 1].timestamp).getTime() - 
                                 new Date(messages[0].timestamp).getTime()) / (1000 * 60))
                    : 0} min
                </span>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'text', label: 'Text (.txt)', desc: 'Simple text format' },
                { value: 'html', label: 'HTML (.html)', desc: 'Formatted web page' },
                { value: 'json', label: 'JSON (.json)', desc: 'Structured data' }
              ].map((format) => (
                <label
                  key={format.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === format.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="sr-only"
                  />
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-gray-500">{format.desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include in Export
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Message timestamps</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeVoiceInfo}
                  onChange={(e) => setIncludeVoiceInfo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Voice message indicators</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeSources}
                  onChange={(e) => setIncludeSources(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">AI response sources</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preview (First 2 Messages)
            </label>
            <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono max-h-40 overflow-y-auto">
              {exportFormat === 'text' && (
                <pre className="whitespace-pre-wrap text-xs">
                  {generateTextExport().split('\n').slice(0, 20).join('\n')}
                  {generateTextExport().split('\n').length > 20 && '\n...'}
                </pre>
              )}
              {exportFormat === 'html' && (
                <div className="text-xs text-gray-600">
                  HTML format with styled messages, timestamps, and voice indicators
                </div>
              )}
              {exportFormat === 'json' && (
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(JSON.parse(generateJSONExport()), null, 2).split('\n').slice(0, 15).join('\n')}
                  {JSON.stringify(JSON.parse(generateJSONExport()), null, 2).split('\n').length > 15 && '\n...'}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {stats.totalMessages} messages • {stats.voiceMessages} voice • {stats.audioMessages} audio
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || messages.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Conversation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};