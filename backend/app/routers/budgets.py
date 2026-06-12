"""
Budgets Router - 季度预算管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date
from decimal import Decimal

from ..dependencies import get_db, get_current_user, get_operator_or_admin
from ..models.budget import PlatformBudget
from ..models.collaboration import Collaboration
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.budget import (
    PlatformBudgetCreate,
    PlatformBudgetUpdate,
    PlatformBudgetResponse,
    PlatformBudgetListResponse,
    BudgetCheckRequest,
    BudgetCheckResponse
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/budgets", tags=["预算管理"])


def get_quarter_from_date(d: date) -> tuple:
    """根据日期获取年度和季度"""
    year = d.year
    quarter = (d.month - 1) // 3 + 1
    return year, quarter


def get_quarter_date_range(year: int, quarter: int) -> tuple:
    """获取季度的日期范围"""
    quarter_start_month = (quarter - 1) * 3 + 1
    start_date = date(year, quarter_start_month, 1)
    if quarter == 4:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, quarter_start_month + 3, 1)
    return start_date, end_date


def calculate_used_amount(db: Session, year: int, quarter: int, platform: str, exclude_collab_id: Optional[int] = None) -> Decimal:
    """
    计算指定平台在指定季度的已用预算
    统计该季度内开始的所有合作（排除已取消的）的预算总和
    """
    start_date, end_date = get_quarter_date_range(year, quarter)
    
    query = db.query(Collaboration).join(Influencer, Collaboration.influencer_id == Influencer.id).filter(
        Influencer.platform == platform,
        Collaboration.status != "cancelled",
        Collaboration.start_date >= start_date,
        Collaboration.start_date < end_date
    )
    
    if exclude_collab_id:
        query = query.filter(Collaboration.id != exclude_collab_id)
    
    collaborations = query.all()
    total_used = sum((c.budget or Decimal('0')) for c in collaborations)
    return total_used


def get_budget_status(usage_percentage: Decimal, warning_threshold: Decimal) -> str:
    """根据使用比例获取状态"""
    if usage_percentage >= 100:
        return "exceeded"
    elif usage_percentage >= warning_threshold:
        return "warning"
    else:
        return "normal"


def enrich_budget_response(db: Session, budget: PlatformBudget) -> PlatformBudgetResponse:
    """为预算响应对象添加已用金额、剩余金额等计算字段"""
    used_amount = calculate_used_amount(db, budget.year, budget.quarter, budget.platform)
    budget_limit = budget.budget_limit or Decimal('0')
    
    remaining_amount = budget_limit - used_amount
    usage_percentage = (used_amount / budget_limit * 100) if budget_limit > 0 else Decimal('0')
    status = get_budget_status(usage_percentage, budget.warning_threshold or Decimal('80'))
    
    return PlatformBudgetResponse(
        id=budget.id,
        year=budget.year,
        quarter=budget.quarter,
        platform=budget.platform,
        budget_limit=budget.budget_limit,
        warning_threshold=budget.warning_threshold,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
        used_amount=used_amount,
        remaining_amount=remaining_amount,
        usage_percentage=usage_percentage,
        status=status
    )


@router.get("", response_model=PlatformBudgetListResponse, summary="获取预算列表")
async def get_budgets(
    year: int = Query(..., ge=2020, le=2100),
    quarter: int = Query(..., ge=1, le=4),
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定年度和季度的预算列表
    - 支持按平台筛选
    """
    query = db.query(PlatformBudget).filter(
        PlatformBudget.year == year,
        PlatformBudget.quarter == quarter
    )
    
    if platform:
        query = query.filter(PlatformBudget.platform == platform)
    
    budgets = query.order_by(PlatformBudget.platform).all()
    total = len(budgets)
    
    enriched_items = [enrich_budget_response(db, b) for b in budgets]
    
    return PlatformBudgetListResponse(
        items=enriched_items,
        total=total,
        year=year,
        quarter=quarter
    )


@router.get("/platforms", summary="获取所有已使用的平台列表")
async def get_platforms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取系统中所有已使用的平台列表（从Influencer表中提取）"""
    platforms = db.query(Influencer.platform).distinct().all()
    platform_list = [{"value": p[0], "label": p[0]} for p in platforms]
    return platform_list


@router.get("/overview", summary="获取预算概览数据")
async def get_budget_overview(
    year: int = Query(..., ge=2020, le=2100),
    quarter: int = Query(..., ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取预算概览数据，包含所有平台的预算汇总
    """
    query = db.query(PlatformBudget).filter(
        PlatformBudget.year == year,
        PlatformBudget.quarter == quarter
    )
    budgets = query.all()
    
    total_budget = Decimal('0')
    total_used = Decimal('0')
    
    items = []
    for budget in budgets:
        enriched = enrich_budget_response(db, budget)
        items.append(enriched)
        total_budget += enriched.budget_limit
        total_used += enriched.used_amount
    
    total_remaining = total_budget - total_used
    total_percentage = (total_used / total_budget * 100) if total_budget > 0 else Decimal('0')
    
    return {
        "year": year,
        "quarter": quarter,
        "total_budget": total_budget,
        "total_used": total_used,
        "total_remaining": total_remaining,
        "total_percentage": total_percentage,
        "platform_count": len(items),
        "items": items
    }


@router.post("/check", response_model=BudgetCheckResponse, summary="检查合作预算是否会超支")
async def check_budget(
    check_data: BudgetCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    在创建/编辑合作前检查是否会导致该平台季度预算超支
    """
    budget_amount = check_data.budget or Decimal('0')
    
    if check_data.start_date:
        try:
            start_d = date.fromisoformat(check_data.start_date)
            year, quarter = get_quarter_from_date(start_d)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="日期格式错误，请使用YYYY-MM-DD格式"
            )
    else:
        today = date.today()
        year, quarter = get_quarter_from_date(today)
    
    budget_record = db.query(PlatformBudget).filter(
        PlatformBudget.year == year,
        PlatformBudget.quarter == quarter,
        PlatformBudget.platform == check_data.platform
    ).first()
    
    if not budget_record:
        return BudgetCheckResponse(
            year=year,
            quarter=quarter,
            platform=check_data.platform,
            budget_limit=Decimal('0'),
            used_amount=Decimal('0'),
            new_used_amount=budget_amount,
            remaining_amount=Decimal('0'),
            will_exceed=False,
            will_warn=False,
            warning_threshold=Decimal('80'),
            message=f"该平台{year}年Q{quarter}暂未设置预算"
        )
    
    budget_limit = budget_record.budget_limit or Decimal('0')
    warning_threshold = budget_record.warning_threshold or Decimal('80')
    used_amount = calculate_used_amount(db, year, quarter, check_data.platform, check_data.collaboration_id)
    new_used_amount = used_amount + budget_amount
    remaining_amount = budget_limit - used_amount
    new_remaining = budget_limit - new_used_amount
    
    will_exceed = new_used_amount > budget_limit
    new_percentage = (new_used_amount / budget_limit * 100) if budget_limit > 0 else Decimal('0')
    will_warn = new_percentage >= warning_threshold and not will_exceed
    
    if will_exceed:
        message = f"⚠️ 超支预警：本次合作将导致{year}年Q{quarter}{check_data.platform}平台预算超支！\n预算上限：¥{budget_limit:,.2f}，已用：¥{used_amount:,.2f}，本次新增：¥{budget_amount:,.2f}，将超出：¥{(-new_remaining):,.2f}"
    elif will_warn:
        message = f"⚠️ 预算提醒：本次合作后{year}年Q{quarter}{check_data.platform}平台使用率将达{new_percentage:.1f}%，超过{warning_threshold}%预警线。\n剩余预算：¥{new_remaining:,.2f}"
    else:
        message = f"✓ 预算充足：{year}年Q{quarter}{check_data.platform}平台剩余预算：¥{remaining_amount:,.2f}"
    
    return BudgetCheckResponse(
        year=year,
        quarter=quarter,
        platform=check_data.platform,
        budget_limit=budget_limit,
        used_amount=used_amount,
        new_used_amount=new_used_amount,
        remaining_amount=new_remaining,
        will_exceed=will_exceed,
        will_warn=will_warn,
        warning_threshold=warning_threshold,
        message=message
    )


@router.post("", response_model=PlatformBudgetResponse, summary="创建预算")
async def create_budget(
    budget_data: PlatformBudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建平台预算（年度+季度+平台维度）"""
    existing = db.query(PlatformBudget).filter(
        PlatformBudget.year == budget_data.year,
        PlatformBudget.quarter == budget_data.quarter,
        PlatformBudget.platform == budget_data.platform
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{budget_data.year}年Q{budget_data.quarter} {budget_data.platform}平台预算已存在，请使用编辑功能修改"
        )
    
    new_budget = PlatformBudget(
        **budget_data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    
    logger.info(f"Budget created: {budget_data.year}Q{budget_data.quarter} {budget_data.platform} by {current_user.username}")
    
    return enrich_budget_response(db, new_budget)


@router.get("/{budget_id}", response_model=PlatformBudgetResponse, summary="获取预算详情")
async def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取预算详情"""
    budget = db.query(PlatformBudget).filter(PlatformBudget.id == budget_id).first()
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预算记录不存在"
        )
    
    return enrich_budget_response(db, budget)


@router.put("/{budget_id}", response_model=PlatformBudgetResponse, summary="更新预算")
async def update_budget(
    budget_id: int,
    budget_data: PlatformBudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新预算金额或预警阈值"""
    budget = db.query(PlatformBudget).filter(PlatformBudget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预算记录不存在"
        )
    
    update_data = budget_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    logger.info(f"Budget updated: {budget.year}Q{budget.quarter} {budget.platform} by {current_user.username}")
    
    return enrich_budget_response(db, budget)


@router.delete("/{budget_id}", summary="删除预算")
async def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除预算记录"""
    budget = db.query(PlatformBudget).filter(PlatformBudget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预算记录不存在"
        )
    
    platform_info = f"{budget.year}Q{budget.quarter} {budget.platform}"
    
    db.delete(budget)
    db.commit()
    
    logger.info(f"Budget deleted: {platform_info} by {current_user.username}")
    
    return {"message": "预算记录已删除"}
