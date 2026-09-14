from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.submission import Submission
from app.models.road import Road
from app.models.history import SubmissionHistory, RoadStatusHistory
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionUpdate
from app.auth.deps import get_current_user_optional, get_current_user
from app.websocket.manager import manager
from typing import List, Dict, Any, Optional
import json
import random

router = APIRouter(prefix="/submissions", tags=["Submissions"])

def generate_submission_id():
    num = random.randint(10000, 99999)
    return f"CVT-{num}"

async def format_submission(sub: Submission, db: AsyncSession) -> Dict[str, Any]:
    loc_stmt = select(func.ST_AsGeoJSON(sub.location).label("geojson_str"))
    loc_res = await db.execute(loc_stmt)
    loc_str = loc_res.scalar_one_or_none()
    loc_dict = json.loads(loc_str) if loc_str else None

    hist_stmt = select(SubmissionHistory).where(SubmissionHistory.submission_id == sub.id).order_by(SubmissionHistory.at.asc())
    hist_res = await db.execute(hist_stmt)
    history_items = [
        {
            "id": h.id,
            "status": h.status,
            "note": h.note,
            "at": h.at.isoformat() if h.at else None
        }
        for h in hist_res.scalars().all()
    ]

    road_dict = None
    if sub.road_id:
        r_stmt = select(
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
        ).where(Road.road_id == sub.road_id)
        r_res = await db.execute(r_stmt)
        r_row = r_res.first()
        if r_row:
            road_dict = {
                "road_id": r_row.road_id,
                "road_type": r_row.road_type,
                "road_name": r_row.road_name,
                "road_length_km": float(r_row.road_length_km) if r_row.road_length_km is not None else None,
                "risk_score": float(r_row.risk_score),
                "predicted_disruption": r_row.predicted_disruption,
                "elevation_m": float(r_row.elevation_m) if r_row.elevation_m is not None else None,
                "slope_deg": float(r_row.slope_deg) if r_row.slope_deg is not None else None,
                "historical_landslide_count": r_row.historical_landslide_count,
                "nearest_landslide_distance_km": float(r_row.nearest_landslide_distance_km) if r_row.nearest_landslide_distance_km is not None else None,
                "rainfall_24h_mm": float(r_row.rainfall_24h_mm) if r_row.rainfall_24h_mm is not None else None,
                "rainfall_3d_mm": float(r_row.rainfall_3d_mm) if r_row.rainfall_3d_mm is not None else None,
                "rainfall_7d_mm": float(r_row.rainfall_7d_mm) if r_row.rainfall_7d_mm is not None else None,
                "status": r_row.status,
                "updated_at": r_row.updated_at.isoformat() if r_row.updated_at else None,
                "geometry": json.loads(r_row.geojson_str) if r_row.geojson_str else None
            }

    lat = loc_dict["coordinates"][1] if loc_dict and "coordinates" in loc_dict else 0.0
    lng = loc_dict["coordinates"][0] if loc_dict and "coordinates" in loc_dict else 0.0

    return {
        "id": sub.id,
        "user_id": str(sub.user_id) if sub.user_id else None,
        "title": sub.title,
        "category": sub.category,
        "description": sub.description,
        "image_url": sub.image_url,
        "lat": lat,
        "lng": lng,
        "location": loc_dict,
        "road_id": sub.road_id,
        "road": road_dict,
        "priority": sub.priority,
        "status": sub.status,
        "department": sub.department,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "history": history_items
    }

@router.get("", response_model=List[Dict[str, Any]])
async def get_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    stmt = select(Submission).order_by(Submission.created_at.desc())
    if current_user and current_user.role != "admin":
        stmt = stmt.where(Submission.user_id == current_user.id)

    result = await db.execute(stmt)
    submissions = result.scalars().all()

    formatted = []
    for sub in submissions:
        formatted.append(await format_submission(sub, db))
    return formatted

@router.post("", response_model=Dict[str, Any])
async def create_submission(
    sub_in: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    sub_id = generate_submission_id()

    nearest_stmt = select(Road.road_id).order_by(
        func.ST_Distance(Road.geometry, func.ST_SetSRID(func.ST_MakePoint(sub_in.lng, sub_in.lat), 4326))
    ).limit(1)

    nearest_res = await db.execute(nearest_stmt)
    nearest_road_id = nearest_res.scalar_one_or_none()

    sub = Submission(
        id=sub_id,
        user_id=current_user.id if current_user else None,
        title=sub_in.title,
        category=sub_in.category,
        description=sub_in.description,
        image_url=sub_in.image_url,
        location=func.ST_SetSRID(func.ST_MakePoint(sub_in.lng, sub_in.lat), 4326),
        road_id=nearest_road_id,
        priority=sub_in.priority or "Medium",
        status="Submitted",
        department=sub_in.department or "—"
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    hist = SubmissionHistory(
        submission_id=sub.id,
        status="Submitted",
        note="Report submitted by citizen with location coordinates"
    )
    db.add(hist)
    await db.commit()

    formatted = await format_submission(sub, db)
    await manager.broadcast("submission:created", formatted)

    return formatted

@router.patch("/{submission_id}", response_model=Dict[str, Any])
async def update_submission(
    submission_id: str,
    sub_update: SubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    stmt = select(Submission).where(Submission.id == submission_id)
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    old_status = sub.status

    if sub_update.status:
        sub.status = sub_update.status
    if sub_update.priority:
        sub.priority = sub_update.priority
    if sub_update.department:
        sub.department = sub_update.department
    if sub_update.image_url:
        sub.image_url = sub_update.image_url

    await db.commit()
    await db.refresh(sub)

    if sub_update.status and sub_update.status != old_status:
        hist = SubmissionHistory(
            submission_id=sub.id,
            status=sub.status,
            note=f"Status updated to {sub.status}"
        )
        db.add(hist)

        blocking_statuses = ["Verified", "Assigned", "In Progress"]
        if sub.road_id:
            road_stmt = select(Road).where(Road.road_id == sub.road_id)
            road_res = await db.execute(road_stmt)
            linked_road = road_res.scalar_one_or_none()

            if linked_road:
                if sub.status in blocking_statuses and linked_road.status != "blocked":
                    linked_road.status = "blocked"
                    road_hist = RoadStatusHistory(
                        road_id=linked_road.road_id,
                        status="blocked",
                        reason=f"Submission {sub.id} marked as {sub.status}",
                        changed_by=current_user.id if current_user else None
                    )
                    db.add(road_hist)
                    await db.commit()
                    await manager.broadcast("road:blocked", {
                        "road_id": linked_road.road_id,
                        "submission_id": sub.id
                    })

                elif sub.status == "Resolved" and linked_road.status == "blocked":
                    linked_road.status = "open"
                    road_hist = RoadStatusHistory(
                        road_id=linked_road.road_id,
                        status="open",
                        reason=f"Submission {sub.id} marked as Resolved",
                        changed_by=current_user.id if current_user else None
                    )
                    db.add(road_hist)
                    await db.commit()
                    await manager.broadcast("road:unblocked", {
                        "road_id": linked_road.road_id,
                        "submission_id": sub.id
                    })

    await db.commit()
    formatted = await format_submission(sub, db)
    await manager.broadcast("submission:updated", formatted)

    return formatted
