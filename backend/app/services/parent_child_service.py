"""
Parent-Child Relationship Service
Handles linking parents to their children and managing relationships
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from fastapi import HTTPException
import secrets
import uuid

from app.models.user import User, UserRole
from app.models.parent_child import ParentChildRelationship, ParentChildInvitation, RelationshipType
from app.services.parent_notification_service import ParentNotificationService


class ParentChildService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = ParentNotificationService(db)

    def get_parent_children(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get all children linked to a parent"""
        relationships = self.db.query(ParentChildRelationship).filter(
            and_(
                ParentChildRelationship.parent_id == parent_id,
                ParentChildRelationship.is_active == True
            )
        ).all()
        
        children = []
        for rel in relationships:
            child = rel.child
            children.append({
                "id": str(child.id),
                "name": child.full_name,
                "email": child.email,
                "grade": child.grade,
                "medium": child.medium.value if child.medium else None,
                "relationship_type": rel.relationship_type,
                "is_primary": rel.is_primary,
                "is_verified": rel.is_verified,
                "linked_at": rel.created_at,
                "last_login": child.last_login
            })
        
        return children

    def invite_child_by_email(
        self, 
        parent_id: str, 
        child_email: str, 
        child_name: Optional[str] = None,
        relationship_type: str = RelationshipType.GUARDIAN.value
    ) -> Dict[str, Any]:
        """Send invitation to link a child by email"""
        
        # Verify parent exists and has parent role
        parent = self.db.query(User).filter(
            and_(User.id == parent_id, User.role == UserRole.PARENT)
        ).first()
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")
        
        # Check if child already exists and is already linked
        existing_child = self.db.query(User).filter(User.email == child_email).first()
        if existing_child:
            existing_relationship = self.db.query(ParentChildRelationship).filter(
                and_(
                    ParentChildRelationship.parent_id == parent_id,
                    ParentChildRelationship.child_id == existing_child.id,
                    ParentChildRelationship.is_active == True
                )
            ).first()
            
            if existing_relationship:
                raise HTTPException(status_code=400, detail="Child is already linked to this parent")
        
        # Check for existing pending invitation
        existing_invitation = self.db.query(ParentChildInvitation).filter(
            and_(
                ParentChildInvitation.parent_id == parent_id,
                ParentChildInvitation.child_email == child_email,
                ParentChildInvitation.status == "pending",
                ParentChildInvitation.expires_at > datetime.utcnow()
            )
        ).first()
        
        if existing_invitation:
            raise HTTPException(status_code=400, detail="Invitation already sent to this email")
        
        # Create invitation
        invitation_code = secrets.token_urlsafe(32)
        invitation = ParentChildInvitation(
            parent_id=parent_id,
            child_email=child_email,
            child_name=child_name,
            relationship_type=relationship_type,
            invitation_code=invitation_code,
            expires_at=datetime.utcnow() + timedelta(days=7)  # 7 days to accept
        )
        
        self.db.add(invitation)
        self.db.commit()
        
        # Send email notification (mock for now)
        self._send_invitation_email(parent.full_name, child_email, invitation_code)
        
        return {
            "invitation_id": str(invitation.id),
            "child_email": child_email,
            "invitation_code": invitation_code,
            "expires_at": invitation.expires_at,
            "status": "sent"
        }

    def accept_invitation(self, invitation_code: str, child_id: str) -> Dict[str, Any]:
        """Accept a parent-child invitation"""
        
        # Find invitation
        invitation = self.db.query(ParentChildInvitation).filter(
            and_(
                ParentChildInvitation.invitation_code == invitation_code,
                ParentChildInvitation.status == "pending",
                ParentChildInvitation.expires_at > datetime.utcnow()
            )
        ).first()
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invalid or expired invitation")
        
        # Verify child
        child = self.db.query(User).filter(
            and_(
                User.id == child_id,
                User.role == UserRole.STUDENT,
                User.email == invitation.child_email
            )
        ).first()
        
        if not child:
            raise HTTPException(status_code=404, detail="Child not found or email mismatch")
        
        # Check if relationship already exists
        existing_relationship = self.db.query(ParentChildRelationship).filter(
            and_(
                ParentChildRelationship.parent_id == invitation.parent_id,
                ParentChildRelationship.child_id == child_id,
                ParentChildRelationship.is_active == True
            )
        ).first()
        
        if existing_relationship:
            # Update invitation status
            invitation.status = "accepted"
            invitation.accepted_at = datetime.utcnow()
            invitation.accepted_by = child_id
            self.db.commit()
            
            return {
                "message": "Relationship already exists",
                "relationship_id": str(existing_relationship.id)
            }
        
        # Create parent-child relationship
        relationship = ParentChildRelationship(
            parent_id=invitation.parent_id,
            child_id=child_id,
            relationship_type=invitation.relationship_type,
            is_primary=True,  # First relationship is primary
            is_verified=True,  # Auto-verify email-based invitations
            verification_method="email",
            verified_at=datetime.utcnow(),
            created_by=child_id
        )
        
        self.db.add(relationship)
        
        # Update invitation status
        invitation.status = "accepted"
        invitation.accepted_at = datetime.utcnow()
        invitation.accepted_by = child_id
        
        self.db.commit()
        
        # Send confirmation notifications
        parent = self.db.query(User).filter(User.id == invitation.parent_id).first()
        self._send_relationship_confirmation(parent, child)
        
        return {
            "message": "Parent-child relationship established successfully",
            "relationship_id": str(relationship.id),
            "parent_name": parent.full_name,
            "child_name": child.full_name
        }

    def link_child_directly(
        self, 
        parent_id: str, 
        child_id: str, 
        relationship_type: str = RelationshipType.GUARDIAN.value
    ) -> Dict[str, Any]:
        """Directly link a child to parent (for admin or verified scenarios)"""
        
        # Verify parent and child exist
        parent = self.db.query(User).filter(
            and_(User.id == parent_id, User.role == UserRole.PARENT)
        ).first()
        
        child = self.db.query(User).filter(
            and_(User.id == child_id, User.role == UserRole.STUDENT)
        ).first()
        
        if not parent or not child:
            raise HTTPException(status_code=404, detail="Parent or child not found")
        
        # Check if relationship already exists
        existing_relationship = self.db.query(ParentChildRelationship).filter(
            and_(
                ParentChildRelationship.parent_id == parent_id,
                ParentChildRelationship.child_id == child_id,
                ParentChildRelationship.is_active == True
            )
        ).first()
        
        if existing_relationship:
            raise HTTPException(status_code=400, detail="Relationship already exists")
        
        # Create relationship
        relationship = ParentChildRelationship(
            parent_id=parent_id,
            child_id=child_id,
            relationship_type=relationship_type,
            is_primary=True,
            is_verified=False,  # Requires verification for direct links
            created_by=parent_id
        )
        
        self.db.add(relationship)
        self.db.commit()
        
        return {
            "message": "Child linked successfully",
            "relationship_id": str(relationship.id),
            "verification_required": True
        }

    def remove_child_relationship(self, parent_id: str, child_id: str) -> Dict[str, Any]:
        """Remove parent-child relationship"""
        
        relationship = self.db.query(ParentChildRelationship).filter(
            and_(
                ParentChildRelationship.parent_id == parent_id,
                ParentChildRelationship.child_id == child_id,
                ParentChildRelationship.is_active == True
            )
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")
        
        # Soft delete
        relationship.is_active = False
        relationship.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {"message": "Child relationship removed successfully"}

    def get_pending_invitations(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get pending invitations sent by a parent"""
        
        invitations = self.db.query(ParentChildInvitation).filter(
            and_(
                ParentChildInvitation.parent_id == parent_id,
                ParentChildInvitation.status == "pending",
                ParentChildInvitation.expires_at > datetime.utcnow()
            )
        ).all()
        
        return [
            {
                "id": str(inv.id),
                "child_email": inv.child_email,
                "child_name": inv.child_name,
                "relationship_type": inv.relationship_type,
                "invitation_code": inv.invitation_code,
                "expires_at": inv.expires_at,
                "created_at": inv.created_at
            }
            for inv in invitations
        ]

    def search_students_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Search for students by email (for linking)"""
        
        students = self.db.query(User).filter(
            and_(
                User.role == UserRole.STUDENT,
                User.email.ilike(f"%{email}%"),
                User.is_active == True
            )
        ).limit(10).all()
        
        return [
            {
                "id": str(student.id),
                "name": student.full_name,
                "email": student.email,
                "grade": student.grade,
                "medium": student.medium.value if student.medium else None
            }
            for student in students
        ]

    def _send_invitation_email(self, parent_name: str, child_email: str, invitation_code: str):
        """Send invitation email to child (mock implementation)"""
        print(f"📧 Sending invitation email:")
        print(f"   To: {child_email}")
        print(f"   From: {parent_name}")
        print(f"   Code: {invitation_code}")
        print(f"   Link: http://localhost:5173/accept-invitation/{invitation_code}")

    def _send_relationship_confirmation(self, parent: User, child: User):
        """Send confirmation notifications (mock implementation)"""
        print(f"✅ Parent-child relationship confirmed:")
        print(f"   Parent: {parent.full_name} ({parent.email})")
        print(f"   Child: {child.full_name} ({child.email})")