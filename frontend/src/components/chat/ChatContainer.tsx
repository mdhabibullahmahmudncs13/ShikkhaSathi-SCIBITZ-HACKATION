import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatState, QuickAction } from '../../types/chat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import QuickActions from './QuickActions';
import TypingIndicator from './TypingIndicator';
import ConnectionStatus from './ConnectionStatus';
import ModelSelector from './ModelSelector';
import AIModeSelector from './AIModeSelector';
import { api } from '../../services/apiClient';

interface ChatContainerProps {
  className?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ 
  className = ''
}) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `🎓 Welcome to ShikkhaSathi AI Tutor!

I'm here to help you learn, but I need you to select the RIGHT model for your question:

📗 **বাংলা মডেল** → ONLY for Bengali language & literature
📘 **Math Model** → ONLY for Mathematics 
📙 **General Model** → For Science, English, History, and other subjects

⚠️ **Important:** If you select the wrong model, I'll ask you to switch to the correct one!

Please select both an AI model and an AI mode below to get started.`,
        timestamp: new Date(),
        status: 'delivered',
      }
    ],
    isTyping: false,
    connectionStatus: 'connected',
    voiceRecording: {
      isRecording: false,
      duration: 0,
    },
    isVoiceMode: false,
  });

  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedAIMode, setSelectedAIMode] = useState<string>('');
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  const handleSendMessage = async (content: string, isVoice: boolean = false) => {
    if (!selectedModel) {
      // Show error message if no model is selected
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ **Please select an AI model first!**\n\nChoose the right model for your question:\n• বাংলা মডেল → Bengali language questions\n• Math Model → Mathematics questions\n• General Model → Science, English, History questions',
        timestamp: new Date(),
        status: 'error',
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
      return;
    }

    if (!selectedAIMode) {
      // Show error message if no AI mode is selected
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ **Please select an AI mode!**\n\nChoose how you want me to help you:\n• Tutor Mode → Detailed explanations\n• Quiz Mode → Practice questions\n• Homework Help → Step-by-step solutions',
        timestamp: new Date(),
        status: 'error',
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
      return;
    }

    // Add user message to local state immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      voiceInput: isVoice,
      status: 'sending',
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
    }));

    try {
      // Get conversation history for context (last 5 messages)
      const conversationHistory = chatState.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(-5)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log('🔍 Frontend Debug - Sending chat request:', {
        message: content,
        session_id: sessionId,
        model_category: selectedModel,
        ai_mode: selectedAIMode,
        conversation_history: conversationHistory,
        timestamp: new Date().toISOString()
      });

      // Call the REST API with enhanced error handling
      const response = await api.post('/ai/chat', {
        message: content,
        session_id: sessionId,
        conversation_history: conversationHistory,
        model_category: selectedModel,
        ai_mode: selectedAIMode,
        subject: null, // Let the AI determine the subject
        timestamp: Date.now() // Add timestamp to prevent caching
      });

      // Update user message status
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg
        ),
        isTyping: false,
      }));

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        status: 'delivered',
        sources: response.sources || [],
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
      }));

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Update user message status to error
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        ),
        isTyping: false,
      }));
      
      // Enhanced error handling with specific error types
      let errorMessage = 'Sorry, I encountered an error processing your message. Please try again.';
      let shouldRetry = true;
      
      // Check for specific error types
      if (error?.response?.status === 401) {
        errorMessage = 'Your session has expired. Please refresh the page and log in again to continue chatting.';
        shouldRetry = false;
        // Update connection status
        setChatState(prev => ({
          ...prev,
          connectionStatus: 'disconnected'
        }));
      } else if (error?.response?.status === 422) {
        errorMessage = 'There was an issue with your request format. Please try rephrasing your question.';
      } else if (error?.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before sending another message.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
      } else if (error?.response?.status === 503) {
        errorMessage = 'The AI model is currently busy. Please try again in a few seconds.';
      } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        // Update connection status
        setChatState(prev => ({
          ...prev,
          connectionStatus: 'connecting'
        }));
      } else if (error?.name === 'TimeoutError') {
        errorMessage = 'Request timed out. The AI is taking longer than usual to respond. Please try again.';
      }
      
      const errorChatMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: errorMessage + (shouldRetry ? ' You can try asking your question again.' : ''),
        timestamp: new Date(),
        status: 'error',
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorChatMessage],
      }));
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.question);
  };

  const toggleVoiceMode = () => {
    setChatState(prev => ({
      ...prev,
      isVoiceMode: !prev.isVoiceMode,
    }));
  };

  const handleAIModeChange = (modeId: string) => {
    setSelectedAIMode(modeId);
    
    // Add a system message when AI mode is changed
    const modeNames = {
      'tutor': 'Tutor Mode',
      'quiz': 'Quiz Mode',
      'explanation': 'Explanation Mode',
      'homework': 'Homework Help',
      'exam': 'Exam Prep',
      'discussion': 'Discussion Mode'
    };
    
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content: `Switched to ${modeNames[modeId as keyof typeof modeNames]}. ${selectedModel ? 'Ready to help!' : 'Please select an AI model too.'}`,
      timestamp: new Date(),
      status: 'delivered',
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
    }));
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    
    // Add a system message when model is changed
    const modelInfo = {
      'bangla': {
        name: '📗 বাংলা মডেল',
        help: 'Now I can help with বাংলা ব্যাকরণ (সন্ধি, সমাস, প্রত্যয়), সাহিত্য, and Bengali language questions.'
      },
      'math': {
        name: '📘 Math Model',
        help: 'Now I can help with Algebra, Geometry, Calculus, Trigonometry, and all math topics.'
      },
      'general': {
        name: '📙 General Model',
        help: 'Now I can help with Physics, Chemistry, Biology, English, History, and other subjects.'
      }
    };
    
    const info = modelInfo[modelId as keyof typeof modelInfo];
    
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content: `✅ Switched to ${info.name}\n\n${info.help}\n\n${selectedAIMode ? '🎯 Ready to help! Ask me anything.' : '⚠️ Please also select an AI mode to continue.'}`,
      timestamp: new Date(),
      status: 'delivered',
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
    }));
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">AI</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">ShikkhaSathi AI Tutor</h3>
            <p className="text-sm text-gray-500">Always here to help you learn</p>
          </div>
        </div>
        <ConnectionStatus status={chatState.connectionStatus} />
      </div>

      {/* Model and AI Mode Selectors - Compact 25% view */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 space-y-2 max-h-[25vh] overflow-y-auto">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          disabled={chatState.isTyping}
        />
        
        <AIModeSelector
          selectedMode={selectedAIMode}
          onModeChange={handleAIModeChange}
          disabled={chatState.isTyping}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onActionClick={handleQuickAction} />

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {chatState.messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Welcome to ShikkhaSathi!</h4>
            <p className="text-gray-600">Ask me anything about your studies. I'm here to help you learn better.</p>
          </div>
        )}

        {chatState.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {chatState.isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isVoiceMode={chatState.isVoiceMode}
        onToggleVoiceMode={toggleVoiceMode}
        voiceRecording={chatState.voiceRecording}
        disabled={(!selectedModel || !selectedAIMode) || chatState.isTyping}
      />
    </div>
  );
};

export default ChatContainer;