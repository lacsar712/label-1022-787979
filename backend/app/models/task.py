"""
Task Model - Collaboration task checklist
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    collaboration_id = Column(Integer, ForeignKey("collaborations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(Date, nullable=True)
    completed = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    collaboration = relationship("Collaboration", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by])
