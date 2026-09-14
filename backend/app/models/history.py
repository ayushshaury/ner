import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class SubmissionHistory(Base):
    __tablename__ = "submission_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(Text, ForeignKey("submissions.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    submission = relationship("Submission", backref="history")

class RoadStatusHistory(Base):
    __tablename__ = "road_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    road_id: Mapped[str] = mapped_column(Text, ForeignKey("roads.road_id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    road = relationship("Road", backref="status_history")
    user = relationship("User", backref="road_status_history")
