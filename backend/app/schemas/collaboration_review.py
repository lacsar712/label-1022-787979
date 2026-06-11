"""
Collaboration Review Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CollaborationReviewCreate(BaseModel):
    collaboration_id: int
    content_quality: int = Field(..., ge=1, le=5)
    cooperation_level: int = Field(..., ge=1, le=5)
    delivery_effect: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class CollaborationReviewUpdate(BaseModel):
    content_quality: Optional[int] = Field(None, ge=1, le=5)
    cooperation_level: Optional[int] = Field(None, ge=1, le=5)
    delivery_effect: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


class ReviewerBrief(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True


class CollaborationReviewResponse(BaseModel):
    id: int
    collaboration_id: int
    influencer_id: int
    user_id: int
    content_quality: int
    cooperation_level: int
    delivery_effect: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    reviewer: Optional[ReviewerBrief] = None
    
    class Config:
        from_attributes = True


class InfluencerReviewSummary(BaseModel):
    influencer_id: int
    total_reviews: int
    avg_content_quality: float
    avg_cooperation_level: float
    avg_delivery_effect: float
    avg_overall: float
