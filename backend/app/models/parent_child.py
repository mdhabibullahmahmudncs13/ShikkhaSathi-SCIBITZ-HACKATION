"""
Parent-Child Relationship Models
Database models for linking parents to their children
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
import enum

from app.db.session import Base


class RelationshipType(str, enum.Enum):
    MOTHER = "mother"
    FATHER = "father"
    GUARDIAN = "guardian"
    STEPMOTHER = "stepmother"
    STEPFATHER = "stepfather"
    GRANDMOTHER = "grandmother"
    GRANDFATHER = "grandfather"
    OTHER = "other"


class ParentChildRelationship(Base):
    """Parent-Child relationship model"""
    __tablename__ = "parent_child_relationships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    child_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relationship details
    relationship_type = Column(String(20), nullable=False, default=RelationshipType.GUARDIAN.value)
    is_primary = Column(Boolean, default=True)  # Primary guardian for notifications
    is_emergency_contact = Column(Boolean, default=True)
    
    # Status and permissions
    is_active = Column(Boolean, default=True)
    can_view_progress = Column(Boolean, default=True)
    can_receive_notifications = Column(Boolean, default=True)
    can_communicate_with_teachers = Column(Boolean, default=True)
    
    # Verification status
    is_verified = Column(Boolean, default=False)  # For security
    verification_method = Column(String(50), nullable=True)  # email, phone, document
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    parent = relationship("User", foreign_keys=[parent_id], backref="children_relationships")
    child = relationship("User", foreign_keys=[child_id], backref="parent_relationships")
    verifier = relationship("User", foreign_keys=[verified_by])
    creator = relationship("User", foreign_keys=[created_by])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('parent_id', 'child_id', name='unique_parent_child'),
    )


class ParentChildInvitation(Base):
    """Invitations for parent-child relationships"""
    __tablename__ = "parent_child_invitations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Invitation details
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    child_email = Column(String(255), nullable=True)  # Optional - for email invites
    child_name = Column(String(255), nullable=True)  # Optional child name
    relationship_type = Column(String(20), nullable=False, default=RelationshipType.GUARDIAN.value)
    
    # Google Classroom-style invitation code
    invitation_code = Column(String(8), unique=True, nullable=False)  # e.g., "ABC12345"
    code_type = Column(String(20), default="parent_child")  # parent_child, class_join
    
    # Invitation status
    status = Column(String(20), default="pending")  # pending, accepted, rejected, expired
    
    # Expiration
    expires_at = Column(DateTime, nullable=False)
    
    # Response tracking
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = relationship("User", foreign_keys=[parent_id])
    accepter = relationship("User", foreign_keys=[accepted_by])