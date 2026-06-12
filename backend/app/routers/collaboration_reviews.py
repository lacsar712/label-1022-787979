"""
Collaboration Reviews Router - 合作评价管理
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from ..dependencies import get_db, get_current_user, get_operator_or_admin
from ..models.collaboration import Collaboration
from ..models.collaboration_review import CollaborationReview
from ..models.user import User
from ..schemas.collaboration_review import (
    CollaborationReviewCreate,
    CollaborationReviewUpdate,
    CollaborationReviewResponse,
    InfluencerReviewSummary
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/collaboration-reviews", tags=["合作评价"])


@router.post("", response_model=CollaborationReviewResponse, summary="创建合作评价")
async def create_review(
    review_data: CollaborationReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建合作评价 - 每条合作仅可评价一次"""
    collaboration = db.query(Collaboration).filter(
        Collaboration.id == review_data.collaboration_id
    ).first()
    
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作记录不存在"
        )
    
    if collaboration.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅已完成的合作可评价"
        )
    
    existing_review = db.query(CollaborationReview).filter(
        CollaborationReview.collaboration_id == review_data.collaboration_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该合作已评价，不可重复评价"
        )
    
    new_review = CollaborationReview(
        **review_data.model_dump(),
        influencer_id=collaboration.influencer_id,
        user_id=current_user.id
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    new_review = db.query(CollaborationReview).options(
        joinedload(CollaborationReview.reviewer)
    ).filter(CollaborationReview.id == new_review.id).first()
    
    logger.info(f"Review created for collaboration {review_data.collaboration_id} by {current_user.username}")
    
    return new_review


@router.get("/collaboration/{collaboration_id}", response_model=CollaborationReviewResponse, summary="获取合作评价详情")
async def get_review_by_collaboration(
    collaboration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """根据合作ID获取评价"""
    review = db.query(CollaborationReview).options(
        joinedload(CollaborationReview.reviewer)
    ).filter(CollaborationReview.collaboration_id == collaboration_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="该合作暂无评价"
        )
    
    return review


@router.get("/influencer/{influencer_id}", response_model=List[CollaborationReviewResponse], summary="获取网红的所有评价")
async def get_influencer_reviews(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取指定网红的所有合作评价"""
    reviews = db.query(CollaborationReview).options(
        joinedload(CollaborationReview.reviewer)
    ).filter(
        CollaborationReview.influencer_id == influencer_id
    ).order_by(CollaborationReview.created_at.desc()).all()
    
    return reviews


@router.get("/influencer/{influencer_id}/summary", response_model=InfluencerReviewSummary, summary="获取网红评分汇总")
async def get_influencer_review_summary(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取网红的评分汇总 - 用于雷达图展示"""
    result = db.query(
        func.count(CollaborationReview.id).label("total"),
        func.avg(CollaborationReview.content_quality).label("avg_content_quality"),
        func.avg(CollaborationReview.cooperation_level).label("avg_cooperation_level"),
        func.avg(CollaborationReview.delivery_effect).label("avg_delivery_effect")
    ).filter(
        CollaborationReview.influencer_id == influencer_id
    ).first()
    
    total = result.total or 0
    avg_content_quality = float(result.avg_content_quality or 0)
    avg_cooperation_level = float(result.avg_cooperation_level or 0)
    avg_delivery_effect = float(result.avg_delivery_effect or 0)
    
    avg_overall = 0
    if total > 0:
        avg_overall = round((avg_content_quality + avg_cooperation_level + avg_delivery_effect) / 3, 2)
    
    return InfluencerReviewSummary(
        influencer_id=influencer_id,
        total_reviews=total,
        avg_content_quality=round(avg_content_quality, 2),
        avg_cooperation_level=round(avg_cooperation_level, 2),
        avg_delivery_effect=round(avg_delivery_effect, 2),
        avg_overall=avg_overall
    )


@router.put("/{review_id}", response_model=CollaborationReviewResponse, summary="更新合作评价")
async def update_review(
    review_id: int,
    review_data: CollaborationReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新合作评价"""
    review = db.query(CollaborationReview).filter(
        CollaborationReview.id == review_id
    ).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评价不存在"
        )
    
    update_data = review_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)
    
    db.commit()
    db.refresh(review)
    
    review = db.query(CollaborationReview).options(
        joinedload(CollaborationReview.reviewer)
    ).filter(CollaborationReview.id == review_id).first()
    
    logger.info(f"Review {review_id} updated by {current_user.username}")
    
    return review


@router.delete("/{review_id}", summary="删除合作评价")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除合作评价"""
    review = db.query(CollaborationReview).filter(
        CollaborationReview.id == review_id
    ).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评价不存在"
        )
    
    db.delete(review)
    db.commit()
    
    logger.info(f"Review {review_id} deleted by {current_user.username}")
    
    return {"message": "评价已删除"}
