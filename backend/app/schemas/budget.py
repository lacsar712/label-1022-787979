"""
Budget Schemas - 季度预算管理Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class PlatformBudgetBase(BaseModel):
    year: int = Field(..., ge=2020, le=2100)
    quarter: int = Field(..., ge=1, le=4)
    platform: str = Field(..., min_length=1, max_length=50)
    budget_limit: Decimal = Field(..., ge=0)
    warning_threshold: Decimal = Field(default=80, ge=0, le=100)


class PlatformBudgetCreate(PlatformBudgetBase):
    pass


class PlatformBudgetUpdate(BaseModel):
    budget_limit: Optional[Decimal] = Field(None, ge=0)
    warning_threshold: Optional[Decimal] = Field(None, ge=0, le=100)


class PlatformBudgetResponse(BaseModel):
    id: int
    year: int
    quarter: int
    platform: str
    budget_limit: Decimal
    warning_threshold: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    used_amount: Decimal = Decimal('0')
    remaining_amount: Decimal = Decimal('0')
    usage_percentage: Decimal = Decimal('0')
    status: str = "normal"
    
    class Config:
        from_attributes = True


class PlatformBudgetListResponse(BaseModel):
    items: List[PlatformBudgetResponse]
    total: int
    year: int
    quarter: int


class BudgetCheckRequest(BaseModel):
    platform: str
    budget: Decimal
    start_date: Optional[str] = None
    collaboration_id: Optional[int] = None


class BudgetCheckResponse(BaseModel):
    year: int
    quarter: int
    platform: str
    budget_limit: Decimal
    used_amount: Decimal
    new_used_amount: Decimal
    remaining_amount: Decimal
    will_exceed: bool
    will_warn: bool
    warning_threshold: Decimal
    message: str
