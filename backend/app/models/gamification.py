from sqlalchemy import Column, Integer, Date, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Gamification(Base):
    __tablename__ = "gamification"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    total_xp = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    achievements = Column(JSON, default=list)  # Store achievements as JSON array
    last_activity_date = Column(Date, server_default=func.current_date())
    streak_freeze_count = Column(Integer, default=0)
    
    # Relationship
    user = relationship("User", back_populates="gamification")