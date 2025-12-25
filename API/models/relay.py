from pydantic import BaseModel


class RelayUpdate(BaseModel):
    is_active: bool


class RelayRename(BaseModel):
    name: str
