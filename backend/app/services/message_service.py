"""
Message Service

Business logic for teacher messaging system including message composition,
delivery, recipient management, and notification handling.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from uuid import UUID

from app.models.message import (
    Message, MessageRecipient, MessageThread, MessageTemplate, 
    MessageNotificationSettings, MessageType, MessagePriority, DeliveryStatus
)
from app.models.user import User
from app.models.teacher import Teacher, TeacherClass
from app.schemas.message import (
    MessageCreate, MessageUpdate, MessageResponse, MessageRecipientResponse,
    MessageThreadCreate, MessageThreadResponse, MessageTemplateCreate,
    MessageTemplateResponse, NotificationSettingsUpdate
)
from app.core.config import settings


class MessageService:
    """Service for managing teacher messaging system"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_message(
        self, 
        sender_id: str, 
        message_data: MessageCreate
    ) -> MessageResponse:
        """
        Create a new message with recipients
        
        Args:
            sender_id: ID of the message sender (teacher)
            message_data: Message creation data
            
        Returns:
            Created message with recipient information
        """
        # Validate sender is a teacher
        sender = self.db.query(User).filter(User.id == sender_id).first()
        if not sender or sender.role != "teacher":
            raise ValueError("Only teachers can send messages")
        
        # Create message
        message = Message(
            sender_id=sender_id,
            subject=message_data.subject,
            content=message_data.content,
            message_type=message_data.message_type,
            priority=message_data.priority,
            scheduled_at=message_data.scheduled_at,
            metadata=message_data.metadata,
            is_draft=message_data.is_draft
        )
        
        self.db.add(message)
        self.db.flush()  # Get message ID
        
        # Add recipients
        recipients = await self._resolve_recipients(
            sender_id, 
            message_data.recipient_ids,
            message_data.message_type
        )
        
        for recipient_id, recipient_type in recipients:
            message_recipient = MessageRecipient(
                message_id=message.id,
                recipient_id=recipient_id,
                recipient_type=recipient_type
            )
            self.db.add(message_recipient)
        
        self.db.commit()
        
        # Send message if not draft and not scheduled
        if not message.is_draft and not message.scheduled_at:
            await self._send_message(message.id)
        
        return await self.get_message(message.id)
    
    async def _resolve_recipients(
        self, 
        sender_id: str, 
        recipient_ids: List[str],
        message_type: MessageType
    ) -> List[tuple[str, str]]:
        """
        Resolve recipient IDs to actual recipients based on message type
        
        Args:
            sender_id: ID of the message sender
            recipient_ids: List of recipient IDs (could be student IDs, class IDs, etc.)
            message_type: Type of message to determine recipient resolution
            
        Returns:
            List of (recipient_id, recipient_type) tuples
        """
        recipients = []
        
        if message_type == MessageType.DIRECT:
            # Direct messages to specific users
            for recipient_id in recipient_ids:
                user = self.db.query(User).filter(User.id == recipient_id).first()
                if user:
                    recipients.append((recipient_id, user.role))
        
        elif message_type == MessageType.CLASS:
            # Messages to entire classes
            teacher = self.db.query(Teacher).filter(Teacher.user_id == sender_id).first()
            if not teacher:
                raise ValueError("Sender is not a teacher")
            
            for class_id in recipient_ids:
                # Get all students in the class
                teacher_class = self.db.query(TeacherClass).filter(
                    and_(
                        TeacherClass.teacher_id == teacher.id,
                        TeacherClass.id == class_id
                    )
                ).first()
                
                if teacher_class and teacher_class.student_ids:
                    for student_id in teacher_class.student_ids:
                        recipients.append((student_id, "student"))
                        
                        # Also add parents if they exist
                        student = self.db.query(User).filter(User.id == student_id).first()
                        if student and hasattr(student, 'parent_id') and student.parent_id:
                            recipients.append((student.parent_id, "parent"))
        
        elif message_type == MessageType.GROUP:
            # Messages to selected group of users
            for recipient_id in recipient_ids:
                user = self.db.query(User).filter(User.id == recipient_id).first()
                if user:
                    recipients.append((recipient_id, user.role))
        
        elif message_type == MessageType.ANNOUNCEMENT:
            # Public announcements to all students in teacher's classes
            teacher = self.db.query(Teacher).filter(Teacher.user_id == sender_id).first()
            if teacher:
                classes = self.db.query(TeacherClass).filter(
                    TeacherClass.teacher_id == teacher.id
                ).all()
                
                for teacher_class in classes:
                    if teacher_class.student_ids:
                        for student_id in teacher_class.student_ids:
                            recipients.append((student_id, "student"))
        
        return recipients
    
    async def _send_message(self, message_id: UUID) -> None:
        """
        Send a message and update delivery status
        
        Args:
            message_id: ID of the message to send
        """
        message = self.db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise ValueError("Message not found")
        
        # Update message sent timestamp
        message.sent_at = datetime.utcnow()
        
        # Update all recipients to sent status
        recipients = self.db.query(MessageRecipient).filter(
            MessageRecipient.message_id == message_id
        ).all()
        
        for recipient in recipients:
            recipient.delivery_status = DeliveryStatus.SENT
            recipient.delivered_at = datetime.utcnow()
            
            # TODO: Integrate with actual notification system
            # For now, mark as delivered immediately
            recipient.delivery_status = DeliveryStatus.DELIVERED
        
        self.db.commit()
    
    async def get_message(self, message_id: UUID) -> MessageResponse:
        """
        Get a message with recipient information
        
        Args:
            message_id: ID of the message
            
        Returns:
            Message with recipient details
        """
        message = self.db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise ValueError("Message not found")
        
        # Get recipients
        recipients = self.db.query(MessageRecipient).filter(
            MessageRecipient.message_id == message_id
        ).all()
        
        recipient_responses = []
        for recipient in recipients:
            user = self.db.query(User).filter(User.id == recipient.recipient_id).first()
            recipient_responses.append(MessageRecipientResponse(
                id=recipient.id,
                recipient_id=recipient.recipient_id,
                recipient_name=user.full_name if user else "Unknown",
                recipient_type=recipient.recipient_type,
                delivery_status=recipient.delivery_status,
                delivered_at=recipient.delivered_at,
                read_at=recipient.read_at,
                failure_reason=recipient.failure_reason
            ))
        
        return MessageResponse(
            id=message.id,
            sender_id=message.sender_id,
            sender_name=message.sender.full_name,
            subject=message.subject,
            content=message.content,
            message_type=message.message_type,
            priority=message.priority,
            created_at=message.created_at,
            scheduled_at=message.scheduled_at,
            sent_at=message.sent_at,
            metadata=message.metadata,
            is_draft=message.is_draft,
            is_archived=message.is_archived,
            recipients=recipient_responses
        )
    
    async def get_teacher_messages(
        self, 
        teacher_id: str,
        message_type: Optional[MessageType] = None,
        is_draft: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[MessageResponse]:
        """
        Get messages sent by a teacher
        
        Args:
            teacher_id: ID of the teacher
            message_type: Filter by message type
            is_draft: Filter by draft status
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of messages sent by the teacher
        """
        query = self.db.query(Message).filter(Message.sender_id == teacher_id)
        
        if message_type:
            query = query.filter(Message.message_type == message_type)
        
        if is_draft is not None:
            query = query.filter(Message.is_draft == is_draft)
        
        messages = query.order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
        
        result = []
        for message in messages:
            result.append(await self.get_message(message.id))
        
        return result
    
    async def get_received_messages(
        self, 
        user_id: str,
        message_type: Optional[MessageType] = None,
        delivery_status: Optional[DeliveryStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[MessageResponse]:
        """
        Get messages received by a user
        
        Args:
            user_id: ID of the recipient user
            message_type: Filter by message type
            delivery_status: Filter by delivery status
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of messages received by the user
        """
        query = self.db.query(Message).join(MessageRecipient).filter(
            MessageRecipient.recipient_id == user_id
        )
        
        if message_type:
            query = query.filter(Message.message_type == message_type)
        
        if delivery_status:
            query = query.filter(MessageRecipient.delivery_status == delivery_status)
        
        messages = query.order_by(desc(Message.created_at)).offset(offset).limit(limit).all()
        
        result = []
        for message in messages:
            result.append(await self.get_message(message.id))
        
        return result
    
    async def mark_message_read(self, message_id: UUID, user_id: str) -> bool:
        """
        Mark a message as read by a specific user
        
        Args:
            message_id: ID of the message
            user_id: ID of the user marking as read
            
        Returns:
            True if successfully marked as read
        """
        recipient = self.db.query(MessageRecipient).filter(
            and_(
                MessageRecipient.message_id == message_id,
                MessageRecipient.recipient_id == user_id
            )
        ).first()
        
        if recipient and recipient.delivery_status != DeliveryStatus.READ:
            recipient.delivery_status = DeliveryStatus.READ
            recipient.read_at = datetime.utcnow()
            self.db.commit()
            return True
        
        return False
    
    async def delete_message(self, message_id: UUID, user_id: str) -> bool:
        """
        Delete a message (only sender can delete)
        
        Args:
            message_id: ID of the message to delete
            user_id: ID of the user requesting deletion
            
        Returns:
            True if successfully deleted
        """
        message = self.db.query(Message).filter(
            and_(
                Message.id == message_id,
                Message.sender_id == user_id
            )
        ).first()
        
        if message:
            self.db.delete(message)
            self.db.commit()
            return True
        
        return False
    
    async def get_message_statistics(self, teacher_id: str) -> Dict[str, Any]:
        """
        Get messaging statistics for a teacher
        
        Args:
            teacher_id: ID of the teacher
            
        Returns:
            Dictionary with messaging statistics
        """
        # Total messages sent
        total_sent = self.db.query(func.count(Message.id)).filter(
            Message.sender_id == teacher_id
        ).scalar()
        
        # Messages by type
        type_counts = self.db.query(
            Message.message_type,
            func.count(Message.id)
        ).filter(
            Message.sender_id == teacher_id
        ).group_by(Message.message_type).all()
        
        # Delivery statistics
        delivery_stats = self.db.query(
            MessageRecipient.delivery_status,
            func.count(MessageRecipient.id)
        ).join(Message).filter(
            Message.sender_id == teacher_id
        ).group_by(MessageRecipient.delivery_status).all()
        
        # Recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_messages = self.db.query(func.count(Message.id)).filter(
            and_(
                Message.sender_id == teacher_id,
                Message.created_at >= thirty_days_ago
            )
        ).scalar()
        
        return {
            "total_messages_sent": total_sent,
            "messages_by_type": {msg_type: count for msg_type, count in type_counts},
            "delivery_statistics": {status: count for status, count in delivery_stats},
            "recent_activity": recent_messages,
            "draft_messages": self.db.query(func.count(Message.id)).filter(
                and_(
                    Message.sender_id == teacher_id,
                    Message.is_draft == True
                )
            ).scalar()
        }
    
    # Message Templates
    async def create_template(
        self, 
        teacher_id: str, 
        template_data: MessageTemplateCreate
    ) -> MessageTemplateResponse:
        """Create a new message template"""
        template = MessageTemplate(
            name=template_data.name,
            description=template_data.description,
            subject_template=template_data.subject_template,
            content_template=template_data.content_template,
            created_by=teacher_id,
            is_public=template_data.is_public,
            category=template_data.category,
            variables=template_data.variables
        )
        
        self.db.add(template)
        self.db.commit()
        
        return MessageTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            subject_template=template.subject_template,
            content_template=template.content_template,
            created_by=template.created_by,
            created_at=template.created_at,
            updated_at=template.updated_at,
            is_public=template.is_public,
            category=template.category,
            variables=template.variables
        )
    
    async def get_teacher_templates(self, teacher_id: str) -> List[MessageTemplateResponse]:
        """Get templates available to a teacher"""
        templates = self.db.query(MessageTemplate).filter(
            or_(
                MessageTemplate.created_by == teacher_id,
                MessageTemplate.is_public == True
            )
        ).order_by(MessageTemplate.name).all()
        
        return [
            MessageTemplateResponse(
                id=template.id,
                name=template.name,
                description=template.description,
                subject_template=template.subject_template,
                content_template=template.content_template,
                created_by=template.created_by,
                created_at=template.created_at,
                updated_at=template.updated_at,
                is_public=template.is_public,
                category=template.category,
                variables=template.variables
            )
            for template in templates
        ]