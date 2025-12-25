
import requests
import os
import secrets
from pathlib import Path

BASE_URL = "http://localhost:8001"

def get_random_string(length=8):
    return secrets.token_hex(length // 2)

def register_user():
    username = f"user_{get_random_string()}"
    password = "password123"
    print(f"Registering user: {username}")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "password": password
    })
    if res.status_code != 200:
        print(f"Registration failed: {res.text}")
        return None, None
    return username, password

def upload_photo(username, file_path):
    with open(file_path, "wb") as f:
        f.write(os.urandom(1024)) # Create dummy image content
    
    print(f"Uploading photo for {username}...")
    with open(file_path, "rb") as f:
        # FastAPI UploadFile expects 'file' field
        files = {"file": (os.path.basename(file_path), f, "image/jpeg")}
        data = {"username": username}
        res = requests.post(f"{BASE_URL}/profile/photo", data=data, files=files)
    
    if res.status_code != 200:
        print(f"Upload failed: {res.text}")
        return None
    return res.json().get("url")

def main():
    # 1. Register User
    username, password = register_user()
    if not username:
        return

    # Create dummy images
    img1 = "test_img_1.jpg"
    img2 = "test_img_2.jpg"
    
    try:
        # 2. Upload first photo
        url1 = upload_photo(username, img1)
        if not url1:
            print("Failed to upload first photo.")
            return
        
        print(f"First photo uploaded: {url1}")
        
        # Verify file exists on server
        # Assuming we are running on the same machine
        # URL format: /static/filename
        filename1 = url1.split("/")[-1]
        static_dir = Path("API/static")
        file1_path = static_dir / filename1
        
        if file1_path.exists():
            print(f"File 1 exists: {file1_path}")
        else:
            print(f"File 1 NOT found: {file1_path}")
            return

        import time
        time.sleep(1.5)

        # 3. Upload second photo
        url2 = upload_photo(username, img2)
        if not url2:
            print("Failed to upload second photo.")
            return

        print(f"Second photo uploaded: {url2}")

        # Verify file 1 is DELETED and file 2 exists
        if not file1_path.exists():
            print(f"SUCCESS: File 1 was deleted.")
        else:
            print(f"FAILURE: File 1 still exists.")
            
        filename2 = url2.split("/")[-1]
        file2_path = static_dir / filename2
        if file2_path.exists():
            print(f"File 2 exists: {file2_path}")
        else:
            print(f"File 2 NOT found: {file2_path}")

    finally:
        # Cleanup local test files
        if os.path.exists(img1):
            os.remove(img1)
        if os.path.exists(img2):
            os.remove(img2)

if __name__ == "__main__":
    main()
