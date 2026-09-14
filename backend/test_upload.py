import urllib.request
import json
import io

print("Testing image upload API...")

# Generate a tiny 1x1 test image bytes (PNG)
png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = []
body.append(f"--{boundary}".encode())
body.append(b'Content-Disposition: form-data; name="file"; filename="landslide_photo.png"')
body.append(b"Content-Type: image/png")
body.append(b"")
body.append(png_bytes)
body.append(f"--{boundary}--".encode())
body.append(b"")

payload = b"\r\n".join(body)

req = urllib.request.Request(
    "http://localhost:8000/api/upload",
    data=payload,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    print("Upload Response:", res)
    assert "url" in res
    print("Upload API test PASSED!")
