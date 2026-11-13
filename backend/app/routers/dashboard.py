from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Analysis, Incident, Indicator
from app.schemas import DashboardSummary
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db)):
    total_indicators = db.scalar(select(func.count(Indicator.id))) or 0
    total_analyses = db.scalar(select(func.count(Analysis.id))) or 0
    active = db.scalar(select(func.count(Incident.id)).where(Incident.status != "Resolved")) or 0
    critical = db.scalar(select(func.count(Incident.id)).where(
        Incident.status != "Resolved", Incident.severity == "Critical")) or 0
    return {"total_indicators": total_indicators, "total_analyses": total_analyses,
            "active_incidents": active, "critical_incidents": critical, "data_mode": "demo"}
