from pydantic import BaseModel, Field
from typing import List, Optional

class RouteRequest(BaseModel):
    # 'from' and 'to' coordinates [lat, lng]
    origin: List[float] = Field(..., alias="from")
    destination: List[float] = Field(..., alias="to")

    class Config:
        populate_by_name = True

class RouteResponse(BaseModel):
    path: List[List[float]]  # List of [lat, lng] pairs
    totalDistanceKm: float
    riskScore: float
    reroutedAround: List[str] = []
