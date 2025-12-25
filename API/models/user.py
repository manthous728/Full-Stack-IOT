from pydantic import BaseModel
from typing import Optional


class UserLogin(BaseModel):
    username: str
    password: str


class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "admin"


class UserUpdate(BaseModel):
    user_id: int
    current_password: str
    username: Optional[str] = None
    new_password: Optional[str] = None


class UserCreateAdmin(BaseModel):
    username: str
    password: str
    role: str = "user"
