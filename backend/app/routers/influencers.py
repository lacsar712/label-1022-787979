"""
Influencers Router - Influencer Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from ..database import get_db
from ..models.influencer import Influencer
from ..models.platform_account import PlatformAccount
from ..models.category import Category
from ..models.collaboration import Collaboration
from ..models.user import User
from ..schemas.influencer import (
    InfluencerCreate,
    InfluencerUpdate,
    InfluencerResponse,
    InfluencerListResponse
)
from ..schemas.user import SensitiveOperationRequest
from ..schemas.platform_account import (
    PlatformAccountCreate,
    PlatformAccountUpdate,
    PlatformAccountResponse
)
from ..utils.security import get_current_user, get_operator_or_admin, verify_password
from ..utils.logger import logger

router = APIRouter(prefix="/api/influencers", tags=["Influencer管理"])


def sync_legacy_platform_to_accounts(db: Session, influencer: Influencer):
    """将 influencers 表的旧平台字段同步为 platform_accounts 记录（兼容历史数据）"""
    accounts = db.query(PlatformAccount).filter(
        PlatformAccount.influencer_id == influencer.id
    ).all()

    if not accounts and influencer.platform:
        primary = PlatformAccount(
            influencer_id=influencer.id,
            platform=influencer.platform,
            account_id=influencer.account_id,
            followers=influencer.followers or 0,
            is_primary=True
        )
        db.add(primary)
        db.commit()


def build_influencer_response(db: Session, influencer: Influencer) -> InfluencerResponse:
    """构建 InfluencerResponse，包含平台账号信息"""
    collab_count = db.query(Collaboration).filter(
        Collaboration.influencer_id == influencer.id
    ).count()

    sync_legacy_platform_to_accounts(db, influencer)
    accounts = db.query(PlatformAccount).filter(
        PlatformAccount.influencer_id == influencer.id
    ).order_by(PlatformAccount.is_primary.desc(), PlatformAccount.id.asc()).all()

    primary = next((a for a in accounts if a.is_primary), accounts[0] if accounts else None)
    if primary:
        display_platform = primary.platform
        display_account_id = primary.account_id
        display_followers = primary.followers
    else:
        display_platform = influencer.platform
        display_account_id = influencer.account_id
        display_followers = influencer.followers

    return InfluencerResponse(
        id=influencer.id,
        name=influencer.name,
        platform=display_platform,
        account_id=display_account_id,
        avatar=influencer.avatar,
        followers=display_followers,
        category_id=influencer.category_id,
        contact_name=influencer.contact_name,
        contact_phone=influencer.contact_phone,
        contact_email=influencer.contact_email,
        contact_wechat=influencer.contact_wechat,
        tags=influencer.tags,
        cost_per_post=influencer.cost_per_post,
        engagement_rate=influencer.engagement_rate,
        status=influencer.status,
        province=influencer.province,
        notes=influencer.notes,
        created_at=influencer.created_at,
        updated_at=influencer.updated_at,
        category=influencer.category,
        collaboration_count=collab_count,
        platform_accounts=accounts,
        platform_account_count=len(accounts)
    )


@router.get("", response_model=InfluencerListResponse, summary="获取Influencer列表")
async def get_influencers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    platform: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    province: Optional[str] = None,
    min_followers: Optional[int] = None,
    max_followers: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取Influencer列表
    - 支持分页
    - 支持多维度筛选
    """
    query = db.query(Influencer).options(joinedload(Influencer.category))
    
    # Apply filters
    if keyword:
        query = query.filter(
            or_(
                Influencer.name.contains(keyword),
                Influencer.account_id.contains(keyword),
                Influencer.tags.contains(keyword)
            )
        )
    
    if platform:
        query = query.filter(Influencer.platform == platform)
    
    if category_id:
        query = query.filter(Influencer.category_id == category_id)
    
    if status:
        query = query.filter(Influencer.status == status)
    
    if province:
        query = query.filter(Influencer.province == province)
    
    if min_followers is not None:
        query = query.filter(Influencer.followers >= min_followers)
    
    if max_followers is not None:
        query = query.filter(Influencer.followers <= max_followers)
    
    # Get total count
    total = query.count()
    
    influencers = query.order_by(Influencer.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [build_influencer_response(db, inf) for inf in influencers]

    return InfluencerListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=InfluencerResponse, summary="创建Influencer")
async def create_influencer(
    influencer_data: InfluencerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建Influencer"""
    if influencer_data.category_id:
        category = db.query(Category).filter(Category.id == influencer_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )

    new_influencer = Influencer(**influencer_data.model_dump())
    db.add(new_influencer)
    db.flush()

    primary_account = PlatformAccount(
        influencer_id=new_influencer.id,
        platform=influencer_data.platform,
        account_id=influencer_data.account_id,
        followers=influencer_data.followers or 0,
        is_primary=True
    )
    db.add(primary_account)

    db.commit()
    db.refresh(new_influencer)

    logger.info(f"Influencer created: {new_influencer.name} by {current_user.username}")

    return build_influencer_response(db, new_influencer)


@router.get("/platforms", summary="获取平台列表")
async def get_platforms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有平台选项"""
    platforms = [
        {"value": "抖音", "label": "抖音"},
        {"value": "小红书", "label": "小红书"},
        {"value": "B站", "label": "B站"},
        {"value": "微博", "label": "微博"},
        {"value": "快手", "label": "快手"},
        {"value": "微信", "label": "微信"},
        {"value": "YouTube", "label": "YouTube"},
        {"value": "Instagram", "label": "Instagram"},
        {"value": "TikTok", "label": "TikTok"},
        {"value": "其他", "label": "其他"}
    ]
    return platforms


@router.get("/provinces", summary="获取省份列表")
async def get_provinces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有省份选项"""
    provinces = [
        {"value": "北京", "label": "北京"},
        {"value": "上海", "label": "上海"},
        {"value": "广东", "label": "广东"},
        {"value": "江苏", "label": "江苏"},
        {"value": "浙江", "label": "浙江"},
        {"value": "山东", "label": "山东"},
        {"value": "四川", "label": "四川"},
        {"value": "河南", "label": "河南"},
        {"value": "湖北", "label": "湖北"},
        {"value": "湖南", "label": "湖南"},
        {"value": "福建", "label": "福建"},
        {"value": "陕西", "label": "陕西"},
        {"value": "安徽", "label": "安徽"},
        {"value": "辽宁", "label": "辽宁"},
        {"value": "重庆", "label": "重庆"},
        {"value": "天津", "label": "天津"},
        {"value": "江西", "label": "江西"},
        {"value": "广西", "label": "广西"},
        {"value": "云南", "label": "云南"},
        {"value": "山西", "label": "山西"},
        {"value": "贵州", "label": "贵州"},
        {"value": "黑龙江", "label": "黑龙江"},
        {"value": "吉林", "label": "吉林"},
        {"value": "甘肃", "label": "甘肃"},
        {"value": "内蒙古", "label": "内蒙古"},
        {"value": "新疆", "label": "新疆"},
        {"value": "海南", "label": "海南"},
        {"value": "宁夏", "label": "宁夏"},
        {"value": "青海", "label": "青海"},
        {"value": "西藏", "label": "西藏"},
        {"value": "香港", "label": "香港"},
        {"value": "澳门", "label": "澳门"},
        {"value": "台湾", "label": "台湾"}
    ]
    return provinces


@router.get("/{influencer_id}", response_model=InfluencerResponse, summary="获取Influencer详情")
async def get_influencer(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取Influencer详情"""
    influencer = db.query(Influencer).options(
        joinedload(Influencer.category)
    ).filter(Influencer.id == influencer_id).first()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )

    return build_influencer_response(db, influencer)


@router.put("/{influencer_id}", response_model=InfluencerResponse, summary="更新Influencer")
async def update_influencer(
    influencer_id: int,
    influencer_data: InfluencerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新Influencer"""
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )

    if influencer_data.category_id:
        category = db.query(Category).filter(Category.id == influencer_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )

    update_data = influencer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(influencer, field, value)

    db.commit()
    db.refresh(influencer)

    influencer = db.query(Influencer).options(
        joinedload(Influencer.category)
    ).filter(Influencer.id == influencer_id).first()

    logger.info(f"Influencer updated: {influencer.name} by {current_user.username}")

    return build_influencer_response(db, influencer)


@router.delete("/{influencer_id}", summary="删除Influencer")
async def delete_influencer(
    influencer_id: int,
    confirm_data: SensitiveOperationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    if not verify_password(confirm_data.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="密码验证失败，请输入正确的登录密码")
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )
    
    # Check for collaborations
    collab_count = db.query(Collaboration).filter(Collaboration.influencer_id == influencer_id).count()
    if collab_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该Influencer有 {collab_count} 条合作记录，无法删除"
        )
    
    db.delete(influencer)
    db.commit()

    logger.info(f"Influencer deleted: {influencer.name} by {current_user.username}")

    return {"message": "Influencer已删除"}


@router.get(
    "/{influencer_id}/platform-accounts",
    response_model=List[PlatformAccountResponse],
    summary="获取达人的所有平台账号"
)
async def get_platform_accounts(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )

    sync_legacy_platform_to_accounts(db, influencer)
    accounts = db.query(PlatformAccount).filter(
        PlatformAccount.influencer_id == influencer_id
    ).order_by(PlatformAccount.is_primary.desc(), PlatformAccount.id.asc()).all()
    return accounts


@router.post(
    "/{influencer_id}/platform-accounts",
    response_model=PlatformAccountResponse,
    summary="为达人新增平台账号"
)
async def create_platform_account(
    influencer_id: int,
    account_data: PlatformAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )

    sync_legacy_platform_to_accounts(db, influencer)

    if account_data.is_primary:
        db.query(PlatformAccount).filter(
            PlatformAccount.influencer_id == influencer_id
        ).update({PlatformAccount.is_primary: False})

    new_account = PlatformAccount(
        influencer_id=influencer_id,
        **account_data.model_dump()
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    logger.info(
        f"Platform account created for influencer {influencer.name}: "
        f"{account_data.platform} by {current_user.username}"
    )
    return new_account


@router.put(
    "/{influencer_id}/platform-accounts/{account_id}",
    response_model=PlatformAccountResponse,
    summary="更新平台账号"
)
async def update_platform_account(
    influencer_id: int,
    account_id: int,
    account_data: PlatformAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    account = db.query(PlatformAccount).filter(
        PlatformAccount.id == account_id,
        PlatformAccount.influencer_id == influencer_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="平台账号不存在"
        )

    if account_data.is_primary:
        db.query(PlatformAccount).filter(
            PlatformAccount.influencer_id == influencer_id,
            PlatformAccount.id != account_id
        ).update({PlatformAccount.is_primary: False})

    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    logger.info(
        f"Platform account updated (id={account_id}) by {current_user.username}"
    )
    return account


@router.put(
    "/{influencer_id}/platform-accounts/{account_id}/set-primary",
    response_model=PlatformAccountResponse,
    summary="设置为主展示账号"
)
async def set_primary_platform_account(
    influencer_id: int,
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    account = db.query(PlatformAccount).filter(
        PlatformAccount.id == account_id,
        PlatformAccount.influencer_id == influencer_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="平台账号不存在"
        )

    db.query(PlatformAccount).filter(
        PlatformAccount.influencer_id == influencer_id
    ).update({PlatformAccount.is_primary: False})

    account.is_primary = True
    db.commit()
    db.refresh(account)

    logger.info(
        f"Platform account set as primary (id={account_id}) by {current_user.username}"
    )
    return account


@router.delete(
    "/{influencer_id}/platform-accounts/{account_id}",
    summary="删除平台账号"
)
async def delete_platform_account(
    influencer_id: int,
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    account = db.query(PlatformAccount).filter(
        PlatformAccount.id == account_id,
        PlatformAccount.influencer_id == influencer_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="平台账号不存在"
        )

    all_accounts = db.query(PlatformAccount).filter(
        PlatformAccount.influencer_id == influencer_id
    ).all()

    if len(all_accounts) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少需要保留一个平台账号"
        )

    was_primary = account.is_primary
    db.delete(account)
    db.commit()

    if was_primary:
        remaining = db.query(PlatformAccount).filter(
            PlatformAccount.influencer_id == influencer_id
        ).order_by(PlatformAccount.id.asc()).first()
        if remaining:
            remaining.is_primary = True
            db.commit()

    logger.info(
        f"Platform account deleted (id={account_id}) by {current_user.username}"
    )
    return {"message": "平台账号已删除"}
