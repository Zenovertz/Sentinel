from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Asset

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("")
def list_assets(db: Session = Depends(get_db)):
    rows = db.scalars(select(Asset).order_by(Asset.id))
    return [{"id": row.id, "name": row.name, "asset_type": row.asset_type,
             "criticality": row.criticality, "description": row.description} for row in rows]
