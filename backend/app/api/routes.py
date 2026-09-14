from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.route import RouteRequest, RouteResponse
from app.services.routing import compute_route
from typing import Dict, Any

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.post("", response_model=Dict[str, Any])
async def get_route(req: RouteRequest, db: AsyncSession = Depends(get_db)):
    """
    Computes shortest path between origin and destination over the OSM road network.
    Excludes any blocked road segments and reports reroutedAround segments.
    """
    try:
        result = await compute_route(db, req.origin, req.destination)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to calculate route: {str(e)}")
