# Default Database Configuration
DB_DEFAULT = {
    "host": "localhost",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres",
    "password": "postgres"
}

# MQTT Configuration
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPICS = {
    "dht22": "sensor/dht22",
    "pzem004t": "sensor/pzem004t",
    "mq2": "sensor/mq2",
    "bh1750": "sensor/bh1750",
    "relay": "command/relay/#"
}

# Daftar query untuk membuat tabel di database IoT
TABLES = {
    "data_dht22": """
        CREATE TABLE IF NOT EXISTS data_dht22 (
            id SERIAL PRIMARY KEY,
            temperature FLOAT,
            humidity FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "data_pzem004t": """
        CREATE TABLE IF NOT EXISTS data_pzem004t (
            id SERIAL PRIMARY KEY,
            voltage FLOAT,
            current FLOAT,
            power FLOAT,
            energy FLOAT,
            power_factor FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "data_mq2": """
        CREATE TABLE IF NOT EXISTS data_mq2 (
            id SERIAL PRIMARY KEY,
            gas_lpg FLOAT,
            gas_co FLOAT,
            smoke FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "data_bh1750": """
        CREATE TABLE IF NOT EXISTS data_bh1750 (
            id SERIAL PRIMARY KEY,
            lux FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "status_relay": """
        CREATE TABLE IF NOT EXISTS status_relay (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            gpio INT,
            is_active BOOLEAN DEFAULT false
        );
    """,
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            force_password_change BOOLEAN DEFAULT false
        );
    """
}

# Nama database IoT
IOT_DB = "iotdb"
