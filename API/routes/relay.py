"""
Relay Router - Relay control endpoints
"""
from fastapi import APIRouter, HTTPException
from database import get_cursor
from models import RelayUpdate, RelayRename

router = APIRouter(prefix="/relays", tags=["Relays"])


@router.get("")
def get_relays():
    """Get all relays status"""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM status_relay ORDER BY id ASC")
            return cur.fetchall()
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


@router.get("/{relay_id}")
def get_relay_by_id(relay_id: int):
    """Get single relay by ID"""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM status_relay WHERE id = %s", (relay_id,))
            result = cur.fetchone()
            if not result:
                raise HTTPException(404, f"Relay dengan ID {relay_id} tidak ditemukan")
            return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


@router.put("/{relay_id}")
def update_relay_status(relay_id: int, update: RelayUpdate):
    """Update single relay status (on/off)"""
    try:
        with get_cursor() as cur:
            cur.execute(
                "UPDATE status_relay SET is_active = %s WHERE id = %s RETURNING id, name, is_active",
                (update.is_active, relay_id)
            )
            result = cur.fetchone()
            if not result:
                raise HTTPException(404, f"Relay dengan ID {relay_id} tidak ditemukan")
            return {"success": True, "relay": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error updating relay: {e}")


@router.patch("/{relay_id}/name")
def rename_relay(relay_id: int, update: RelayRename):
    """Rename relay"""
    try:
        with get_cursor() as cur:
            cur.execute(
                "UPDATE status_relay SET name = %s WHERE id = %s RETURNING id, name, gpio, is_active",
                (update.name, relay_id)
            )
            result = cur.fetchone()
            if not result:
                raise HTTPException(404, f"Relay dengan ID {relay_id} tidak ditemukan")
            return {"success": True, "relay": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error renaming relay: {e}")
