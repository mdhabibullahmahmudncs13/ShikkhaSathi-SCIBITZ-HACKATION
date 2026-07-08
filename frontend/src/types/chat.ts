// Chat interface type definitions
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  voiceInput?: boolean;
  sources?: SourceCitation[];
  status?: MessageStatus;
}

export interface SourceCitation {
  id: string;
  title: string;
  subject: string;
  grade: number;
  chapter: number;
  pageNumber: number;
  textbookName: string;
  relevantText: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceRecording {
  isRecording: boolean;
  audioBlob?: Blob;
  duration: number;
  waveformData?: number[];
}

export interface QuickAction {
  id: string;
  label: string;
  question: string;
  icon: string;
  category: 'math' | 'science' | 'bangla' | 'english' | 'general';
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  connectionStatus: ConnectionStatus;
  currentSession?: ChatSession;
  voiceRecording: VoiceRecording;
  isVoiceMode: boolean;
}