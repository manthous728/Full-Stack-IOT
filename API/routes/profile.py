from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from pathlib import Path

router = APIRouter()

# Directory to store uploaded profile photos
PROFILE_DIR = Path(__file__).resolve().parent.parent / "static"
PROFILE_DIR.mkdir(parents=True, exist_ok=True)

from fastapi import Form

from fastapi import Form, Depends
from database import get_cursor
import time

@router.post("/profile/photo")
async def upload_profile_photo(username: str = Form(...), file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    
    # Check if user exists and get ID
    user_id = None
    old_avatar_url = None
    with get_cursor() as cur:
        cur.execute("SELECT id, avatar_url FROM users WHERE username = %s", (username,))
        res = cur.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = res['id']
        old_avatar_url = res.get('avatar_url')

    # Generate filename with user_id and timestamp to avoid cache issues
    filename = f"avatar_{user_id}_{int(time.time())}.{file.filename.split('.')[-1]}"
    file_path = PROFILE_DIR / filename
    
    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Update database
        avatar_url = f"/static/{filename}"
        with get_cursor() as cur:
            cur.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))

        # Delete old file
        if old_avatar_url:
            try:
                # Extract filename from URL (e.g., /static/avatar_1_123.jpg -> avatar_1_123.jpg)
                old_filename = old_avatar_url.split("/")[-1]
                old_file_path = PROFILE_DIR / old_filename
                
                # Verify we are not deleting the file we just uploaded
                if old_file_path.exists() and old_file_path.resolve() != file_path.resolve():
                    os.remove(old_file_path)
            except Exception as e:
                print(f"Failed to delete old profile picture: {e}")

            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"filename": filename, "url": avatar_url}
