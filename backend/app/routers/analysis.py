from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import AnalyzeRequest, AnalysisOut
from app.services import analyze_indicator, analysis_to_dict
router = APIRouter(prefix="/ioc", tags=["IOC Analysis"])

@router.post("/analyze", response_model=AnalysisOut)
def analyze(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    try:
        result = analyze_indicator(db, payload.value, payload.type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return analysis_to_dict(result)
