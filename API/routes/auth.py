"""
Auth Router - Authentication endpoints
"""
from fastapi import APIRouter, HTTPException
from database import get_cursor
from models import UserLogin, UserRegister, UserUpdate
from utils import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/check-admin")
def check_admin():
    """Check if any admin user exists"""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
            result = cur.fetchone()
            return {"hasAdmin": result["count"] > 0}
    except Exception as e:
        # Table might not exist yet
        return {"hasAdmin": False}


@router.post("/register")
def register_user(user: UserRegister):
    """Register new user (Public: First user = Admin, others = User)"""
    try:
        with get_cursor() as cur:
            # Check if any user exists (Bootstrap Admin)
            cur.execute("SELECT COUNT(*) as count FROM users")
            count = cur.fetchone()['count']
            
            determined_role = 'admin' if count == 0 else 'user'
            
            # Check if username exists
            cur.execute("SELECT id FROM users WHERE username = %s", (user.username,))
            if cur.fetchone():
                raise HTTPException(400, "Username sudah digunakan")
            
            # Hash password and insert
            password_hash = hash_password(user.password)
            cur.execute("""
                INSERT INTO users (username, password_hash, role)
                VALUES (%s, %s, %s)
                RETURNING id, username, role
            """, (user.username, password_hash, determined_role))
            
            new_user = cur.fetchone()
            return {
                "success": True,
                "user": {
                    "id": new_user["id"],
                    "username": new_user["username"],
                    "role": new_user["role"],
                    "avatar_url": None
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Registration error: {e}")


@router.post("/login")
def login_user(user: UserLogin):
    """Login user and return user info"""
    try:
        with get_cursor() as cur:
            password_hash = hash_password(user.password)
            cur.execute("""
                SELECT id, username, role, force_password_change, avatar_url FROM users 
                WHERE username = %s AND password_hash = %s
            """, (user.username, password_hash))
            
            found_user = cur.fetchone()
            if not found_user:
                raise HTTPException(401, "Username atau password salah")
            
            return {
                "success": True,
                "user": {
                    "id": found_user["id"],
                    "username": found_user["username"],
                    "role": found_user["role"],
                    "avatar_url": found_user["avatar_url"],
                    "isAdmin": found_user["role"] == "admin",
                    "force_password_change": found_user.get("force_password_change", False)
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login error: {e}")


@router.put("/profile")
def update_profile(user: UserUpdate):
    """Update user profile (username/password)"""
    try:
        with get_cursor() as cur:
            # 1. Verify current password
            password_hash = hash_password(user.current_password)
            cur.execute("""
                SELECT id, username, role FROM users 
                WHERE id = %s AND password_hash = %s
            """, (user.user_id, password_hash))
            
            current_user = cur.fetchone()
            if not current_user:
                raise HTTPException(401, "Password saat ini salah")
            
            updates = []
            params = []
            
            # 2. Prepare updates
            if user.username and user.username != current_user["username"]:
                # Check if new username exists
                cur.execute("SELECT id FROM users WHERE username = %s", (user.username,))
                if cur.fetchone():
                    raise HTTPException(400, "Username sudah digunakan")
                updates.append("username = %s")
                params.append(user.username)
            
            if user.new_password:
                new_hash = hash_password(user.new_password)
                updates.append("password_hash = %s")
                params.append(new_hash)
                updates.append("force_password_change = false")
            
            if not updates:
                return {
                    "success": True, 
                    "message": "Tidak ada perubahan",
                    "user": {
                        "id": current_user["id"],
                        "username": current_user["username"],
                        "role": current_user["role"],
                        "isAdmin": current_user["role"] == "admin"
                    }
                }
            
            # 3. Execute update
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, username, role, avatar_url"
            params.append(user.user_id)
            
            cur.execute(query, tuple(params))
            updated_user = cur.fetchone()
            
            return {
                "success": True,
                "user": {
                    "id": updated_user["id"],
                    "username": updated_user["username"],
                    "role": updated_user["role"],
                    "avatar_url": updated_user["avatar_url"],
                    "isAdmin": updated_user["role"] == "admin"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Update error: {e}")
