import { ChatMessage, ConnectionStatus } from '../types/chat';
import { getWebSocketUrl } from '../utils/apiUrl';

export interface WebSocketMessage {
  type: 'message' | 'typing_indicator' | 'connection_status' | 'message_status' | 'error' | 'ping' | 'pong';
  message?: ChatMessage;
  is_typing?: boolean;
  status?: string;
  session_id?: string;
  message_id?: string;
  timestamp?: string;
  error?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(
    private sessionId: string,
    private token: string,
    private onMessage: (message: WebSocketMessage) => void,
    private onConnectionStatusChange: (status: ConnectionStatus) => void
  ) {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;
    this.onConnectionStatusChange('connecting');

    const wsUrl = `${getWebSocketUrl()}/api/v1/chat/ws/${this.sessionId}?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.onConnectionStatusChange('connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopPingInterval();
      
      if (!this.isManualClose) {
        this.onConnectionStatusChange('disconnected');
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onConnectionStatusChange('disconnected');
    };
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.onConnectionStatusChange('disconnected');
  }

  sendMessage(content: string, isVoice: boolean = false): string {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      type: 'message',
      id: messageId,
      content,
      voice_input: isVoice,
      timestamp: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(message));
    return messageId;
  }

  private attemptReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onConnectionStatusChange('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.onConnectionStatusChange('reconnecting');

    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  getConnectionState(): number | undefined {
    return this.ws?.readyState;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}