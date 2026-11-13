from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Asset, Incident, IncidentEvent, Indicator


def seed_demo_data(db: Session) -> None:
    if db.scalar(select(Indicator.id).limit(1)) is not None:
        return
    indicators = [
        Indicator(value="192.0.2.10", type="ipv4", source="SENTINEL demo feed", notes="Reserved TEST-NET address; synthetic record."),
        Indicator(value="suspicious-demo.example", type="domain", source="Local demo dataset", notes="Reserved .example domain; synthetic record."),
    ]
    assets = [
        Asset(name="Database Server", asset_type="IT", criticality="Critical", description="Synthetic demo asset."),
        Asset(name="Web Gateway", asset_type="IT", criticality="High", description="Synthetic demo asset."),
        Asset(name="Test Workstation", asset_type="IT", criticality="Low", description="Synthetic demo asset."),
    ]
    db.add_all(indicators + assets)
    db.flush()
    incident = Incident(incident_code="INC-2026-001", title="Demo suspicious outbound connection",
                        asset_id=assets[0].id, severity="High", status="Investigating",
                        owner="Security Analyst", description="Synthetic case for testing the SENTINEL workflow.")
    db.add(incident)
    db.flush()
    db.add(IncidentEvent(incident_id=incident.id, event_type="created",
                         message="Demo incident created during database initialization."))
    db.commit()
