"""
Snapshots Router - 经营快照路由
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..dependencies import get_db, get_current_user, get_operator_or_admin
from ..models.snapshot import Snapshot
from ..models.influencer import Influencer
from ..models.collaboration import Collaboration
from ..models.category import Category
from ..models.user import User
from ..schemas.snapshot import (
    SnapshotCreate,
    SnapshotResponse,
    SnapshotCompareRequest,
    SnapshotCompareResponse,
    IndicatorDiff
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/snapshots", tags=["经营快照"])

INDICATOR_LABELS = {
    "influencers_total": "网红总量",
    "influencers_active": "活跃网红",
    "collaborations_total": "合作项目总数",
    "collaborations_active": "进行中合作",
    "collaborations_completed": "已完成合作",
    "followers": "总粉丝覆盖",
    "budget_total": "投放预算",
    "budget_spent": "已支出预算",
    "engagement_views": "总播放/阅读",
    "engagement_likes": "总点赞",
    "engagement_comments": "总评论",
    "engagement_shares": "总分享",
    "categories": "分类数量",
}

INDICATOR_ORDER = [
    "influencers_total",
    "influencers_active",
    "collaborations_total",
    "collaborations_active",
    "collaborations_completed",
    "followers",
    "budget_total",
    "budget_spent",
    "engagement_views",
    "engagement_likes",
    "engagement_comments",
    "engagement_shares",
    "categories",
]


def _build_indicators(db: Session) -> dict:
    total_influencers = db.query(Influencer).count()
    active_influencers = db.query(Influencer).filter(Influencer.status == "active").count()
    total_collaborations = db.query(Collaboration).count()
    active_collaborations = db.query(Collaboration).filter(Collaboration.status == "in_progress").count()
    completed_collaborations = db.query(Collaboration).filter(Collaboration.status == "completed").count()
    total_followers = db.query(func.sum(Influencer.followers)).scalar() or 0
    total_budget = db.query(func.sum(Collaboration.budget)).scalar() or 0
    total_cost = db.query(func.sum(Collaboration.actual_cost)).scalar() or 0
    total_views = db.query(func.sum(Collaboration.views)).scalar() or 0
    total_likes = db.query(func.sum(Collaboration.likes)).scalar() or 0
    total_comments = db.query(func.sum(Collaboration.comments)).scalar() or 0
    total_shares = db.query(func.sum(Collaboration.shares)).scalar() or 0
    total_categories = db.query(Category).count()

    return {
        "influencers_total": total_influencers,
        "influencers_active": active_influencers,
        "collaborations_total": total_collaborations,
        "collaborations_active": active_collaborations,
        "collaborations_completed": completed_collaborations,
        "followers": int(total_followers),
        "budget_total": float(total_budget),
        "budget_spent": float(total_cost),
        "engagement_views": int(total_views),
        "engagement_likes": int(total_likes),
        "engagement_comments": int(total_comments),
        "engagement_shares": int(total_shares),
        "categories": total_categories,
    }


def _snapshot_to_response(snapshot: Snapshot) -> SnapshotResponse:
    indicators = json.loads(snapshot.indicators) if isinstance(snapshot.indicators, str) else snapshot.indicators
    creator_name = snapshot.creator.nickname or snapshot.creator.username if snapshot.creator else None
    return SnapshotResponse(
        id=snapshot.id,
        name=snapshot.name,
        indicators=indicators,
        user_id=snapshot.user_id,
        created_at=snapshot.created_at,
        creator_name=creator_name,
    )


@router.get("", response_model=List[SnapshotResponse], summary="获取快照列表")
async def list_snapshots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snapshots = db.query(Snapshot).order_by(Snapshot.created_at.desc()).all()
    return [_snapshot_to_response(s) for s in snapshots]


@router.post("", response_model=SnapshotResponse, summary="创建经营快照")
async def create_snapshot(
    data: SnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin),
):
    indicators = _build_indicators(db)
    snapshot = Snapshot(
        name=data.name,
        indicators=json.dumps(indicators, ensure_ascii=False),
        user_id=current_user.id,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    logger.info(f"Snapshot created: {data.name} by {current_user.username}")
    return _snapshot_to_response(snapshot)


@router.get("/{snapshot_id}", response_model=SnapshotResponse, summary="获取快照详情")
async def get_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snapshot = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="快照不存在")
    return _snapshot_to_response(snapshot)


@router.delete("/{snapshot_id}", summary="删除快照")
async def delete_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin),
):
    snapshot = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="快照不存在")
    db.delete(snapshot)
    db.commit()
    logger.info(f"Snapshot deleted: {snapshot.name} by {current_user.username}")
    return {"message": "快照已删除"}


@router.post("/compare", response_model=SnapshotCompareResponse, summary="对比两次快照")
async def compare_snapshots(
    data: SnapshotCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snap_a = db.query(Snapshot).filter(Snapshot.id == data.snapshot_id_a).first()
    snap_b = db.query(Snapshot).filter(Snapshot.id == data.snapshot_id_b).first()
    if not snap_a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="快照A不存在")
    if not snap_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="快照B不存在")

    ind_a = json.loads(snap_a.indicators) if isinstance(snap_a.indicators, str) else snap_a.indicators
    ind_b = json.loads(snap_b.indicators) if isinstance(snap_b.indicators, str) else snap_b.indicators

    diffs = []
    for key in INDICATOR_ORDER:
        val_a = ind_a.get(key, 0)
        val_b = ind_b.get(key, 0)
        diff = None
        percent = None
        try:
            fa = float(val_a)
            fb = float(val_b)
            diff = fb - fa
            if fa != 0:
                percent = round((diff / abs(fa)) * 100, 2)
            elif diff != 0:
                percent = None
        except (ValueError, TypeError):
            pass

        diffs.append(IndicatorDiff(
            label=INDICATOR_LABELS.get(key, key),
            value_a=val_a,
            value_b=val_b,
            diff=diff,
            percent=percent,
        ))

    return SnapshotCompareResponse(
        snapshot_a=_snapshot_to_response(snap_a),
        snapshot_b=_snapshot_to_response(snap_b),
        indicators=diffs,
    )
