from pydantic import BaseModel
from typing import Optional


class SettingsUpdate(BaseModel):
    thresholds: dict
    enable_thresholds: Optional[bool] = True
    telegram_config: Optional[dict] = None


class TelegramTest(BaseModel):
    bot_token: str
    chat_id: str
    message: str = "Test notifikasi dari Smart Home Dashboard! 🚀"
