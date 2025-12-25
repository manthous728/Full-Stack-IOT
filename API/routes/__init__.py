# Routes package
from .auth import router as auth_router
from .profile import router as profile_router
from .relay import router as relay_router
from .admin import router as admin_router
from .sensors import router as sensors_router
from .settings import router as settings_router

__all__ = [
    "auth_router",
    "relay_router",
    "admin_router",
    "sensors_router",
    "settings_router",
    "profile_router",
]
