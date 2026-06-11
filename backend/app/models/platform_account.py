"""
Platform Account Model - Multi-platform account binding for Influencers
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class PlatformAccount(Base):
    """Platform Account model - stores multiple platform accounts for an influencer"""
    __tablename__ = "platform_accounts"

    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    account_id = Column(String(100))
    followers = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    influencer = relationship("Influencer", back_populates="platform_accounts")
