from fastapi import APIRouter
from sqlalchemy import text
from app.database import engine
router = APIRouter(tags=["System"])

@router.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "unavailable"}
