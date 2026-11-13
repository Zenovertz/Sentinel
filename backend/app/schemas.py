from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

IndicatorType = Literal["ipv4", "domain", "url", "sha256", "md5"]
IncidentStatus = Literal["New", "Investigating", "Contained", "Resolved"]
Severity = Literal["Critical", "High", "Medium", "Low", "Unknown"]


class IndicatorCreate(BaseModel):
    value: str = Field(min_length=1, max_length=512)
    type: IndicatorType
    source: str = Field(default="manual", max_length=120)
    notes: str | None = None


class IndicatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    value: str
    type: str
    source: str
    first_seen: datetime
    notes: str | None
    risk_score: int | None = None
    severity: Severity = "Unknown"
    confidence: int | None = None


class AnalyzeRequest(BaseModel):
    value: str = Field(min_length=1, max_length=512)
    type: IndicatorType


class AnalysisOut(BaseModel):
    id: int
    indicator: str
    indicator_type: str
    risk_score: int | None
    severity: Severity
    confidence: int | None
    confidence_label: str
    data_mode: str
    evidence: list[dict]
    summary: str
    reasoning: list[str]
    limitations: list[str]
    recommendation: list[str]
    created_at: datetime


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    severity: Severity = "Medium"
    status: IncidentStatus = "New"
    owner: str = "Unassigned"
    asset_id: int | None = None
    analysis_id: int | None = None
    description: str | None = None


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus


class IncidentOut(BaseModel):
    id: int
    incident_code: str
    title: str
    asset_name: str | None
    severity: str
    status: str
    owner: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class DashboardSummary(BaseModel):
    total_indicators: int
    total_analyses: int
    active_incidents: int
    critical_incidents: int
    data_mode: str
