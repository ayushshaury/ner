from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class RoadOut(BaseModel):
    road_id: str
    geometry: Any  # GeoJSON dict or list of coordinates
    road_type: Optional[str] = None
    road_name: Optional[str] = None
    road_length_km: Optional[float] = None
    risk_score: float
    predicted_disruption: bool = False
    
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    historical_landslide_count: Optional[int] = None
    nearest_landslide_distance_km: Optional[float] = None
    rainfall_24h_mm: Optional[float] = None
    rainfall_3d_mm: Optional[float] = None
    rainfall_7d_mm: Optional[float] = None

    status: str = "open"
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
