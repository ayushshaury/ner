from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, Numeric, Boolean, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography
from app.models.base import Base

class Road(Base):
    __tablename__ = "roads"

    road_id: Mapped[str] = mapped_column(Text, primary_key=True)  # e.g. 'way/44644556'
    geometry = mapped_column(Geography(geometry_type='LINESTRING', srid=4326), nullable=False)
    road_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    road_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    road_length_km: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    risk_score: Mapped[float] = mapped_column(Numeric, nullable=False)
    predicted_disruption: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # explainability features
    elevation_m: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    slope_deg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    historical_landslide_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    nearest_landslide_distance_km: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    rainfall_24h_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    rainfall_3d_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    rainfall_7d_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    status: Mapped[str] = mapped_column(Text, default="open", nullable=False)
    block_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('open','blocked')", name="check_road_status"),
    )
