import os
import json
import csv
import logging
from sqlalchemy import text
from app.db.session import sync_engine, SyncSessionLocal
from app.models.road import Road
from app.models.user import User
from app.auth.security import get_password_hash
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")

GEOJSON_PATH = os.path.join(DATA_DIR, "roads_with_terrain.geojson")
CSV_PATH = os.path.join(DATA_DIR, "road_risk_scores.csv")
JSON_PATH = os.path.join(DATA_DIR, "road_risk_data_monsoon.json")

def seed_database():
    logger.info("Starting one-time offline database seed...")

    if not os.path.exists(GEOJSON_PATH) or not os.path.exists(CSV_PATH) or not os.path.exists(JSON_PATH):
        logger.error(f"Seed data files missing in {DATA_DIR}")
        return

    # 1. Load GeoJSON
    logger.info("Loading roads_with_terrain.geojson...")
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)
    geojson_map = {}
    for feature in geojson_data.get("features", []):
        props = feature.get("properties", {})
        road_id = props.get("road_id") or props.get("id") or props.get("@id")
        coords = feature.get("geometry", {}).get("coordinates", [])
        if road_id and coords:
            geojson_map[road_id] = {
                "coordinates": coords,
                "road_type": props.get("highway"),
                "road_name": props.get("name"),
                "road_length_km": props.get("road_length_km")
            }

    # 2. Load CSV risk scores
    logger.info("Loading road_risk_scores.csv...")
    csv_map = {}
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            road_id = row.get("road_id")
            if road_id:
                csv_map[road_id] = {
                    "risk_score": float(row.get("risk_score", 0.0)),
                    "predicted_disruption": bool(int(row.get("predicted_disruption", 0)))
                }

    # 3. Load Monsoon JSON explainability features
    logger.info("Loading road_risk_data_monsoon.json...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        monsoon_data = json.load(f)
    json_map = {}
    for rec in monsoon_data.get("records", []):
        road_id = rec.get("road_id")
        if road_id:
            json_map[road_id] = rec

    # 4. Join and Prepare Road objects
    session = SyncSessionLocal()
    try:
        # Clear existing roads to enable clean re-runs
        logger.info("Clearing existing roads...")
        session.execute(text("DELETE FROM road_status_history;"))
        session.execute(text("DELETE FROM submission_history;"))
        session.execute(text("DELETE FROM submissions;"))
        session.execute(text("DELETE FROM roads;"))
        session.commit()

        road_objects = []
        skipped_count = 0

        for road_id, geo_info in geojson_map.items():
            csv_info = csv_map.get(road_id)
            json_info = json_map.get(road_id)

            if not csv_info or not json_info:
                logger.warning(f"Skipping {road_id}: missing in CSV or JSON lookup")
                skipped_count += 1
                continue

            coords = geo_info["coordinates"]
            if len(coords) < 2:
                logger.warning(f"Skipping {road_id}: invalid coordinates count ({len(coords)})")
                skipped_count += 1
                continue

            # GeoJSON coordinates are [lon, lat] pairs. Shapely LineString takes (lon, lat) tuples.
            # PostGIS GEOGRAPHY(LINESTRING, 4326) expects (lon, lat)
            line = LineString([(pt[0], pt[1]) for pt in coords])

            road_obj = Road(
                road_id=road_id,
                geometry=from_shape(line, srid=4326),
                road_type=json_info.get("road_type") or geo_info.get("road_type"),
                road_name=json_info.get("road_name") or geo_info.get("road_name"),
                road_length_km=json_info.get("road_length_km") or geo_info.get("road_length_km"),
                risk_score=csv_info["risk_score"],
                predicted_disruption=csv_info["predicted_disruption"],
                elevation_m=json_info.get("elevation_m"),
                slope_deg=json_info.get("slope_deg"),
                historical_landslide_count=json_info.get("historical_landslide_count"),
                nearest_landslide_distance_km=json_info.get("nearest_landslide_distance_km"),
                rainfall_24h_mm=json_info.get("rainfall_24h_mm"),
                rainfall_3d_mm=json_info.get("rainfall_3d_mm"),
                rainfall_7d_mm=json_info.get("rainfall_7d_mm"),
                status="open"
            )
            road_objects.append(road_obj)

        logger.info(f"Bulk inserting {len(road_objects)} roads into PostGIS...")
        session.bulk_save_objects(road_objects)
        session.commit()
        logger.info(f"Successfully seeded {len(road_objects)} roads (Skipped: {skipped_count})")

        # 5. Seed Users (Default Admin & Citizen)
        logger.info("Seeding default system users...")
        default_users = [
            {
                "name": "Admin Officer",
                "email": "admin@civanta.gov.in",
                "password": "admin123",
                "role": "admin"
            },
            {
                "name": "Admin Officer",
                "email": "admin@civanta.in",
                "password": "admin123",
                "role": "admin"
            },
            {
                "name": "Citizen User",
                "email": "user@civanta.gov.in",
                "password": "user123",
                "role": "user"
            },
            {
                "name": "Citizen User",
                "email": "user@civanta.in",
                "password": "user123",
                "role": "user"
            }
        ]

        for u in default_users:
            existing = session.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user_obj = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    language="en"
                )
                session.add(user_obj)
        session.commit()
        logger.info("Default users seeded successfully!")

    except Exception as e:
        session.rollback()
        logger.error(f"Error during database seed: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
