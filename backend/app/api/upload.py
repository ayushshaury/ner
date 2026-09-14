import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".mp4"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File extension {ext} is not allowed")

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": unique_filename,
        "url": f"/static/uploads/{unique_filename}"
    }
