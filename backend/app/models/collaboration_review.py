"""
Collaboration Review Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class CollaborationReview(Base):
    """Collaboration review model - ratings and feedback for completed collaborations"""
    __tablename__ = "collaboration_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    collaboration_id = Column(Integer, ForeignKey("collaborations.id"), nullable=False, unique=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    content_quality = Column(Integer, nullable=False)
    cooperation_level = Column(Integer, nullable=False)
    delivery_effect = Column(Integer, nullable=False)
    
    comment = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    collaboration = relationship("Collaboration", back_populates="review")
    influencer = relationship("Influencer", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")
    
    __table_args__ = (
        CheckConstraint('content_quality >= 1 AND content_quality <= 5', name='check_content_quality'),
        CheckConstraint('cooperation_level >= 1 AND cooperation_level <= 5', name='check_cooperation_level'),
        CheckConstraint('delivery_effect >= 1 AND delivery_effect <= 5', name='check_delivery_effect'),
    )
