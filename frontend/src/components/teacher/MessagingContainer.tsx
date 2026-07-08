import React, { useState } from 'react';
import { Plus, MessageSquare, BarChart3, Settings } from 'lucide-react';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import MessageDetail from './MessageDetail';
import { useMessages } from '../../hooks/useMessages';
import { 
  Message, 
  MessageFilter, 
  MessageComposerState,
  ClassOverview 
} from '../../types/teacher';

interface MessagingContainerProps {
  classes: ClassOverview[];
}

const MessagingContainer: React.FC<MessagingContainerProps> = ({ classes }) => {
  const {
    messages,
    templates,
    statistics,
    loading,
    error,
    sendMessage,
    saveDraft,
    deleteMessage,
    archiveMessage,
    markAsRead,
    resendMessage,
    loadMessages
  } = useMessages();

  const [showComposer, setShowComposer] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<MessageFilter>({});
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts' | 'analytics'>('sent');

  const handleSendMessage = async (messageData: MessageComposerState) => {
    try {
      await sendMessage(messageData);
      setShowComposer(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleSaveDraft = async (messageData: MessageComposerState) => {
    try {
      await saveDraft(messageData);
      setShowComposer(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageDetail(true);
    
    // Mark as read if it's a received message
    if (message.recipients.some(r => r.deliveryStatus !== 'read')) {
      markAsRead(message.id);
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setShowComposer(true);
    setShowMessageDetail(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId);
        setShowMessageDetail(false);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const handleArchiveMessage = async (messageId: string) => {
    try {
      await archiveMessage(messageId);
      setShowMessageDetail(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleResendMessage = async (messageId: string) => {
    try {
      await resendMessage(messageId);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleReplyToMessage = (message: Message) => {
    const replyData: Partial<MessageComposerState> = {
      subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`,
      content: `\n\n--- Original Message ---\nFrom: ${message.senderName}\nSubject: ${message.subject}\nDate: ${message.createdAt.toLocaleString()}\n\n${message.content}`,
      messageType: 'direct',
      priority: 'normal',
      selectedRecipients: [message.senderId],
      isDraft: false
    };
    
    setEditingMessage(null);
    setShowComposer(true);
    setShowMessageDetail(false);
  };

  const handleFilterChange = (newFilter: MessageFilter) => {
    setFilter(newFilter);
    loadMessages(newFilter);
  };

  const getFilteredMessages = () => {
    let filteredMessages = messages;

    switch (activeTab) {
      case 'sent':
        filteredMessages = messages.filter(m => !m.isDraft);
        break;
      case 'drafts':
        filteredMessages = messages.filter(m => m.isDraft);
        break;
      case 'inbox':
        // This would be for received messages - not implemented yet
        filteredMessages = [];
        break;
      default:
        break;
    }

    return filteredMessages;
  };

  const tabs = [
    { id: 'sent', label: 'Sent', icon: MessageSquare, count: messages.filter(m => !m.isDraft).length },
    { id: 'drafts', label: 'Drafts', icon: MessageSquare, count: messages.filter(m => m.isDraft).length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Communicate with students and parents</p>
        </div>
        <button
          onClick={() => {
            setEditingMessage(null);
            setShowComposer(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Compose Message</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{statistics.totalMessagesSent}</div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{statistics.recentActivity}</div>
                <div className="text-sm text-gray-600">Recent Activity</div>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{statistics.draftMessages}</div>
                <div className="text-sm text-gray-600">Draft Messages</div>
              </div>
              <MessageSquare className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(statistics.deliveryStatistics).reduce((a, b) => a + b, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Deliveries</div>
              </div>
              <Settings className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'analytics' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Analytics</h3>
          
          {statistics && (
            <div className="space-y-6">
              {/* Message Types */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Messages by Type</h4>
                <div className="space-y-2">
                  {Object.entries(statistics.messagesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{type}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Statistics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Delivery Statistics</h4>
                <div className="space-y-2">
                  {Object.entries(statistics.deliveryStatistics).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{status}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MessageList
          messages={getFilteredMessages()}
          loading={loading}
          onMessageClick={handleMessageClick}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onArchiveMessage={handleArchiveMessage}
          onResendMessage={handleResendMessage}
          filter={filter}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* Message Composer Modal */}
      <MessageComposer
        isOpen={showComposer}
        onClose={() => {
          setShowComposer(false);
          setEditingMessage(null);
        }}
        onSend={handleSendMessage}
        onSaveDraft={handleSaveDraft}
        classes={classes}
        templates={templates}
        initialMessage={editingMessage ? {
          subject: editingMessage.subject,
          content: editingMessage.content,
          messageType: editingMessage.messageType,
          priority: editingMessage.priority,
          scheduledAt: editingMessage.scheduledAt,
          isDraft: editingMessage.isDraft
        } : undefined}
      />

      {/* Message Detail Modal */}
      <MessageDetail
        message={selectedMessage}
        isOpen={showMessageDetail}
        onClose={() => {
          setShowMessageDetail(false);
          setSelectedMessage(null);
        }}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onArchive={handleArchiveMessage}
        onResend={handleResendMessage}
        onReply={handleReplyToMessage}
      />
    </div>
  );
};

export default MessagingContainer;