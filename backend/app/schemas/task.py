"""
Task Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None
    sort_order: Optional[int] = None


class AssigneeBrief(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: int
    collaboration_id: int
    title: str
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None
    completed: bool
    sort_order: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[AssigneeBrief] = None
    creator: Optional[AssigneeBrief] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int


class OverdueCountResponse(BaseModel):
    overdue_count: int
