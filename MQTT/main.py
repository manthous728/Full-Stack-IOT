
import json
import psycopg2
from paho.mqtt import client as mqtt
from config import DB_DEFAULT, MQTT_BROKER, MQTT_PORT, MQTT_TOPICS
from datetime import datetime, timezone
import sys
import time
import requests
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Config centralized in config.py

TABLES = {
    "dht22": "data_dht22",
    "pzem004t": "data_pzem004t",
    "mq2": "data_mq2",
    "bh1750": "data_bh1750"
}

DB_IOT = DB_DEFAULT.copy()
DB_IOT["dbname"] = "iotdb"


def check_database_exists():
    try:
        # connect ke postgres (default DB)
        tmp = DB_DEFAULT.copy()
        tmp["dbname"] = "postgres"

        with psycopg2.connect(**tmp) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", ("iotdb",))
                return cur.fetchone() is not None

    except Exception as e:
        print("Gagal mengecek database:", e)
        return False


def insert_data(sensor, data):
    table = TABLES.get(sensor)
    if not table:
        print(f"[{sensor}] Tidak ada tabel")
        time.sleep(2)
        return

    timestamp = data.get("timestamp", datetime.now(timezone.utc).isoformat())

    try:
        with psycopg2.connect(**DB_IOT) as conn:
            with conn.cursor() as cur:

                if sensor == "dht22":
                    temp = data.get("temp")
                    if temp is None:
                        temp = data.get("temperature")
                        
                    hum = data.get("hum")
                    if hum is None:
                        hum = data.get("humidity")

                    cur.execute(
                        f"INSERT INTO {table} (temperature, humidity, timestamp) VALUES (%s, %s, %s)",
                        (temp, hum, timestamp)
                    )

                elif sensor == "pzem004t":
                    cur.execute(
                        f"""INSERT INTO {table} 
                        (voltage, current, power, energy, power_factor, timestamp) 
                        VALUES (%s, %s, %s, %s, %s, %s)""",
                        (
                            data.get("voltage"),
                            data.get("current"),
                            data.get("power"),
                            data.get("energy"),
                            data.get("power_factor"),
                            timestamp
                        )
                    )

                elif sensor == "mq2":
                    lpg = data.get("lpg")
                    if lpg is None:
                        lpg = data.get("gas_lpg")
                    if lpg is None:
                        lpg = data.get("LPG")
                        
                    co = data.get("co")
                    if co is None:
                        co = data.get("gas_co")
                    if co is None:
                        co = data.get("CO")
                        
                    smoke = data.get("smoke")
                    if smoke is None:
                        smoke = data.get("Smoke")
                        
                    cur.execute(
                        f"INSERT INTO {table} (gas_lpg, gas_co, smoke, timestamp) VALUES (%s, %s, %s, %s)",
                        (lpg, co, smoke, timestamp)
                    )

                elif sensor == "bh1750":
                    cur.execute(
                        f"INSERT INTO {table} (lux, timestamp) VALUES (%s, %s)",
                        (data.get("lux"), timestamp)
                    )

        print(f"[{sensor}] Data masuk → {data}")

    except Exception as e:
        print(f"[{sensor}] DB Error:", e)


def on_message(client, userdata, message):
    try:
        payload = json.loads(message.payload.decode())

        for sensor, topic in MQTT_TOPICS.items():
            if sensor == "relay":
                # Check match manually since it uses wildcard #
                if message.topic.startswith("command/relay/"):
                    try:
                        # Parse relay ID from topic or payload
                        relay_id = int(message.topic.split("/")[-1])
                        state = payload.get("state", False)
                        
                        print(f"[RELAY] ID={relay_id} State={state}")
                        
                        # Sync to DB
                        with psycopg2.connect(**DB_IOT) as conn:
                            with conn.cursor() as cur:
                                cur.execute("UPDATE status_relay SET is_active = %s WHERE id = %s", (state, relay_id))
                                conn.commit()
                                print(f"[RELAY] Saved to DB (status_relay).")
                    except Exception as e:
                        print(f"[RELAY] Sync Error: {e}")
                continue

            if message.topic == topic:
                insert_data(sensor, payload)
                break

    except Exception as e:
        print("Parse Error:", e)




def on_connect(client, userdata, flags, rc, properties=None):
    """Callback saat berhasil konek ke broker"""
    if rc == 0:
        print("✔ Terhubung ke MQTT broker")
        # Subscribe ke semua topic saat connect/reconnect
        for topic in MQTT_TOPICS.values():
            client.subscribe(topic)
            print(f"  → Subscribed: {topic}")
    else:
        error_messages = {
            1: "Incorrect protocol version",
            2: "Invalid client identifier",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized"
        }
        print(f"❌ Gagal connect: {error_messages.get(rc, f'Unknown error ({rc})')}")


def on_disconnect(client, userdata, disconnect_flags, rc, properties=None):
    """Callback saat terputus dari broker"""
    if rc == 0:
        print("ℹ Disconnected secara normal")
    else:
        print(f"⚠ Disconnected dari broker (rc={rc}). Auto-reconnect aktif...")


def main():
    print("Cek database dulu...")

    if not check_database_exists():
        print("❌ Database 'iotdb' belum ada.")
        print("   Jalankan 'python init_db.py' terlebih dahulu.")
        sys.exit(1)

    print("✔ Database ditemukan. Lanjut…")

    # Load initial settings
    load_settings()

    # Setup MQTT client dengan reconnect otomatis
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    # Set reconnect delay (min 1 detik, max 120 detik dengan exponential backoff)
    client.reconnect_delay_set(min_delay=1, max_delay=120)

    try:
        print(f"Menghubungkan ke {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        print("MQTT listener aktif... nunggu data masuk 😎")
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n⏹ Dihentikan oleh user")
        client.disconnect()
    except Exception as e:
        print(f"❌ Error koneksi MQTT: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
