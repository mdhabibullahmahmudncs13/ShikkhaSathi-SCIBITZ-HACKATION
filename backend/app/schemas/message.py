"""
Message Schemas

Pydantic models for message API serialization and validation.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, validator

from app.models.message import MessageType, MessagePriority, DeliveryStatus


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    subject: str = Field(..., min_length=1, max_length=255, description="Message subject")
    content: str = Field(..., min_length=1, description="Message content")
    message_type: MessageType = Field(default=MessageType.DIRECT, description="Type of message")
    priority: MessagePriority = Field(default=MessagePriority.NORMAL, description="Message priority")
    recipient_ids: List[str] = Field(..., min_items=1, description="List of recipient IDs")
    scheduled_at: Optional[datetime] = Field(None, description="Schedule message for later delivery")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional message metadata")
    is_draft: bool = Field(default=False, description="Whether message is a draft")
    
    @validator('scheduled_at')
    def validate_scheduled_at(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError('Scheduled time must be in the future')
        return v
    
    class Config:
        use_enum_values = True


class MessageUpdate(BaseModel):
    """Schema for updating a message"""
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    priority: Optional[MessagePriority] = None
    scheduled_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    is_draft: Optional[bool] = None
    is_archived: Optional[bool] = None
    
    class Config:
        use_enum_values = True


class MessageRecipientResponse(BaseModel):
    """Schema for message recipient information"""
    id: UUID
    recipient_id: str
    recipient_name: str
    recipient_type: str
    delivery_status: DeliveryStatus
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    failure_reason: Optional[str]
    
    class Config:
        use_enum_values = True
        from_attributes = True


class MessageResponse(BaseModel):
    """Schema for message response with recipient details"""
    id: UUID
    sender_id: str
    sender_name: str
    subject: str
    content: str
    message_type: MessageType
    priority: MessagePriority
    created_at: datetime
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    metadata: Optional[Dict[str, Any]]
    is_draft: bool
    is_archived: bool
    recipients: List[MessageRecipientResponse]
    
    class Config:
        use_enum_values = True
        from_attributes = True


class MessageListResponse(BaseModel):
    """Schema for paginated message list"""
    messages: List[MessageResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class MessageThreadCreate(BaseModel):
    """Schema for creating a message thread"""
    subject: str = Field(..., min_length=1, max_length=255)
    participant_ids: List[str] = Field(..., min_items=2, description="List of participant user IDs")
    
    @validator('participant_ids')
    def validate_participants(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate participants not allowed')
        return v


class MessageThreadResponse(BaseModel):
    """Schema for message thread response"""
    id: UUID
    subject: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_closed: bool
    participant_ids: List[str]
    
    class Config:
        from_attributes = True


class MessageTemplateCreate(BaseModel):
    """Schema for creating a message template"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    subject_template: str = Field(..., min_length=1, max_length=255, description="Subject template with variables")
    content_template: str = Field(..., min_length=1, description="Content template with variables")
    is_public: bool = Field(default=False, description="Whether template is available to all teachers")
    category: Optional[str] = Field(None, max_length=100, description="Template category")
    variables: Optional[Dict[str, Any]] = Field(None, description="Template variable definitions")


class MessageTemplateUpdate(BaseModel):
    """Schema for updating a message template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subject_template: Optional[str] = Field(None, min_length=1, max_length=255)
    content_template: Optional[str] = Field(None, min_length=1)
    is_public: Optional[bool] = None
    category: Optional[str] = Field(None, max_length=100)
    variables: Optional[Dict[str, Any]] = None


class MessageTemplateResponse(BaseModel):
    """Schema for message template response"""
    id: UUID
    name: str
    description: Optional[str]
    subject_template: str
    content_template: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_public: bool
    category: Optional[str]
    variables: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    """Schema for updating notification settings"""
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    quiet_hours_end: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    weekend_notifications: Optional[bool] = None
    direct_messages: Optional[bool] = None
    group_messages: Optional[bool] = None
    announcements: Optional[bool] = None
    automated_messages: Optional[bool] = None


class NotificationSettingsResponse(BaseModel):
    """Schema for notification settings response"""
    id: UUID
    user_id: str
    email_notifications: bool
    push_notifications: bool
    sms_notifications: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    weekend_notifications: bool
    direct_messages: bool
    group_messages: bool
    announcements: bool
    automated_messages: bool
    
    class Config:
        from_attributes = True


class MessageStatisticsResponse(BaseModel):
    """Schema for message statistics response"""
    total_messages_sent: int
    messages_by_type: Dict[str, int]
    delivery_statistics: Dict[str, int]
    recent_activity: int
    draft_messages: int


class RecipientSelectionRequest(BaseModel):
    """Schema for recipient selection helper"""
    message_type: MessageType
    class_ids: Optional[List[str]] = Field(None, description="Class IDs for class messages")
    student_ids: Optional[List[str]] = Field(None, description="Specific student IDs")
    include_parents: bool = Field(default=False, description="Include parents in notifications")
    
    class Config:
        use_enum_values = True


class RecipientInfo(BaseModel):
    """Schema for recipient information"""
    id: str
    name: str
    email: Optional[str]
    role: str
    class_name: Optional[str] = None


class RecipientSelectionResponse(BaseModel):
    """Schema for recipient selection response"""
    recipients: List[RecipientInfo]
    total_count: int
    student_count: int
    parent_count: int
    teacher_count: int


class MessagePreview(BaseModel):
    """Schema for message preview before sending"""
    subject: str
    content: str
    recipient_count: int
    estimated_delivery_time: Optional[datetime]
    warnings: List[str] = Field(default_factory=list, description="Warnings about the message")


class BulkMessageOperation(BaseModel):
    """Schema for bulk message operations"""
    message_ids: List[UUID] = Field(..., min_items=1, description="List of message IDs")
    operation: str = Field(..., description="Operation to perform: 'archive', 'delete', 'mark_read'")


class MessageSearchRequest(BaseModel):
    """Schema for message search"""
    query: Optional[str] = Field(None, description="Search query for subject/content")
    message_type: Optional[MessageType] = None
    priority: Optional[MessagePriority] = None
    delivery_status: Optional[DeliveryStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sender_id: Optional[str] = None
    recipient_id: Optional[str] = None
    is_draft: Optional[bool] = None
    is_archived: Optional[bool] = None
    
    class Config:
        use_enum_values = True


class MessageSearchResponse(BaseModel):
    """Schema for message search results"""
    messages: List[MessageResponse]
    total_results: int
    search_time_ms: int
    facets: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Search facets for filtering"
    )