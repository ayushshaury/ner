import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.models.base import Base

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)  # e.g. 'CVT-10482'
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location = mapped_column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    road_id: Mapped[Optional[str]] = mapped_column(Text, ForeignKey("roads.road_id"), nullable=True)
    priority: Mapped[str] = mapped_column(Text, default="Medium", nullable=True)
    status: Mapped[str] = mapped_column(Text, default="Submitted", nullable=False)
    department: Mapped[str] = mapped_column(Text, default="—", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="submissions")
    road = relationship("Road", backref="submissions")
