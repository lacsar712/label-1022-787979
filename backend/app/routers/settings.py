"""
System Settings Router - 管理平台行为配置参数
"""
import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user, get_admin_user
from ..models.user import User
from ..models.system_setting import SystemSetting
from ..schemas.system_setting import (
    SystemSettingResponse,
    SystemSettingCreate,
    SystemSettingUpdate,
    SystemSettingsBatchUpdate,
    PublicSettingsResponse
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/settings", tags=["系统设置"])


DEFAULT_SETTINGS: Dict[str, Dict[str, Any]] = {
    "platform_name": {
        "value": "Influencer管理平台",
        "type": "string",
        "description": "平台对外显示完整名称",
        "is_public": True
    },
    "platform_short_name": {
        "value": "Influencer平台",
        "type": "string",
        "description": "平台简称（侧边栏、Logo等位置显示）",
        "is_public": True
    },
    "allow_self_register": {
        "value": "true",
        "type": "boolean",
        "description": "是否开放用户自助注册功能",
        "is_public": True
    },
    "collaboration_reminder_days": {
        "value": "7",
        "type": "integer",
        "description": "合作到期默认提前提醒天数",
        "is_public": False
    },
    "default_page_size": {
        "value": "10",
        "type": "integer",
        "description": "列表默认每页显示条数",
        "is_public": True
    },
    "platform_display_names": {
        "value": json.dumps({
            "抖音": "抖音",
            "小红书": "小红书",
            "B站": "B站",
            "微博": "微博"
        }, ensure_ascii=False),
        "type": "json",
        "description": "各平台对外显示名称映射（JSON格式，key为内部值，value为显示名称）",
        "is_public": True
    }
}


def init_default_settings(db: Session):
    """初始化默认系统设置（启动时调用）"""
    for key, config in DEFAULT_SETTINGS.items():
        existing = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
        if not existing:
            setting = SystemSetting(
                setting_key=key,
                setting_value=config["value"],
                setting_type=config["type"],
                description=config["description"],
                is_public=config["is_public"]
            )
            db.add(setting)
            logger.info(f"Initialized default setting: {key} = {config['value']}")
    db.commit()


def get_setting_value(db: Session, key: str, default: Any = None) -> Any:
    """读取单个配置项的值，并根据类型自动转换"""
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
    if not setting:
        default_config = DEFAULT_SETTINGS.get(key)
        if default_config:
            return _convert_value(default_config["value"], default_config["type"])
        return default
    return _convert_value(setting.setting_value, setting.setting_type)


def _convert_value(value: str, value_type: str) -> Any:
    """将字符串值按类型转换"""
    if value is None:
        return None
    try:
        if value_type == "integer":
            return int(value)
        elif value_type == "boolean":
            return str(value).lower() in ("true", "1", "yes")
        elif value_type == "json":
            return json.loads(value) if value else {}
        else:
            return value
    except (ValueError, json.JSONDecodeError):
        return value


@router.get("/public", response_model=PublicSettingsResponse, summary="获取公开配置（无需登录）")
async def get_public_settings(db: Session = Depends(get_db)):
    """
    获取所有标记为公开的系统配置，包括：
    - 平台名称
    - 是否开放注册
    - 默认分页条数
    - 平台显示名称映射
    """
    settings = db.query(SystemSetting).filter(SystemSetting.is_public == True).all()
    settings_dict = {s.setting_key: _convert_value(s.setting_value, s.setting_type) for s in settings}

    return PublicSettingsResponse(
        platform_name=settings_dict.get("platform_name", DEFAULT_SETTINGS["platform_name"]["value"]),
        platform_short_name=settings_dict.get("platform_short_name", DEFAULT_SETTINGS["platform_short_name"]["value"]),
        allow_self_register=settings_dict.get("allow_self_register", True),
        collaboration_reminder_days=get_setting_value(db, "collaboration_reminder_days", 7),
        platform_display_names=settings_dict.get(
            "platform_display_names",
            json.loads(DEFAULT_SETTINGS["platform_display_names"]["value"])
        ),
        default_page_size=settings_dict.get("default_page_size", 10)
    )


@router.get("", response_model=List[SystemSettingResponse], summary="获取所有系统配置（管理员）")
async def get_all_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user)
):
    """获取所有系统设置项（仅管理员可访问）"""
    settings = db.query(SystemSetting).order_by(SystemSetting.id).all()
    return settings


@router.get("/{setting_key}", response_model=SystemSettingResponse, summary="获取单个配置项（管理员）")
async def get_setting(
    setting_key: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user)
):
    """根据键名获取单个配置项"""
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == setting_key).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"配置项 {setting_key} 不存在"
        )
    return setting


@router.post("", response_model=SystemSettingResponse, summary="创建配置项（管理员）")
async def create_setting(
    data: SystemSettingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """创建新的系统配置项"""
    existing = db.query(SystemSetting).filter(SystemSetting.setting_key == data.setting_key).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"配置项 {data.setting_key} 已存在"
        )

    setting = SystemSetting(**data.model_dump())
    db.add(setting)
    db.commit()
    db.refresh(setting)

    logger.info(f"Setting created: {data.setting_key} by {current_user.username}")
    return setting


@router.put("/{setting_key}", response_model=SystemSettingResponse, summary="更新单个配置项（管理员）")
async def update_setting(
    setting_key: str,
    data: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """更新指定配置项的值和描述"""
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == setting_key).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"配置项 {setting_key} 不存在"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)

    db.commit()
    db.refresh(setting)

    logger.info(f"Setting updated: {setting_key} by {current_user.username}")
    return setting


@router.put("", summary="批量更新配置项（管理员）")
async def batch_update_settings(
    data: SystemSettingsBatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    批量更新多个配置项的值
    请求体: { "settings": { "key1": "value1", "key2": "value2", ... } }
    """
    updated_keys = []
    errors = []

    for key, value in data.settings.items():
        setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
        if not setting:
            errors.append(f"配置项 {key} 不存在，已跳过")
            continue

        if setting.setting_type == "json":
            if not isinstance(value, (dict, list)):
                errors.append(f"配置项 {key} 类型为 json，值格式不正确")
                continue
            setting.setting_value = json.dumps(value, ensure_ascii=False)
        elif setting.setting_type == "boolean":
            setting.setting_value = "true" if value else "false"
        elif setting.setting_type == "integer":
            try:
                setting.setting_value = str(int(value))
            except (ValueError, TypeError):
                errors.append(f"配置项 {key} 类型为 integer，值格式不正确")
                continue
        else:
            setting.setting_value = str(value) if value is not None else None

        updated_keys.append(key)

    db.commit()

    logger.info(f"Settings batch updated by {current_user.username}: {updated_keys}")

    result = {
        "message": "批量更新完成",
        "updated_count": len(updated_keys),
        "updated_keys": updated_keys
    }
    if errors:
        result["errors"] = errors
    return result


@router.delete("/{setting_key}", summary="删除配置项（管理员）")
async def delete_setting(
    setting_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """删除指定配置项（注意：默认配置项不可删除）"""
    if setting_key in DEFAULT_SETTINGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="默认配置项不可删除"
        )

    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == setting_key).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"配置项 {setting_key} 不存在"
        )

    db.delete(setting)
    db.commit()

    logger.info(f"Setting deleted: {setting_key} by {current_user.username}")
    return {"message": "配置项已删除"}
