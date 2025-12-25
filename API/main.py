"""
Smart Home IoT API - Main Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_pool, close_pool, check_database_exists
from config import DB, API_TITLE, API_VERSION, CORS_ORIGINS
from utils import init_db
from routes import auth_router, relay_router, admin_router, sensors_router, settings_router, profile_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events untuk connection pool"""
    # Cek database sebelum startup
    if not check_database_exists():
        print(f"\n[FATAL] Database '{DB['dbname']}' belum ada.")
        print(f"Silakan buat database '{DB['dbname']}' terlebih dahulu.\n")
        raise RuntimeError(f"Database '{DB['dbname']}' belum dibuat.")

    # Startup: inisialisasi pool dan db
    init_pool(minconn=2, maxconn=10)
    init_db()
    
    yield
    
    # Shutdown: tutup pool
    close_pool()


# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles

# Mount static files for profile photos
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
origins = CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(relay_router)
app.include_router(admin_router)
app.include_router(sensors_router)
app.include_router(profile_router)
app.include_router(settings_router)


@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Smart Home IoT API is running"}
