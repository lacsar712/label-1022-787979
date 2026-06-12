"""
Tasks Router - Collaboration Task Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import date
from ..dependencies import get_db, get_current_user, get_operator_or_admin
from ..models.task import Task
from ..models.collaboration import Collaboration
from ..models.user import User
from ..schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    OverdueCountResponse
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


@router.get("", response_model=TaskListResponse, summary="获取任务列表")
async def get_tasks(
    collaboration_id: Optional[int] = None,
    completed: Optional[bool] = None,
    assignee_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator)
    )

    if collaboration_id:
        query = query.filter(Task.collaboration_id == collaboration_id)

    if completed is not None:
        query = query.filter(Task.completed == completed)

    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)

    if overdue_only:
        today = date.today()
        query = query.filter(
            Task.completed == False,
            Task.due_date != None,
            Task.due_date < today
        )

    tasks = query.order_by(Task.sort_order, Task.created_at.desc()).all()
    total = len(tasks)

    return TaskListResponse(items=tasks, total=total)


@router.get("/overdue-count", response_model=OverdueCountResponse, summary="获取当前用户逾期任务数")
async def get_overdue_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    count = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.completed == False,
        Task.due_date != None,
        Task.due_date < today
    ).count()

    return OverdueCountResponse(overdue_count=count)


@router.post("", response_model=TaskResponse, summary="创建任务")
async def create_task(
    task_data: TaskCreate,
    collaboration_id: int = Query(..., description="合作项目ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    collaboration = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作项目不存在"
        )

    max_order = db.query(Task).filter(
        Task.collaboration_id == collaboration_id
    ).count()

    new_task = Task(
        collaboration_id=collaboration_id,
        title=task_data.title,
        assignee_id=task_data.assignee_id,
        due_date=task_data.due_date,
        created_by=current_user.id,
        sort_order=max_order
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    new_task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator)
    ).filter(Task.id == new_task.id).first()

    logger.info(f"Task created: {new_task.title} in collaboration {collaboration_id} by {current_user.username}")

    return new_task


@router.put("/{task_id}", response_model=TaskResponse, summary="更新任务")
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator)
    ).filter(Task.id == task_id).first()

    logger.info(f"Task updated: {task.title} by {current_user.username}")

    return task


@router.delete("/{task_id}", summary="删除任务")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    db.delete(task)
    db.commit()

    logger.info(f"Task deleted: {task.title} by {current_user.username}")

    return {"message": "任务已删除"}
