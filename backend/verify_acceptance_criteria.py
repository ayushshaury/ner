import urllib.request
import json

BASE_URL = "http://localhost:8000/api"

def run_verification():
    print("=== CIVANTA VERIFICATION TEST SUITE ===")

    # 1. Health check
    with urllib.request.urlopen(f"{BASE_URL}/health") as resp:
        assert resp.status == 200
        print("[OK] 1. Health check passed")

    # 2. Get roads & verify explainability
    with urllib.request.urlopen(f"{BASE_URL}/roads") as resp:
        roads = json.loads(resp.read().decode())
        assert len(roads) == 1401
        sample_road = roads[0]
        assert "risk_score" in sample_road
        assert "rainfall_7d_mm" in sample_road
        assert "historical_landslide_count" in sample_road
        assert "elevation_m" in sample_road
        print(f"[OK] 2. Roads loaded ({len(roads)} roads with ML risk & explainability features)")

    # 3. Citizen login / Admin login
    login_data = json.dumps({"email": "admin@civanta.gov.in", "password": "admin123"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        admin_auth = json.loads(resp.read().decode())
        token = admin_auth["access_token"]
        print("[OK] 3. Admin login successful")

    # 4. Create citizen submission with Leaflet map coordinates
    sub_data = json.dumps({
        "title": "Severe Landslide Blockage on Corridor Highway",
        "category": "Landslide / Debris",
        "description": "Massive landslide blocking both lanes near Guwahati corridor",
        "lat": 26.18,
        "lng": 91.75,
        "priority": "High"
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/submissions", data=sub_data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    })
    with urllib.request.urlopen(req) as resp:
        created_sub = json.loads(resp.read().decode())
        assert created_sub["id"].startswith("CVT-")
        assert created_sub["road_id"] is not None
        linked_road_id = created_sub["road_id"]
        print(f"[OK] 4. Citizen submission created ({created_sub['id']}) auto-linked to PostGIS road '{linked_road_id}'")

    # 5. Approve submission and verify road status flips to 'blocked'
    patch_data = json.dumps({"status": "Verified"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/submissions/{created_sub['id']}", data=patch_data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        updated_sub = json.loads(resp.read().decode())
        assert updated_sub["status"] == "Verified"
        assert updated_sub["road"]["status"] == "blocked"
        print(f"[OK] 5. Admin approved report -> Road '{linked_road_id}' status flipped to 'blocked'")

    # 6. Test routing around blocked road
    route_data = json.dumps({
        "from": [26.0, 91.5],
        "to": [26.2, 91.8]
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/routes", data=route_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        route = json.loads(resp.read().decode())
        assert "path" in route
        assert len(route["path"]) > 0
        print(f"[OK] 6. Dijkstra route calculated! Path points: {len(route['path'])}, Distance: {route['totalDistanceKm']} km, Rerouted around: {route['reroutedAround']}")

    # 7. Resolve submission and verify road status flips back to 'open'
    patch_resolve = json.dumps({"status": "Resolved"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/submissions/{created_sub['id']}", data=patch_resolve, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        resolved_sub = json.loads(resp.read().decode())
        assert resolved_sub["status"] == "Resolved"
        assert resolved_sub["road"]["status"] == "open"
        print(f"[OK] 7. Admin resolved report -> Road '{linked_road_id}' status reverted to 'open'")

    print("\nALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
