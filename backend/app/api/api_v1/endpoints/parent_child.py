"""
Parent-Child Relationship API Endpoints
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.services.parent_child_service import ParentChildService

router = APIRouter()


class InviteChildRequest(BaseModel):
    child_email: EmailStr
    child_name: str = None
    relationship_type: str = "guardian"


class LinkChildRequest(BaseModel):
    child_id: str
    relationship_type: str = "guardian"


class AcceptInvitationRequest(BaseModel):
    invitation_code: str


@router.post("/invite-child")
def invite_child_by_email(
    request: InviteChildRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Send invitation to link a child by email"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can invite children")
    
    service = ParentChildService(db)
    return service.invite_child_by_email(
        parent_id=str(current_user.id),
        child_email=request.child_email,
        child_name=request.child_name,
        relationship_type=request.relationship_type
    )


@router.post("/link-child")
def link_child_directly(
    request: LinkChildRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Directly link a child to parent"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can link children")
    
    service = ParentChildService(db)
    return service.link_child_directly(
        parent_id=str(current_user.id),
        child_id=request.child_id,
        relationship_type=request.relationship_type
    )


@router.post("/accept-invitation")
def accept_parent_invitation(
    request: AcceptInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Accept a parent-child invitation"""
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can accept parent invitations")
    
    service = ParentChildService(db)
    return service.accept_invitation(
        invitation_code=request.invitation_code,
        child_id=str(current_user.id)
    )


@router.get("/my-children")
def get_my_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all children linked to the current parent"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can view children")
    
    service = ParentChildService(db)
    children = service.get_parent_children(str(current_user.id))
    
    return {
        "success": True,
        "data": {
            "children": children,
            "total": len(children)
        }
    }


@router.get("/pending-invitations")
def get_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get pending invitations sent by the current parent"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can view invitations")
    
    service = ParentChildService(db)
    invitations = service.get_pending_invitations(str(current_user.id))
    
    return {
        "success": True,
        "data": {
            "invitations": invitations,
            "total": len(invitations)
        }
    }


@router.get("/search-students")
def search_students(
    email: str = Query(..., min_length=3),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Search for students by email"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can search students")
    
    service = ParentChildService(db)
    students = service.search_students_by_email(email)
    
    return {
        "success": True,
        "data": {
            "students": students,
            "total": len(students)
        }
    }


@router.delete("/children/{child_id}")
def remove_child_relationship(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Remove parent-child relationship"""
    
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can remove children")
    
    service = ParentChildService(db)
    return service.remove_child_relationship(
        parent_id=str(current_user.id),
        child_id=child_id
    )