from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from decimal import Decimal
from ..database import get_db
from ..models.influencer import Influencer
from ..models.collaboration import Collaboration
from ..models.collaboration_review import CollaborationReview
from ..models.platform_account import PlatformAccount
from ..models.user import User
from ..schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendedInfluencer,
    MatchTag
)
from ..utils.security import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/recommendations", tags=["达人推荐"])

WEIGHT_BUDGET_FIT = 25
WEIGHT_ENGAGEMENT = 25
WEIGHT_COLLAB_HISTORY = 20
WEIGHT_REVIEW_SCORE = 15
WEIGHT_FOLLOWER_FIT = 15


def compute_score(inf, req, collab_count, avg_review, platform_accounts):
    score = 0.0
    tags = []

    if req.max_budget is not None and inf.cost_per_post and float(inf.cost_per_post) > 0:
        ratio = float(req.max_budget) / float(inf.cost_per_post)
        if ratio >= 1:
            budget_score = min(ratio * 12, WEIGHT_BUDGET_FIT)
            score += budget_score
            tags.append(MatchTag(label="报价合适", type="success"))
        elif ratio >= 0.8:
            budget_score = ratio * 20
            score += budget_score
        else:
            budget_score = ratio * 10
            score += budget_score
    else:
        score += WEIGHT_BUDGET_FIT * 0.6

    if inf.engagement_rate and float(inf.engagement_rate) > 0:
        er = float(inf.engagement_rate)
        if er >= 5:
            score += WEIGHT_ENGAGEMENT
            tags.append(MatchTag(label="互动表现突出", type="success"))
        elif er >= 3:
            score += WEIGHT_ENGAGEMENT * 0.7
        elif er >= 1:
            score += WEIGHT_ENGAGEMENT * 0.4
        else:
            score += WEIGHT_ENGAGEMENT * 0.2
    else:
        score += WEIGHT_ENGAGEMENT * 0.3

    if collab_count > 0:
        if collab_count >= 5:
            score += WEIGHT_COLLAB_HISTORY
            tags.append(MatchTag(label="历史合作丰富", type="primary"))
        elif collab_count >= 3:
            score += WEIGHT_COLLAB_HISTORY * 0.8
            tags.append(MatchTag(label="有过多次合作", type="primary"))
        elif collab_count >= 1:
            score += WEIGHT_COLLAB_HISTORY * 0.5
            tags.append(MatchTag(label="有过合作经历", type="gray"))
    else:
        score += WEIGHT_COLLAB_HISTORY * 0.1

    if avg_review is not None and avg_review > 0:
        review_ratio = avg_review / 5.0
        score += WEIGHT_REVIEW_SCORE * review_ratio
        if avg_review >= 4.0:
            tags.append(MatchTag(label="口碑优秀", type="success"))
        elif avg_review >= 3.0:
            tags.append(MatchTag(label="口碑良好", type="primary"))
    else:
        score += WEIGHT_REVIEW_SCORE * 0.4

    if req.min_followers is not None or req.max_followers is not None:
        followers = inf.followers or 0
        mid = 0
        if req.min_followers and req.max_followers:
            mid = (req.min_followers + req.max_followers) / 2
        elif req.min_followers:
            mid = req.min_followers * 2
        elif req.max_followers:
            mid = req.max_followers / 2
        if mid > 0 and followers > 0:
            ratio = min(followers / mid, mid / followers)
            score += WEIGHT_FOLLOWER_FIT * ratio
            if ratio >= 0.8:
                tags.append(MatchTag(label="粉丝量匹配", type="primary"))
        else:
            score += WEIGHT_FOLLOWER_FIT * 0.3
    else:
        score += WEIGHT_FOLLOWER_FIT * 0.5

    return round(score, 2), tags


@router.post("", response_model=RecommendationResponse, summary="达人智能推荐")
async def recommend_influencers(
    req: RecommendationRequest,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Influencer).options(
        joinedload(Influencer.category)
    ).filter(Influencer.status == "active")

    if req.platform:
        query = query.filter(Influencer.platform == req.platform)
    if req.category_id:
        query = query.filter(Influencer.category_id == req.category_id)
    if req.min_followers is not None:
        query = query.filter(Influencer.followers >= req.min_followers)
    if req.max_followers is not None:
        query = query.filter(Influencer.followers <= req.max_followers)
    if req.max_budget is not None:
        query = query.filter(Influencer.cost_per_post <= req.max_budget)
    if req.min_engagement_rate is not None:
        query = query.filter(Influencer.engagement_rate >= req.min_engagement_rate)

    influencers = query.all()
    logger.info(
        f"Recommendation query by {current_user.username}: "
        f"platform={req.platform}, category={req.category_id}, "
        f"budget<={req.max_budget}, engagement>={req.min_engagement_rate}, "
        f"found {len(influencers)} candidates"
    )

    results = []
    for inf in influencers:
        collab_count = db.query(Collaboration).filter(
            Collaboration.influencer_id == inf.id
        ).count()

        review_result = db.query(
            func.avg(
                (CollaborationReview.content_quality +
                 CollaborationReview.cooperation_level +
                 CollaborationReview.delivery_effect) / 3.0
            )
        ).filter(
            CollaborationReview.influencer_id == inf.id
        ).scalar()
        avg_review = float(review_result) if review_result else None

        accounts = db.query(PlatformAccount).filter(
            PlatformAccount.influencer_id == inf.id
        ).order_by(PlatformAccount.is_primary.desc(), PlatformAccount.id.asc()).all()

        primary = next((a for a in accounts if a.is_primary), accounts[0] if accounts else None)
        display_platform = primary.platform if primary else inf.platform
        display_account_id = primary.account_id if primary else inf.account_id
        display_followers = primary.followers if primary else inf.followers

        score, match_tags = compute_score(inf, req, collab_count, avg_review, accounts)

        results.append(RecommendedInfluencer(
            id=inf.id,
            name=inf.name,
            platform=display_platform,
            account_id=display_account_id,
            avatar=inf.avatar,
            followers=display_followers,
            category_id=inf.category_id,
            cost_per_post=inf.cost_per_post,
            engagement_rate=inf.engagement_rate,
            status=inf.status,
            province=inf.province,
            tags=inf.tags,
            category=inf.category,
            collaboration_count=collab_count,
            platform_account_count=len(accounts),
            score=score,
            match_tags=match_tags
        ))

    results.sort(key=lambda x: x.score, reverse=True)
    results = results[:limit]

    return RecommendationResponse(items=results, total=len(results))
