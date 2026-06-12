from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from .influencer import CategoryBrief


class RecommendationRequest(BaseModel):
    platform: Optional[str] = None
    category_id: Optional[int] = None
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    max_budget: Optional[Decimal] = None
    min_engagement_rate: Optional[Decimal] = None


class MatchTag(BaseModel):
    label: str
    type: str


class RecommendedInfluencer(BaseModel):
    id: int
    name: str
    platform: str
    account_id: Optional[str] = None
    avatar: Optional[str] = None
    followers: int
    category_id: Optional[int] = None
    cost_per_post: Decimal
    engagement_rate: Decimal
    status: str
    province: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[CategoryBrief] = None
    collaboration_count: int = 0
    platform_account_count: int = 0
    score: float
    match_tags: List[MatchTag] = []


class RecommendationResponse(BaseModel):
    items: List[RecommendedInfluencer]
    total: int
