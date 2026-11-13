from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Analysis, Indicator
from app.schemas import IndicatorCreate, IndicatorOut
from app.services import validate_indicator
router = APIRouter(prefix="/indicators", tags=["Indicators"])

@router.get("", response_model=list[IndicatorOut])
def list_indicators(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    rows = list(db.scalars(select(Indicator).order_by(Indicator.id.desc()).limit(limit)))
    output = []
    for item in rows:
        latest = db.scalar(select(Analysis).where(Analysis.indicator_id == item.id).order_by(Analysis.id.desc()).limit(1))
        output.append({"id": item.id, "value": item.value, "type": item.type, "source": item.source,
                       "first_seen": item.first_seen, "notes": item.notes,
                       "risk_score": latest.risk_score if latest else None,
                       "severity": latest.severity if latest else "Unknown",
                       "confidence": latest.confidence if latest else None})
    return output

@router.post("", response_model=IndicatorOut, status_code=201)
def create_indicator(payload: IndicatorCreate, db: Session = Depends(get_db)):
    try:
        value = validate_indicator(payload.value, payload.type).lower()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if db.scalar(select(Indicator).where(Indicator.value == value)):
        raise HTTPException(status_code=409, detail="Indicator already exists.")
    item = Indicator(value=value, type=payload.type, source=payload.source, notes=payload.notes)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
