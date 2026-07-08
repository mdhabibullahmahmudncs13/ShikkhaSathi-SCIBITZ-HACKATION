import React, { useState } from 'react';
import { 
  X, 
  User, 
  Users, 
  MessageSquare, 
  Megaphone,
  Clock,
  Calendar,
  Send,
  CheckCircle,
  XCircle,
  MailOpen,
  AlertCircle,
  Edit,
  Archive,
  Trash2,
  Reply,
  Forward,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  Message, 
  MessageRecipient, 
  DeliveryStatus 
} from '../../types/teacher';

interface MessageDetailProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onArchive: (messageId: string) => void;
  onResend: (messageId: string) => void;
  onReply: (message: Message) => void;
}

const MessageDetail: React.FC<MessageDetailProps> = ({
  message,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onResend,
  onReply
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'recipients' | 'analytics'>('content');

  if (!isOpen || !message) return null;

  const messageTypeIcons = {
    direct: User,
    group: Users,
    class: MessageSquare,
    announcement: Megaphone,
    automated: Clock
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
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

  const TypeIcon = messageTypeIcons[message.messageType];

  const getDeliveryStats = () => {
    const total = message.recipients.length;
    const pending = message.recipients.filter(r => r.deliveryStatus === 'pending').length;
    const sent = message.recipients.filter(r => r.deliveryStatus === 'sent').length;
    const delivered = message.recipients.filter(r => r.deliveryStatus === 'delivered').length;
    const read = message.recipients.filter(r => r.deliveryStatus === 'read').length;
    const failed = message.recipients.filter(r => r.deliveryStatus === 'failed').length;

    return { total, pending, sent, delivered, read, failed };
  };

  const stats = getDeliveryStats();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReadRate = () => {
    if (message.recipients.length === 0) return 0;
    return Math.round((stats.read / stats.total) * 100);
  };

  const getDeliveryRate = () => {
    if (message.recipients.length === 0) return 0;
    return Math.round(((stats.delivered + stats.read) / stats.total) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <TypeIcon className="w-6 h-6 text-gray-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{message.subject}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[message.priority]}`}>
                  {message.priority}
                </span>
                {message.isDraft && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                )}
                {message.scheduledAt && !message.sentAt && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    Scheduled
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Action Buttons */}
            {message.isDraft && (
              <button
                onClick={() => onEdit(message)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            
            {!message.isDraft && (
              <>
                <button
                  onClick={() => onReply(message)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </button>
                
                {stats.failed > 0 && (
                  <button
                    onClick={() => onResend(message.id)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Resend Failed</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => onArchive(message.id)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Archive className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onDelete(message.id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'content', label: 'Message', icon: MessageSquare },
              { id: 'recipients', label: 'Recipients', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: CheckCircle }
            ].map((tab) => {
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
                  {tab.id === 'recipients' && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                      {message.recipients.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'content' && (
            <div className="p-6">
              {/* Message Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 font-medium">{formatDate(message.createdAt)}</span>
                  </div>
                  {message.sentAt && (
                    <div>
                      <span className="text-gray-500">Sent:</span>
                      <span className="ml-2 font-medium">{formatDate(message.sentAt)}</span>
                    </div>
                  )}
                  {message.scheduledAt && (
                    <div>
                      <span className="text-gray-500">Scheduled:</span>
                      <span className="ml-2 font-medium">{formatDate(message.scheduledAt)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">{message.messageType}</span>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {message.content}
                </div>
              </div>

              {/* Metadata */}
              {message.metadata && Object.keys(message.metadata).length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(message.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipients' && (
            <div className="p-6">
              {/* Delivery Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                  <div className="text-sm text-gray-600">Sent</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                  <div className="text-sm text-gray-600">Delivered</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.read}</div>
                  <div className="text-sm text-gray-600">Read</div>
                </div>
              </div>

              {/* Recipients List */}
              <div className="space-y-2">
                {message.recipients.map((recipient) => {
                  const StatusIcon = deliveryStatusIcons[recipient.deliveryStatus];
                  return (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{recipient.recipientName}</div>
                          <div className="text-sm text-gray-500 capitalize">{recipient.recipientType}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {recipient.readAt && (
                          <div className="text-xs text-gray-500">
                            Read {formatDate(recipient.readAt)}
                          </div>
                        )}
                        {recipient.deliveredAt && !recipient.readAt && (
                          <div className="text-xs text-gray-500">
                            Delivered {formatDate(recipient.deliveredAt)}
                          </div>
                        )}
                        
                        <div className={`flex items-center space-x-1 ${deliveryStatusColors[recipient.deliveryStatus]}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm capitalize">{recipient.deliveryStatus}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Failed Recipients */}
              {stats.failed > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Failed Deliveries</h4>
                  </div>
                  <div className="space-y-2">
                    {message.recipients
                      .filter(r => r.deliveryStatus === 'failed')
                      .map((recipient) => (
                        <div key={recipient.id} className="flex items-center justify-between">
                          <span className="text-sm text-red-700">{recipient.recipientName}</span>
                          <span className="text-xs text-red-600">{recipient.failureReason}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{getDeliveryRate()}%</div>
                      <div className="text-blue-100">Delivery Rate</div>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{getReadRate()}%</div>
                      <div className="text-green-100">Read Rate</div>
                    </div>
                    <MailOpen className="w-8 h-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{stats.total}</div>
                      <div className="text-purple-100">Total Recipients</div>
                    </div>
                    <Users className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Delivery Timeline */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Delivery Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Message Created</span>
                    <span className="font-medium">{formatDate(message.createdAt)}</span>
                  </div>
                  {message.sentAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Message Sent</span>
                      <span className="font-medium">{formatDate(message.sentAt)}</span>
                    </div>
                  )}
                  {stats.delivered > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">First Delivery</span>
                      <span className="font-medium">
                        {formatDate(
                          new Date(
                            Math.min(
                              ...message.recipients
                                .filter(r => r.deliveredAt)
                                .map(r => r.deliveredAt!.getTime())
                            )
                          )
                        )}
                      </span>
                    </div>
                  )}
                  {stats.read > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">First Read</span>
                      <span className="font-medium">
                        {formatDate(
                          new Date(
                            Math.min(
                              ...message.recipients
                                .filter(r => r.readAt)
                                .map(r => r.readAt!.getTime())
                            )
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Type Breakdown */}
              <div className="mt-6 bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Recipient Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(
                    message.recipients.reduce((acc, recipient) => {
                      acc[recipient.recipientType] = (acc[recipient.recipientType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{type}s</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageDetail;