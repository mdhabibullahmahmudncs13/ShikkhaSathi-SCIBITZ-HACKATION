"""
Message API Endpoints

REST API endpoints for teacher messaging system including message CRUD,
recipient management, templates, and notification settings.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.message import MessageType, MessagePriority, DeliveryStatus
from app.services.message_service import MessageService
from app.schemas.message import (
    MessageCreate, MessageUpdate, MessageResponse, MessageListResponse,
    MessageTemplateCreate, MessageTemplateResponse, MessageStatisticsResponse,
    NotificationSettingsUpdate, NotificationSettingsResponse,
    RecipientSelectionRequest, RecipientSelectionResponse,
    MessagePreview, BulkMessageOperation, MessageSearchRequest, MessageSearchResponse
)

router = APIRouter()


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new message
    
    - **subject**: Message subject (required)
    - **content**: Message content (required)
    - **message_type**: Type of message (direct, group, class, announcement)
    - **priority**: Message priority (low, normal, high, urgent)
    - **recipient_ids**: List of recipient IDs
    - **scheduled_at**: Optional scheduled delivery time
    - **is_draft**: Whether message is a draft
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can send messages"
        )
    
    service = MessageService(db)
    try:
        return await service.create_message(current_user.id, message_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sent", response_model=List[MessageResponse])
async def get_sent_messages(
    message_type: Optional[MessageType] = Query(None, description="Filter by message type"),
    is_draft: Optional[bool] = Query(None, description="Filter by draft status"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to return"),
    offset: int = Query(0, ge=0, description="Number of messages to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages sent by the current teacher
    
    - **message_type**: Filter by message type
    - **is_draft**: Filter by draft status
    - **limit**: Maximum number of messages (1-100)
    - **offset**: Number of messages to skip for pagination
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access sent messages"
        )
    
    service = MessageService(db)
    return await service.get_teacher_messages(
        current_user.id, message_type, is_draft, limit, offset
    )


@router.get("/received", response_model=List[MessageResponse])
async def get_received_messages(
    message_type: Optional[MessageType] = Query(None, description="Filter by message type"),
    delivery_status: Optional[DeliveryStatus] = Query(None, description="Filter by delivery status"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to return"),
    offset: int = Query(0, ge=0, description="Number of messages to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages received by the current user
    
    - **message_type**: Filter by message type
    - **delivery_status**: Filter by delivery status
    - **limit**: Maximum number of messages (1-100)
    - **offset**: Number of messages to skip for pagination
    """
    service = MessageService(db)
    return await service.get_received_messages(
        current_user.id, message_type, delivery_status, limit, offset
    )


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific message by ID
    
    - **message_id**: UUID of the message to retrieve
    """
    service = MessageService(db)
    try:
        message = await service.get_message(message_id)
        
        # Check if user has access to this message
        if (message.sender_id != current_user.id and 
            not any(r.recipient_id == current_user.id for r in message.recipients)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this message"
            )
        
        return message
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: UUID,
    message_data: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a message (only sender can update)
    
    - **message_id**: UUID of the message to update
    - **message_data**: Updated message data
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update messages"
        )
    
    service = MessageService(db)
    try:
        # First check if message exists and user owns it
        message = await service.get_message(message_id)
        if message.sender_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only message sender can update"
            )
        
        # TODO: Implement update_message in service
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Message update not yet implemented"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a message (only sender can delete)
    
    - **message_id**: UUID of the message to delete
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can delete messages"
        )
    
    service = MessageService(db)
    success = await service.delete_message(message_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or access denied"
        )


@router.post("/{message_id}/read", status_code=status.HTTP_200_OK)
async def mark_message_read(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a message as read
    
    - **message_id**: UUID of the message to mark as read
    """
    service = MessageService(db)
    success = await service.mark_message_read(message_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or already read"
        )
    
    return {"message": "Message marked as read"}


@router.get("/statistics/overview", response_model=MessageStatisticsResponse)
async def get_message_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messaging statistics for the current teacher
    
    Returns overview of sent messages, delivery rates, and recent activity
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access message statistics"
        )
    
    service = MessageService(db)
    stats = await service.get_message_statistics(current_user.id)
    return MessageStatisticsResponse(**stats)


# Message Templates
@router.post("/templates", response_model=MessageTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_message_template(
    template_data: MessageTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new message template
    
    - **name**: Template name (required)
    - **subject_template**: Subject template with variables
    - **content_template**: Content template with variables
    - **is_public**: Whether template is available to all teachers
    - **category**: Template category for organization
    - **variables**: Template variable definitions
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create message templates"
        )
    
    service = MessageService(db)
    return await service.create_template(current_user.id, template_data)


@router.get("/templates", response_model=List[MessageTemplateResponse])
async def get_message_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get message templates available to the current teacher
    
    Returns both personal templates and public templates
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access message templates"
        )
    
    service = MessageService(db)
    return await service.get_teacher_templates(current_user.id)


# Recipient Selection Helper
@router.post("/recipients/preview", response_model=RecipientSelectionResponse)
async def preview_recipients(
    selection_request: RecipientSelectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview recipients for a message before sending
    
    - **message_type**: Type of message to determine recipient resolution
    - **class_ids**: Class IDs for class messages
    - **student_ids**: Specific student IDs for direct/group messages
    - **include_parents**: Whether to include parents in notifications
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can preview recipients"
        )
    
    # TODO: Implement recipient preview in service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Recipient preview not yet implemented"
    )


# Bulk Operations
@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_message_operation(
    operation_data: BulkMessageOperation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform bulk operations on messages
    
    - **message_ids**: List of message IDs to operate on
    - **operation**: Operation to perform (archive, delete, mark_read)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can perform bulk operations"
        )
    
    # TODO: Implement bulk operations in service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Bulk operations not yet implemented"
    )


# Message Search
@router.post("/search", response_model=MessageSearchResponse)
async def search_messages(
    search_request: MessageSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search messages with advanced filtering
    
    - **query**: Search query for subject/content
    - **message_type**: Filter by message type
    - **priority**: Filter by priority
    - **delivery_status**: Filter by delivery status
    - **date_from**: Start date for date range filter
    - **date_to**: End date for date range filter
    """
    # TODO: Implement message search in service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Message search not yet implemented"
    )