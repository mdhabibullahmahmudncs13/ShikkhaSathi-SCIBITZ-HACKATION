import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketService, WebSocketMessage } from '../services/websocketService';
import { ChatMessage, ConnectionStatus } from '../types/chat';

interface UseWebSocketProps {
  sessionId: string;
  token: string;
  onMessage: (message: ChatMessage) => void;
  onTypingChange: (isTyping: boolean) => void;
  onMessageStatusUpdate: (messageId: string, status: string) => void;
}

export const useWebSocket = ({
  sessionId,
  token,
  onMessage,
  onTypingChange,
  onMessageStatusUpdate,
}: UseWebSocketProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const wsServiceRef = useRef<WebSocketService | null>(null);

  const handleWebSocketMessage = useCallback((wsMessage: WebSocketMessage) => {
    switch (wsMessage.type) {
      case 'message':
        if (wsMessage.message) {
          onMessage(wsMessage.message);
        }
        break;
      
      case 'typing_indicator':
        if (typeof wsMessage.is_typing === 'boolean') {
          onTypingChange(wsMessage.is_typing);
        }
        break;
      
      case 'message_status':
        if (wsMessage.message_id && wsMessage.status) {
          onMessageStatusUpdate(wsMessage.message_id, wsMessage.status);
        }
        break;
      
      case 'connection_status':
        console.log('Connection status update:', wsMessage.status);
        break;
      
      case 'error':
        console.error('WebSocket error:', wsMessage.error);
        // You could show a toast notification here
        break;
      
      case 'pong':
        // Handle pong response for connection health
        console.log('Received pong');
        break;
      
      default:
        console.log('Unknown message type:', wsMessage.type);
    }
  }, [onMessage, onTypingChange, onMessageStatusUpdate]);

  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  const connect = useCallback(() => {
    if (wsServiceRef.current?.isConnected()) {
      return;
    }

    wsServiceRef.current = new WebSocketService(
      sessionId,
      token,
      handleWebSocketMessage,
      handleConnectionStatusChange
    );

    wsServiceRef.current.connect();
  }, [sessionId, token, handleWebSocketMessage, handleConnectionStatusChange]);

  const disconnect = useCallback(() => {
    wsServiceRef.current?.disconnect();
    wsServiceRef.current = null;
  }, []);

  const sendMessage = useCallback((content: string, isVoice: boolean = false): string | null => {
    try {
      if (wsServiceRef.current?.isConnected()) {
        return wsServiceRef.current.sendMessage(content, isVoice);
      } else {
        console.error('WebSocket is not connected');
        return null;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // Auto-connect on mount and when dependencies change
  useEffect(() => {
    if (sessionId && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionStatus === 'connected',
  };
};