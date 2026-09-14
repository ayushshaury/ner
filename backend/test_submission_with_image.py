import urllib.request
import json

base_url = "http://localhost:8000/api"

print("1. Uploading image...")
png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
boundary = "----WebKitFormBoundaryTest123"
body = []
body.append(f"--{boundary}".encode())
body.append(b'Content-Disposition: form-data; name="file"; filename="landslide_evidence.png"')
body.append(b"Content-Type: image/png")
body.append(b"")
body.append(png_bytes)
body.append(f"--{boundary}--".encode())
body.append(b"")

payload = b"\r\n".join(body)
req = urllib.request.Request(
    f"{base_url}/upload",
    data=payload,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)

with urllib.request.urlopen(req) as resp:
    upload_res = json.loads(resp.read().decode())
    image_url = upload_res["url"]
    print("Uploaded image URL:", image_url)

print("\n2. Creating submission with image_url...")
sub_payload = json.dumps({
    "title": "Landslide Report with Photo",
    "category": "Landslide / Debris",
    "description": "Debris on road",
    "image_url": image_url,
    "lat": 26.18,
    "lng": 91.75,
    "priority": "High"
}).encode("utf-8")

req = urllib.request.Request(f"{base_url}/submissions", data=sub_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    created = json.loads(resp.read().decode())
    print("Created submission:", created["id"])
    print("Saved image_url in DB:", created.get("image_url"))
    assert created.get("image_url") == image_url, "image_url was not returned!"
    print("\nSUCCESS! Submission image_url persistence verified!")
