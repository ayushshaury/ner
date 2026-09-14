from pydantic import BaseModel
from typing import Optional, List, Any
import uuid
from datetime import datetime
from app.schemas.road import RoadOut

class SubmissionCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    lat: float
    lng: float
    priority: Optional[str] = "Medium"
    department: Optional[str] = "—"

class SubmissionUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    department: Optional[str] = None

class SubmissionHistoryOut(BaseModel):
    id: int
    status: str
    note: Optional[str] = None
    at: datetime

    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: str
    user_id: Optional[uuid.UUID] = None
    title: str
    category: str
    description: Optional[str] = None
    location: Any  # dict with lat, lng or GeoJSON Point
    road_id: Optional[str] = None
    road: Optional[RoadOut] = None
    priority: str = "Medium"
    status: str = "Submitted"
    department: str = "—"
    created_at: datetime
    history: List[SubmissionHistoryOut] = []

    class Config:
        from_attributes = True
