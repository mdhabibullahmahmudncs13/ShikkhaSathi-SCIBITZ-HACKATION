"""
Message Models

Database models for teacher messaging system including messages,
recipients, delivery status, and read receipts.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
from datetime import datetime
import uuid
import enum

from app.db.session import Base


class MessageType(str, enum.Enum):
    """Types of messages that can be sent"""
    DIRECT = "direct"           # Direct message to individual
    GROUP = "group"             # Message to a group of recipients
    CLASS = "class"             # Message to entire class
    ANNOUNCEMENT = "announcement"  # Public announcement
    AUTOMATED = "automated"     # System-generated message


class MessagePriority(str, enum.Enum):
    """Priority levels for messages"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class DeliveryStatus(str, enum.Enum):
    """Status of message delivery"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Message(Base):
    """
    Main message model storing message content and metadata
    """
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), nullable=False, default=MessageType.DIRECT)
    priority = Column(Enum(MessagePriority), nullable=False, default=MessagePriority.NORMAL)
    
    # Scheduling and delivery
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)  # For scheduled messages
    sent_at = Column(DateTime, nullable=True)
    
    # Message metadata
    message_metadata = Column(JSON, nullable=True)  # Additional data like attachments, formatting
    is_draft = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    recipients = relationship("MessageRecipient", back_populates="message", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Message(id={self.id}, subject='{self.subject}', type={self.message_type})>"


class MessageRecipient(Base):
    """
    Junction table for message recipients with delivery tracking
    """
    __tablename__ = "message_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    recipient_type = Column(String, nullable=False)  # 'student', 'parent', 'teacher'
    
    # Delivery tracking
    delivery_status = Column(Enum(DeliveryStatus), nullable=False, default=DeliveryStatus.PENDING)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    
    # Failure tracking
    failure_reason = Column(String(500), nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="recipients")
    recipient = relationship("User", foreign_keys=[recipient_id])
    
    def __repr__(self):
        return f"<MessageRecipient(message_id={self.message_id}, recipient_id={self.recipient_id}, status={self.delivery_status})>"


class MessageThread(Base):
    """
    Message threads for organizing related messages
    """
    __tablename__ = "message_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(255), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Thread metadata
    is_closed = Column(Boolean, default=False, nullable=False)
    participant_ids = Column(JSON, nullable=False)  # List of participant user IDs
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<MessageThread(id={self.id}, subject='{self.subject}')>"


class MessageTemplate(Base):
    """
    Reusable message templates for common communications
    """
    __tablename__ = "message_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_template = Column(String(255), nullable=False)
    content_template = Column(Text, nullable=False)
    
    # Template metadata
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Template settings
    is_public = Column(Boolean, default=False, nullable=False)  # Available to all teachers
    category = Column(String(100), nullable=True)  # e.g., 'assessment', 'progress', 'general'
    variables = Column(JSON, nullable=True)  # Template variable definitions
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<MessageTemplate(id={self.id}, name='{self.name}')>"


class MessageNotificationSettings(Base):
    """
    User preferences for message notifications
    """
    __tablename__ = "message_notification_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    
    # Notification timing
    quiet_hours_start = Column(String(5), nullable=True)  # e.g., "22:00"
    quiet_hours_end = Column(String(5), nullable=True)    # e.g., "08:00"
    weekend_notifications = Column(Boolean, default=False, nullable=False)
    
    # Message type preferences
    direct_messages = Column(Boolean, default=True, nullable=False)
    group_messages = Column(Boolean, default=True, nullable=False)
    announcements = Column(Boolean, default=True, nullable=False)
    automated_messages = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<MessageNotificationSettings(user_id={self.user_id})>"