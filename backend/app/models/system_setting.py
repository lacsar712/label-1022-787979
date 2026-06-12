"""
System Setting Model - 存储平台级别的可配置参数
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class SystemSetting(Base):
    """系统设置模型 - 键值对存储平台行为参数"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=True)
    setting_type = Column(String(20), default="string")  # string, integer, boolean, json
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False)  # 是否允许未登录用户读取（如平台名称、注册开关等）
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
