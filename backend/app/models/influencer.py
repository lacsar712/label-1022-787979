"""
Influencer Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Influencer(Base):
    """Influencer model"""
    __tablename__ = "influencers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    account_id = Column(String(100))
    avatar = Column(String(255))
    followers = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    contact_name = Column(String(50))
    contact_phone = Column(String(20))
    contact_email = Column(String(100))
    contact_wechat = Column(String(50))
    tags = Column(String(500))
    cost_per_post = Column(Numeric(12, 2), default=0)
    engagement_rate = Column(Numeric(5, 2), default=0)
    status = Column(String(20), default="active")
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="influencers")
    collaborations = relationship("Collaboration", back_populates="influencer")
    platform_accounts = relationship("PlatformAccount", back_populates="influencer", cascade="all, delete-orphan")
    reviews = relationship("CollaborationReview", back_populates="influencer")
