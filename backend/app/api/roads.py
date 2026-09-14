from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.road import Road
from typing import List, Dict, Any
import json

router = APIRouter(prefix="/roads", tags=["Roads"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_roads(db: AsyncSession = Depends(get_db)):
    """
    Returns all monitored roads with real GeoJSON geometry, ML risk scores,
    explainability features (elevation, slope, landslides, rainfall), and status.
    """
    stmt = select(
        Road.road_id,
        Road.road_type,
        Road.road_name,
        Road.road_length_km,
        Road.risk_score,
        Road.predicted_disruption,
        Road.elevation_m,
        Road.slope_deg,
        Road.historical_landslide_count,
        Road.nearest_landslide_distance_km,
        Road.rainfall_24h_mm,
        Road.rainfall_3d_mm,
        Road.rainfall_7d_mm,
        Road.status,
        Road.updated_at,
        func.ST_AsGeoJSON(Road.geometry).label("geojson_str")
    )
    result = await db.execute(stmt)
    rows = result.all()

    roads_list = []
    for r in rows:
        geom_dict = json.loads(r.geojson_str) if r.geojson_str else None
        roads_list.append({
            "road_id": r.road_id,
            "road_type": r.road_type,
            "road_name": r.road_name,
            "road_length_km": float(r.road_length_km) if r.road_length_km is not None else None,
            "risk_score": float(r.risk_score),
            "predicted_disruption": r.predicted_disruption,
            "elevation_m": float(r.elevation_m) if r.elevation_m is not None else None,
            "slope_deg": float(r.slope_deg) if r.slope_deg is not None else None,
            "historical_landslide_count": r.historical_landslide_count,
            "nearest_landslide_distance_km": float(r.nearest_landslide_distance_km) if r.nearest_landslide_distance_km is not None else None,
            "rainfall_24h_mm": float(r.rainfall_24h_mm) if r.rainfall_24h_mm is not None else None,
            "rainfall_3d_mm": float(r.rainfall_3d_mm) if r.rainfall_3d_mm is not None else None,
            "rainfall_7d_mm": float(r.rainfall_7d_mm) if r.rainfall_7d_mm is not None else None,
            "status": r.status,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "geometry": geom_dict
        })

    return roads_list
