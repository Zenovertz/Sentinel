from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Incident, IncidentEvent
from app.schemas import IncidentCreate, IncidentOut, IncidentStatusUpdate
router = APIRouter(prefix="/incidents", tags=["Incidents"])


def to_out(item: Incident) -> dict:
    return {"id": item.id, "incident_code": item.incident_code, "title": item.title,
            "asset_name": item.asset.name if item.asset else None, "severity": item.severity,
            "status": item.status, "owner": item.owner, "description": item.description,
            "created_at": item.created_at, "updated_at": item.updated_at}

@router.get("", response_model=list[IncidentOut])
def list_incidents(db: Session = Depends(get_db)):
    rows = db.scalars(select(Incident).options(joinedload(Incident.asset)).order_by(Incident.id.desc())).unique()
    return [to_out(row) for row in rows]

@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    count = db.scalar(select(func.count(Incident.id))) or 0
    year = datetime.now(timezone.utc).year
    item = Incident(incident_code=f"INC-{year}-{count + 1:03d}", title=payload.title,
                    asset_id=payload.asset_id, analysis_id=payload.analysis_id,
                    severity=payload.severity, status=payload.status, owner=payload.owner,
                    description=payload.description)
    db.add(item)
    db.flush()
    db.add(IncidentEvent(incident_id=item.id, event_type="created", message="Incident created."))
    db.commit()
    item = db.scalar(select(Incident).options(joinedload(Incident.asset)).where(Incident.id == item.id))
    return to_out(item)

@router.patch("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(incident_id: int, payload: IncidentStatusUpdate, db: Session = Depends(get_db)):
    item = db.scalar(select(Incident).options(joinedload(Incident.asset)).where(Incident.id == incident_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    old_status = item.status
    item.status = payload.status
    item.updated_at = datetime.now(timezone.utc)
    db.add(IncidentEvent(incident_id=item.id, event_type="status_changed",
                         message=f"Status changed from {old_status} to {payload.status}."))
    db.commit()
    item = db.scalar(select(Incident).options(joinedload(Incident.asset)).where(Incident.id == incident_id))
    return to_out(item)
