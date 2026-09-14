import urllib.request
import json

base_url = "http://localhost:8000/api"

print("1. Testing GET /roads...")
req = urllib.request.Request(f"{base_url}/roads")
with urllib.request.urlopen(req) as resp:
    roads = json.loads(resp.read().decode())
    print(f"Retrieved {len(roads)} roads!")
    if roads:
        r = roads[0]
        print(f"Sample road: {r['road_id']} | Risk Score: {r['risk_score']} | Status: {r['status']}")
        print(f"Explainability: Rain 7d={r['rainfall_7d_mm']}mm, Landslides={r['historical_landslide_count']}, Elevation={r['elevation_m']}m")

print("\n2. Testing POST /auth/login...")
login_payload = json.dumps({"email": "admin@civanta.gov.in", "password": "admin123"}).encode("utf-8")
req = urllib.request.Request(f"{base_url}/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    token = data["access_token"]
    print("Admin login successful! Token received.")

print("\n3. Testing POST /submissions...")
sub_payload = json.dumps({
    "title": "Landslide on Corridor Highway",
    "category": "Landslide / Debris",
    "description": "Heavy debris blocking both lanes after rain",
    "lat": 26.18,
    "lng": 91.75,
    "priority": "High",
    "department": "Public Works Dept"
}).encode("utf-8")

req = urllib.request.Request(f"{base_url}/submissions", data=sub_payload, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
})
with urllib.request.urlopen(req) as resp:
    sub = json.loads(resp.read().decode())
    print(f"Created submission: {sub['id']} | Linked Road: {sub['road_id']} | Status: {sub['status']}")

print("\n4. Testing PATCH /submissions/:id (Approve & Block Road)...")
patch_payload = json.dumps({
    "status": "Verified",
    "department": "Disaster Management"
}).encode("utf-8")

req = urllib.request.Request(f"{base_url}/submissions/{sub['id']}", data=patch_payload, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}, method="PATCH")
with urllib.request.urlopen(req) as resp:
    updated_sub = json.loads(resp.read().decode())
    print(f"Updated submission: {updated_sub['id']} | Status: {updated_sub['status']}")
    if updated_sub.get("road"):
        print(f"Linked Road '{updated_sub['road']['road_id']}' Status is now: '{updated_sub['road']['status']}'")

print("\n5. Testing POST /routes...")
route_payload = json.dumps({
    "from": [26.0, 91.5],
    "to": [26.2, 91.8]
}).encode("utf-8")

req = urllib.request.Request(f"{base_url}/routes", data=route_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    route = json.loads(resp.read().decode())
    print(f"Route calculated! Distance: {route['totalDistanceKm']} km | Risk Score: {route['riskScore']} | Rerouted Around: {route['reroutedAround']}")
