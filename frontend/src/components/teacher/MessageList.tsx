import React, { useState } from 'react';
import { 
  Mail, 
  MailOpen, 
  Clock, 
  Users, 
  User, 
  MessageSquare, 
  Megaphone,
  AlertCircle,
  Archive,
  Trash2,
  Edit,
  Send,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { 
  Message, 
  MessageType, 
  MessagePriority, 
  DeliveryStatus,
  MessageFilter 
} from '../../types/teacher';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  onMessageClick: (message: Message) => void;
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onArchiveMessage: (messageId: string) => void;
  onResendMessage: (messageId: string) => void;
  filter: MessageFilter;
  onFilterChange: (filter: MessageFilter) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  onMessageClick,
  onEditMessage,
  onDeleteMessage,
  onArchiveMessage,
  onResendMessage,
  filter,
  onFilterChange
}) => {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const messageTypeIcons = {
    direct: User,
    group: Users,
    class: MessageSquare,
    announcement: Megaphone,
    automated: Clock
  };

  const priorityColors = {
    low: 'text-gray-500',
    normal: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500'
  };

  const deliveryStatusIcons = {
    pending: Clock,
    sent: Send,
    delivered: CheckCircle,
    read: MailOpen,
    failed: XCircle
  };

  const deliveryStatusColors = {
    pending: 'text-yellow-500',
    sent: 'text-blue-500',
    delivered: 'text-green-500',
    read: 'text-green-600',
    failed: 'text-red-500'
  };

  const getDeliveryStats = (message: Message) => {
    const total = message.recipients.length;
    const delivered = message.recipients.filter(r => r.deliveryStatus === 'delivered' || r.deliveryStatus === 'read').length;
    const read = message.recipients.filter(r => r.deliveryStatus === 'read').length;
    const failed = message.recipients.filter(r => r.deliveryStatus === 'failed').length;

    return { total, delivered, read, failed };
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m.id));
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter.messageType && message.messageType !== filter.messageType) return false;
    if (filter.priority && message.priority !== filter.priority) return false;
    if (filter.isDraft !== undefined && message.isDraft !== filter.isDraft) return false;
    if (filter.isArchived !== undefined && message.isArchived !== filter.isArchived) return false;
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      return message.subject.toLowerCase().includes(query) || 
             message.content.toLowerCase().includes(query);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search messages..."
            value={filter.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filter.messageType || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filter, 
                    messageType: e.target.value as MessageType || undefined 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="direct">Direct</option>
                  <option value="group">Group</option>
                  <option value="class">Class</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filter.priority || ''}
                  onChange={(e) => onFilterChange({ 
                    ...filter, 
                    priority: e.target.value as MessagePriority || undefined 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filter.isDraft === undefined ? '' : filter.isDraft ? 'draft' : 'sent'}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFilterChange({ 
                      ...filter, 
                      isDraft: value === '' ? undefined : value === 'draft'
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Messages</option>
                  <option value="sent">Sent</option>
                  <option value="draft">Drafts</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => onFilterChange({})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedMessages.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Archive
              </button>
              <button className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="divide-y">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-600">
              {filter.searchQuery || filter.messageType || filter.priority
                ? 'Try adjusting your filters to see more messages.'
                : 'Start by composing your first message to students or parents.'
              }
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const TypeIcon = messageTypeIcons[message.messageType];
            const stats = getDeliveryStats(message);
            
            return (
              <div
                key={message.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  selectedMessages.includes(message.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message.id)}
                    onChange={() => handleSelectMessage(message.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Message Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <TypeIcon className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => onMessageClick(message)}
                          >
                            {message.subject}
                          </h3>
                          
                          {/* Priority Badge */}
                          {message.priority !== 'normal' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {message.priority}
                            </span>
                          )}

                          {/* Draft Badge */}
                          {message.isDraft && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Draft
                            </span>
                          )}

                          {/* Scheduled Badge */}
                          {message.scheduledAt && !message.sentAt && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Calendar className="w-3 h-3 mr-1" />
                              Scheduled
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {message.content}
                        </p>

                        {/* Delivery Stats */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{stats.total} recipient{stats.total > 1 ? 's' : ''}</span>
                          {!message.isDraft && (
                            <>
                              <span className="flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span>{stats.delivered} delivered</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MailOpen className="w-3 h-3 text-blue-500" />
                                <span>{stats.read} read</span>
                              </span>
                              {stats.failed > 0 && (
                                <span className="flex items-center space-x-1">
                                  <XCircle className="w-3 h-3 text-red-500" />
                                  <span>{stats.failed} failed</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </span>
                        
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(
                              activeDropdown === message.id ? null : message.id
                            )}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdown === message.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    onMessageClick(message);
                                    setActiveDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View</span>
                                </button>
                                
                                {message.isDraft && (
                                  <button
                                    onClick={() => {
                                      onEditMessage(message);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    onArchiveMessage(message.id);
                                    setActiveDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Archive className="w-4 h-4" />
                                  <span>Archive</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onDeleteMessage(message.id);
                                    setActiveDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessageList;