"""
Snapshot Schemas - 经营快照Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class SnapshotCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class SnapshotResponse(BaseModel):
    id: int
    name: str
    indicators: Dict[str, Any]
    user_id: int
    created_at: datetime
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


class SnapshotCompareRequest(BaseModel):
    snapshot_id_a: int
    snapshot_id_b: int


class IndicatorDiff(BaseModel):
    label: str
    value_a: Any
    value_b: Any
    diff: Optional[float] = None
    percent: Optional[float] = None


class SnapshotCompareResponse(BaseModel):
    snapshot_a: SnapshotResponse
    snapshot_b: SnapshotResponse
    indicators: List[IndicatorDiff]
