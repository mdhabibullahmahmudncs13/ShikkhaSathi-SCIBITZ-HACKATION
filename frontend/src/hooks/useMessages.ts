import { useState, useEffect, useCallback } from 'react';
import { 
  Message, 
  MessageCreate, 
  MessageTemplate, 
  MessageStatistics,
  MessageFilter,
  MessageComposerState,
  RecipientSelectionResponse,
  RecipientSelection
} from '../types/teacher';
import { apiClient } from '../services/apiClient';

interface UseMessagesReturn {
  // State
  messages: Message[];
  templates: MessageTemplate[];
  statistics: MessageStatistics | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (message: MessageComposerState) => Promise<void>;
  saveDraft: (message: MessageComposerState) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  archiveMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  resendMessage: (messageId: string) => Promise<void>;
  
  // Templates
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  loadTemplates: () => Promise<void>;
  
  // Recipients
  previewRecipients: (selection: RecipientSelection) => Promise<RecipientSelectionResponse>;
  
  // Data loading
  loadMessages: (filter?: MessageFilter) => Promise<void>;
  loadStatistics: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export const useMessages = (): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [statistics, setStatistics] = useState<MessageStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages with optional filtering
  const loadMessages = useCallback(async (filter?: MessageFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filter?.messageType) params.append('message_type', filter.messageType);
      if (filter?.priority) params.append('priority', filter.priority);
      if (filter?.isDraft !== undefined) params.append('is_draft', filter.isDraft.toString());
      if (filter?.searchQuery) params.append('search', filter.searchQuery);
      
      const response = await apiClient.get(`/messages/sent?${params.toString()}`);
      
      // Transform dates
      const transformedMessages = response.data.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        scheduledAt: msg.scheduledAt ? new Date(msg.scheduledAt) : undefined,
        sentAt: msg.sentAt ? new Date(msg.sentAt) : undefined,
        recipients: msg.recipients.map((r: any) => ({
          ...r,
          deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
          readAt: r.readAt ? new Date(r.readAt) : undefined
        }))
      }));
      
      setMessages(transformedMessages);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load messages');
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (messageData: MessageComposerState) => {
    setLoading(true);
    setError(null);
    
    try {
      const payload: MessageCreate = {
        subject: messageData.subject,
        content: messageData.content,
        messageType: messageData.messageType,
        priority: messageData.priority,
        recipientIds: messageData.messageType === 'class' 
          ? messageData.selectedClasses 
          : messageData.selectedRecipients,
        scheduledAt: messageData.scheduledAt,
        isDraft: false,
        metadata: {
          includeParents: messageData.includeParents,
          templateId: messageData.template?.id
        }
      };
      
      const response = await apiClient.post('/messages/', payload);
      
      // Transform and add to messages list
      const newMessage = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        scheduledAt: response.data.scheduledAt ? new Date(response.data.scheduledAt) : undefined,
        sentAt: response.data.sentAt ? new Date(response.data.sentAt) : undefined,
        recipients: response.data.recipients.map((r: any) => ({
          ...r,
          deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
          readAt: r.readAt ? new Date(r.readAt) : undefined
        }))
      };
      
      setMessages(prev => [newMessage, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save message as draft
  const saveDraft = useCallback(async (messageData: MessageComposerState) => {
    setLoading(true);
    setError(null);
    
    try {
      const payload: MessageCreate = {
        subject: messageData.subject,
        content: messageData.content,
        messageType: messageData.messageType,
        priority: messageData.priority,
        recipientIds: messageData.messageType === 'class' 
          ? messageData.selectedClasses 
          : messageData.selectedRecipients,
        scheduledAt: messageData.scheduledAt,
        isDraft: true,
        metadata: {
          includeParents: messageData.includeParents,
          templateId: messageData.template?.id
        }
      };
      
      const response = await apiClient.post('/messages/', payload);
      
      // Transform and add to messages list
      const newDraft = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        scheduledAt: response.data.scheduledAt ? new Date(response.data.scheduledAt) : undefined,
        recipients: response.data.recipients.map((r: any) => ({
          ...r,
          deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
          readAt: r.readAt ? new Date(r.readAt) : undefined
        }))
      };
      
      setMessages(prev => [newDraft, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save draft');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    setError(null);
    
    try {
      await apiClient.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete message');
      throw err;
    }
  }, []);

  // Archive a message
  const archiveMessage = useCallback(async (messageId: string) => {
    setError(null);
    
    try {
      // Update message locally (API endpoint not implemented yet)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isArchived: true } : msg
      ));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to archive message');
      throw err;
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    setError(null);
    
    try {
      await apiClient.post(`/messages/${messageId}/read`);
      
      // Update message locally
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            recipients: msg.recipients.map(r => ({
              ...r,
              deliveryStatus: 'read' as const,
              readAt: new Date()
            }))
          };
        }
        return msg;
      }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark as read');
      throw err;
    }
  }, []);

  // Resend failed messages
  const resendMessage = useCallback(async (messageId: string) => {
    setError(null);
    
    try {
      // This would trigger a resend of failed deliveries
      // Implementation depends on backend API
      console.log('Resending message:', messageId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend message');
      throw err;
    }
  }, []);

  // Load message templates
  const loadTemplates = useCallback(async () => {
    setError(null);
    
    try {
      const response = await apiClient.get('/messages/templates');
      
      const transformedTemplates = response.data.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      }));
      
      setTemplates(transformedTemplates);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load templates');
      console.error('Failed to load templates:', err);
    }
  }, []);

  // Create a new template
  const createTemplate = useCallback(async (templateData: Omit<MessageTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    
    try {
      const response = await apiClient.post('/messages/templates', templateData);
      
      const newTemplate = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt)
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create template');
      throw err;
    }
  }, []);

  // Preview recipients for a message
  const previewRecipients = useCallback(async (selection: RecipientSelection): Promise<RecipientSelectionResponse> => {
    setError(null);
    
    try {
      const response = await apiClient.post('/messages/recipients/preview', selection);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview recipients');
      throw err;
    }
  }, []);

  // Load message statistics
  const loadStatistics = useCallback(async () => {
    setError(null);
    
    try {
      const response = await apiClient.get('/messages/statistics/overview');
      setStatistics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load statistics');
      console.error('Failed to load statistics:', err);
    }
  }, []);

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  // Load initial data
  useEffect(() => {
    loadMessages();
    loadTemplates();
    loadStatistics();
  }, [loadMessages, loadTemplates, loadStatistics]);

  return {
    // State
    messages,
    templates,
    statistics,
    loading,
    error,
    
    // Actions
    sendMessage,
    saveDraft,
    deleteMessage,
    archiveMessage,
    markAsRead,
    resendMessage,
    
    // Templates
    createTemplate,
    loadTemplates,
    
    // Recipients
    previewRecipients,
    
    // Data loading
    loadMessages,
    loadStatistics,
    refreshMessages
  };
};