"""
Platform Account Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PlatformAccountBase(BaseModel):
    platform: str = Field(..., min_length=1, max_length=50)
    account_id: Optional[str] = None
    followers: int = 0


class PlatformAccountCreate(PlatformAccountBase):
    is_primary: bool = False


class PlatformAccountUpdate(BaseModel):
    platform: Optional[str] = Field(None, min_length=1, max_length=50)
    account_id: Optional[str] = None
    followers: Optional[int] = None
    is_primary: Optional[bool] = None


class PlatformAccountResponse(BaseModel):
    id: int
    influencer_id: int
    platform: str
    account_id: Optional[str] = None
    followers: int
    is_primary: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
