import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

DB = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "iotdb"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

API_TITLE = os.getenv("API_TITLE", "IoT Sensor API")
API_VERSION = os.getenv("API_VERSION", "1.0")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
