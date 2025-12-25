"""
Utility functions dan konstanta untuk API Smart Home
"""
import hashlib
from datetime import timedelta
from fastapi import HTTPException
from database import get_cursor
from config import DB

# Mapping sensor → nama tabel (hanya nama yang valid, mencegah SQL injection)
TABLES = {
    "dht22": "data_dht22",
    "mq2": "data_mq2",
    "pzem004t": "data_pzem004t",
    "bh1750": "data_bh1750"
}

# Mapping kolom per sensor (Updated to match DB schema)
COLUMNS = {
    "dht22": ["timestamp", "id", "temperature", "humidity"],
    "mq2": ["timestamp", "id", "gas_lpg", "gas_co", "smoke"],
    "pzem004t": ["timestamp", "id", "voltage", "current", "power", "energy", "power_factor"],
    "bh1750": ["timestamp", "id", "lux"]
}

# Range waktu dengan interval sampling optimal
RANGES = {
    "1h": {"delta": timedelta(hours=1), "interval": "10 minutes"},   # 6 points
    "6h": {"delta": timedelta(hours=6), "interval": "1 hour"},       # 6 points
    "12h": {"delta": timedelta(hours=12), "interval": "2 hours"},    # 6 points
    "24h": {"delta": timedelta(hours=24), "interval": "4 hours"},    # 6 points
    "7d": {"delta": timedelta(days=7), "interval": "1 day"},         # 7 points
}

# Default threshold settings
DEFAULT_THRESHOLDS = {
    "dht22": {"tempMax": 35, "tempMin": 15, "humMax": 80, "humMin": 30},
    "mq2": {"smokeMax": 500, "smokeWarn": 350, "lpgMax": 1000, "lpgWarn": 500, "coMax": 500, "coWarn": 200},
    "pzem004t": {"powerMax": 2000, "voltageMin": 180, "voltageMax": 240, "currentMax": 10, "energyMax": 100, "pfMin": 0.85},
    "bh1750": {"luxMax": 100000, "luxMin": 0}
}


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def validate_sensor(sensor: str):
    """Validasi nama sensor dan return nama tabel yang aman"""
    if sensor not in TABLES:
        raise HTTPException(400, f"Sensor '{sensor}' tidak dikenal. Sensor yang tersedia: {list(TABLES.keys())}")
    return TABLES[sensor], COLUMNS[sensor]


def init_db():
    """Inisialisasi database dan tabel users jika belum ada"""
    try:
        with get_cursor() as cur:
            # Create users table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            
            # Check for missing columns (migration for existing tables)
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
            columns = [row['column_name'] for row in cur.fetchall()]
            
            if 'is_active' not in columns:
                cur.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true")
            if 'created_at' not in columns:
                cur.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()")
            if 'force_password_change' not in columns:
                cur.execute("ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT false")
            if 'avatar_url' not in columns:
                cur.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL")
                
            print("Database initialized successfully.")

            # Create status_relay table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS status_relay (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    gpio INT,
                    is_active BOOLEAN DEFAULT false
                );
            """)
            
            # Create settings table for threshold configurations
            cur.execute("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    id SERIAL PRIMARY KEY,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value JSONB NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """)
            
            # Check defaults for status_relay
            cur.execute("SELECT COUNT(*) as count FROM status_relay")
            if cur.fetchone()['count'] == 0:
                 print("Seeding default status_relay...")
                 cur.execute("""
                    INSERT INTO status_relay (id, name, gpio, is_active) VALUES 
                    (1, 'Lampu Teras', 12, false),
                    (2, 'Pompa Air', 14, false),
                    (3, 'Exhaust Fan', 27, false),
                    (4, 'Door Lock', 26, false)
                 """)
            
            # Check defaults for app_settings (thresholds)
            cur.execute("SELECT COUNT(*) as count FROM app_settings WHERE setting_key = 'thresholds'")
            if cur.fetchone()['count'] == 0:
                print("Seeding default threshold settings...")
                import json
                cur.execute(
                    "INSERT INTO app_settings (setting_key, setting_value) VALUES (%s, %s)",
                    ('thresholds', json.dumps(DEFAULT_THRESHOLDS))
                )
    except Exception as e:
        print(f"Database init error: {e}")
