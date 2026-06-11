"""
Budget Model - 季度预算管理模型
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class PlatformBudget(Base):
    """平台预算模型 - 按年度与季度为各投放平台设定预算上限"""
    __tablename__ = "platform_budgets"
    __table_args__ = (
        UniqueConstraint('year', 'quarter', 'platform', name='uq_year_quarter_platform'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)
    budget_limit = Column(Numeric(12, 2), nullable=False, default=0)
    warning_threshold = Column(Numeric(5, 2), default=80)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    creator = relationship("User")
