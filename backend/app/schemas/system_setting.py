"""
System Setting Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class SystemSettingBase(BaseModel):
    setting_key: str = Field(..., max_length=100, description="配置项键名")
    setting_value: Optional[str] = Field(None, description="配置项值")
    setting_type: str = Field("string", description="值类型: string, integer, boolean, json")
    description: Optional[str] = Field(None, max_length=255, description="配置项描述")
    is_public: bool = Field(False, description="是否公开（未登录也可读取）")


class SystemSettingCreate(SystemSettingBase):
    pass


class SystemSettingUpdate(BaseModel):
    setting_value: Optional[str] = Field(None, description="配置项值")
    description: Optional[str] = Field(None, max_length=255, description="配置项描述")
    is_public: Optional[bool] = Field(None, description="是否公开")


class SystemSettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: Optional[str]
    setting_type: str
    description: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemSettingsBatchUpdate(BaseModel):
    settings: Dict[str, Any] = Field(..., description="批量更新的配置项字典 {key: value}")


class PublicSettingsResponse(BaseModel):
    """公开配置项 - 登录页和全局展示使用"""
    platform_name: str = Field("Influencer管理平台", description="平台对外显示名称")
    platform_short_name: str = Field("Influencer平台", description="平台简称")
    allow_self_register: bool = Field(True, description="是否开放自助注册")
    collaboration_reminder_days: int = Field(7, description="合作到期默认提醒天数")
    platform_display_names: Dict[str, str] = Field(
        default_factory=lambda: {
            "抖音": "抖音",
            "小红书": "小红书",
            "B站": "B站",
            "微博": "微博"
        },
        description="各平台对外显示名称映射"
    )
    default_page_size: int = Field(10, description="列表默认每页条数")
