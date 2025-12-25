"""
Settings Router - App settings & notifications endpoints
"""
import json
import requests
from fastapi import APIRouter, HTTPException
from database import get_cursor
from models import SettingsUpdate, TelegramTest
from utils import DEFAULT_THRESHOLDS

router = APIRouter(tags=["Settings"])


@router.get("/settings")
def get_settings():
    """Get all application settings including thresholds"""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT setting_key, setting_value FROM app_settings")
            rows = cur.fetchall()
            
            settings = {}
            for row in rows:
                settings[row['setting_key']] = row['setting_value']
            
            # Return default if no settings found
            if not settings.get('thresholds'):
                settings['thresholds'] = DEFAULT_THRESHOLDS
            
            # Get enable_thresholds setting (default to True if not found)
            if 'enable_thresholds' not in settings:
                settings['enable_thresholds'] = True
                
            # Get telegram_config setting (default dict if not found)
            if 'telegram_config' not in settings:
                settings['telegram_config'] = {"bot_token": "", "chat_id": "", "enabled": False}
            
            return {"success": True, "settings": settings}
    except Exception as e:
        raise HTTPException(500, f"Error fetching settings: {e}")


@router.put("/settings")
def update_settings(settings_data: SettingsUpdate):
    """Update application settings (thresholds)"""
    try:
        thresholds = settings_data.thresholds
        
        # Validate thresholds
        errors = []
        
        # DHT22 validation
        if 'dht22' in thresholds:
            dht = thresholds['dht22']
            if dht.get('tempMin') is not None and dht.get('tempMax') is not None:
                if dht['tempMin'] > dht['tempMax']:
                    errors.append("Suhu Min tidak boleh lebih besar dari Suhu Max")
            if dht.get('humMin') is not None and dht.get('humMax') is not None:
                if dht['humMin'] > dht['humMax']:
                    errors.append("Kelembaban Min tidak boleh lebih besar dari Kelembaban Max")
        
        # MQ2 validation
        if 'mq2' in thresholds:
            mq = thresholds['mq2']
            if mq.get('smokeWarn') is not None and mq.get('smokeMax') is not None:
                if mq['smokeWarn'] > mq['smokeMax']:
                    errors.append("Smoke Waspada tidak boleh lebih besar dari Smoke Bahaya")
        
        # PZEM004T validation
        if 'pzem004t' in thresholds:
            pz = thresholds['pzem004t']
            if pz.get('voltageMin') is not None and pz.get('voltageMax') is not None:
                if pz['voltageMin'] > pz['voltageMax']:
                    errors.append("Tegangan Min tidak boleh lebih besar dari Tegangan Max")
        
        # BH1750 validation
        if 'bh1750' in thresholds:
            bh = thresholds['bh1750']
            if bh.get('luxMin') is not None and bh.get('luxMax') is not None:
                if bh['luxMin'] > bh['luxMax']:
                    errors.append("Cahaya Min tidak boleh lebih besar dari Cahaya Max")
        
        if errors:
            raise HTTPException(400, "; ".join(errors))
            
        with get_cursor() as cur:
            # Update thresholds
            cur.execute(
                "INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = %s, updated_at = NOW()",
                ('thresholds', json.dumps(thresholds), json.dumps(thresholds))
            )
            
            # Update enable_thresholds if provided
            if settings_data.enable_thresholds is not None:
                cur.execute(
                    "INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = %s, updated_at = NOW()",
                    ('enable_thresholds', json.dumps(settings_data.enable_thresholds), json.dumps(settings_data.enable_thresholds))
                )
                
            # Update telegram_config if provided
            if settings_data.telegram_config is not None:
                cur.execute(
                    "INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = %s, updated_at = NOW()",
                    ('telegram_config', json.dumps(settings_data.telegram_config), json.dumps(settings_data.telegram_config))
                )
            
            # Fetch the updated thresholds to return
            cur.execute("SELECT setting_value FROM app_settings WHERE setting_key = 'thresholds'")
            result = cur.fetchone()
            
            return {
                "success": True, 
                "message": "Pengaturan berhasil disimpan",
                "thresholds": result['setting_value'] if result else thresholds,
                "enable_thresholds": settings_data.enable_thresholds,
                "telegram_config": settings_data.telegram_config
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error saving settings: {e}")


@router.post("/settings/reset")
def reset_settings():
    """Reset settings to default values"""
    try:
        default_enable_thresholds = False
        default_telegram_config = {"bot_token": "", "chat_id": "", "enabled": False}

        with get_cursor() as cur:
            # Reset thresholds
            cur.execute("""
                INSERT INTO app_settings (setting_key, setting_value, updated_at)
                VALUES ('thresholds', %s, NOW())
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
            """, (json.dumps(DEFAULT_THRESHOLDS),))
            
            # Reset enable_thresholds to False
            cur.execute("""
                INSERT INTO app_settings (setting_key, setting_value, updated_at)
                VALUES ('enable_thresholds', %s, NOW())
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
            """, (json.dumps(default_enable_thresholds),))
            
            # Reset telegram_config to disabled
            cur.execute("""
                INSERT INTO app_settings (setting_key, setting_value, updated_at)
                VALUES ('telegram_config', %s, NOW())
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
            """, (json.dumps(default_telegram_config),))
            
            return {
                "success": True, 
                "message": "Pengaturan berhasil direset ke default (Notifikasi dinonaktifkan)",
                "thresholds": DEFAULT_THRESHOLDS,
                "enable_thresholds": default_enable_thresholds,
                "telegram_config": default_telegram_config
            }
    except Exception as e:
        raise HTTPException(500, f"Error resetting settings: {e}")


@router.post("/notify/telegram/test")
def test_telegram(data: TelegramTest):
    """Test send Telegram message"""
    try:
        url = f"https://api.telegram.org/bot{data.bot_token}/sendMessage"
        
        # Simulasikan pesan alert jika diminta
        if "alert" in data.message.lower() or data.message == "test_alert":
            message = "⚠️ *SAMPLE ALERT (TEST)*\nSensor: *DHT22*\nKondisi: *Suhu Tinggi*\nNilai: *36.5 °C* (Batas: 35.0 °C)"
        else:
            message = f"🔔 *TEST KONEKSI SUCCESS*\n\n{data.message}\n\nJika Anda menerima pesan ini, berarti Bot Token dan Chat ID Anda sudah benar! ✅"

        payload = {
            "chat_id": data.chat_id,
            "text": message,
            "parse_mode": "Markdown"
        }
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            return {"success": True, "message": "Pesan terkirim!"}
        else:
            return {"success": False, "message": f"Gagal: {res.text}"}
    except Exception as e:
        raise HTTPException(500, f"Error sending message: {e}")
@router.post("/notify/telegram/send")
def send_telegram_alert(data: dict):
    """Send generic Telegram alert using stored configuration"""
    try:
        message = data.get("message")
        if not message:
             raise HTTPException(400, "Message is required")

        # Get config from DB
        with get_cursor() as cur:
            cur.execute("SELECT setting_value FROM app_settings WHERE setting_key = 'telegram_config'")
            res = cur.fetchone()
            if not res:
                return {"success": False, "message": "Telegram config not found"}
            
            tg_config = res['setting_value']
            
            if not tg_config.get("enabled"):
                return {"success": False, "message": "Telegram disabled"}
                
            token = tg_config.get("bot_token")
            chat_id = tg_config.get("chat_id")
            
            if not token or not chat_id:
                return {"success": False, "message": "Incomplete Telegram config"}

            url = f"https://api.telegram.org/bot{token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 200:
                return {"success": True, "message": "Alert sent"}
            else:
                print(f"Telegram Fail: {resp.text}")
                return {"success": False, "message": "Failed to send to Telegram"}
                
    except Exception as e:
        print(f"Error sending alert: {e}")
        raise HTTPException(500, str(e))
