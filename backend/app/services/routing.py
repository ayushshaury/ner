import networkx as nx
from math import radians, cos, sin, asin, sqrt
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.road import Road
import json
import logging

logger = logging.getLogger(__name__)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * asin(sqrt(a))
    return r * c

# Global in-memory cache for graph
_cached_full_graph: Optional[nx.Graph] = None
_cached_road_lookup: Optional[Dict[str, Dict[str, Any]]] = None

async def get_or_build_full_graph(db: AsyncSession) -> Tuple[nx.Graph, Dict[str, Dict[str, Any]]]:
    global _cached_full_graph, _cached_road_lookup
    if _cached_full_graph is not None and _cached_road_lookup is not None:
        return _cached_full_graph, _cached_road_lookup

    logger.info("Building in-memory road network graph from PostGIS...")
    stmt = select(
        Road.road_id,
        Road.risk_score,
        Road.status,
        func.ST_AsGeoJSON(Road.geometry).label("geojson_str")
    )
    result = await db.execute(stmt)
    rows = result.all()

    graph = nx.Graph()
    road_lookup = {}

    for r in rows:
        if not r.geojson_str:
            continue

        geom = json.loads(r.geojson_str)
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue

        road_lookup[r.road_id] = {
            "risk_score": float(r.risk_score),
            "status": r.status,
            "coords": coords
        }

        for i in range(len(coords) - 1):
            pt1 = (round(coords[i][1], 5), round(coords[i][0], 5))
            pt2 = (round(coords[i+1][1], 5), round(coords[i+1][0], 5))

            seg_len = haversine_km(pt1[0], pt1[1], pt2[0], pt2[1])
            weight = seg_len * (1.0 + float(r.risk_score) / 50.0)

            graph.add_edge(
                pt1,
                pt2,
                weight=weight,
                distance=seg_len,
                risk_score=float(r.risk_score),
                road_id=r.road_id
            )

    _cached_full_graph = graph
    _cached_road_lookup = road_lookup
    logger.info(f"Graph built with {len(graph.nodes)} nodes and {len(graph.edges)} edges!")
    return _cached_full_graph, _cached_road_lookup

def invalidate_graph_cache():
    global _cached_full_graph, _cached_road_lookup
    _cached_full_graph = None
    _cached_road_lookup = None

def find_nearest_node(graph: nx.Graph, lat: float, lng: float) -> Optional[Tuple[float, float]]:
    if not graph.nodes:
        return None
    best_node = None
    best_dist = float("inf")
    for node in graph.nodes:
        dist = haversine_km(lat, lng, node[0], node[1])
        if dist < best_dist:
            best_dist = dist
            best_node = node
    return best_node

async def compute_route(
    db: AsyncSession,
    origin: List[float],       # [lat, lng]
    destination: List[float]   # [lat, lng]
) -> Dict[str, Any]:
    orig_lat, orig_lng = origin[0], origin[1]
    dest_lat, dest_lng = destination[0], destination[1]

    full_graph, road_lookup = await get_or_build_full_graph(db)

    # Query currently blocked roads directly from DB or road_lookup
    blocked_stmt = select(Road.road_id).where(Road.status == "blocked")
    blocked_res = await db.execute(blocked_stmt)
    blocked_ids = set(blocked_res.scalars().all())

    # Build active graph view excluding edges belonging to blocked roads
    active_graph = nx.Graph()
    for u, v, data in full_graph.edges(data=True):
        rid = data.get("road_id")
        if rid not in blocked_ids:
            active_graph.add_edge(u, v, **data)

    start_node = find_nearest_node(active_graph, orig_lat, orig_lng)
    end_node = find_nearest_node(active_graph, dest_lat, dest_lng)

    if not start_node or not end_node:
        start_node = find_nearest_node(full_graph, orig_lat, orig_lng)
        end_node = find_nearest_node(full_graph, dest_lat, dest_lng)

    try:
        path_nodes = nx.shortest_path(active_graph, source=start_node, target=end_node, weight="weight")
    except Exception:
        path_nodes = nx.shortest_path(full_graph, source=start_node, target=end_node, weight="weight")

    path_coords = []
    total_dist = 0.0
    weighted_risk_sum = 0.0
    used_roads = set()

    for i in range(len(path_nodes) - 1):
        u, v = path_nodes[i], path_nodes[i+1]
        edge_data = active_graph.get_edge_data(u, v) or full_graph.get_edge_data(u, v)
        if edge_data:
            d = edge_data.get("distance", 0.0)
            r = edge_data.get("risk_score", 0.0)
            rid = edge_data.get("road_id")
            total_dist += d
            weighted_risk_sum += r * d
            if rid:
                used_roads.add(rid)

        if not path_coords or path_coords[-1] != [u[0], u[1]]:
            path_coords.append([u[0], u[1]])
        path_coords.append([v[0], v[1]])

    avg_risk = (weighted_risk_sum / total_dist) if total_dist > 0 else 0.0

    rerouted_around = []
    if blocked_ids:
        try:
            full_start = find_nearest_node(full_graph, orig_lat, orig_lng)
            full_end = find_nearest_node(full_graph, dest_lat, dest_lng)
            full_path = nx.shortest_path(full_graph, source=full_start, target=full_end, weight="weight")
            for i in range(len(full_path) - 1):
                u, v = full_path[i], full_path[i+1]
                edge_data = full_graph.get_edge_data(u, v)
                if edge_data:
                    rid = edge_data.get("road_id")
                    if rid and rid in blocked_ids and rid not in rerouted_around:
                        rerouted_around.append(rid)
        except Exception:
            pass

    return {
        "path": path_coords,
        "totalDistanceKm": round(total_dist, 2),
        "riskScore": round(avg_risk, 2),
        "reroutedAround": rerouted_around
    }
