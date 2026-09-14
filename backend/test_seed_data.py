import json
import csv
import os

data_dir = r"C:\Users\ayush\Downloads\CIVANTA-updated\backend\seed_data"

geojson_path = os.path.join(data_dir, "roads_with_terrain.geojson")
csv_path = os.path.join(data_dir, "road_risk_scores.csv")
json_path = os.path.join(data_dir, "road_risk_data_monsoon.json")

print("Checking GeoJSON...")
with open(geojson_path, "r", encoding="utf-8") as f:
    geojson_data = json.load(f)
features = geojson_data.get("features", [])
print(f"Total GeoJSON features: {len(features)}")
if features:
    sample_feat = features[0]
    print("Sample feature properties:", sample_feat.get("properties"))
    print("Sample feature geometry type:", sample_feat.get("geometry", {}).get("type"))
    print("Sample coordinates count:", len(sample_feat.get("geometry", {}).get("coordinates", [])))

print("\nChecking CSV...")
csv_scores = {}
with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_scores[row["road_id"]] = row
print(f"Total CSV rows: {len(csv_scores)}")
sample_csv_key = next(iter(csv_scores))
print("Sample CSV row:", csv_scores[sample_csv_key])

print("\nChecking JSON monsoon data...")
with open(json_path, "r", encoding="utf-8") as f:
    monsoon_data = json.load(f)
records = monsoon_data.get("records", [])
print(f"Total Monsoon records: {len(records)}")
if records:
    print("Sample Monsoon record:", records[0])
