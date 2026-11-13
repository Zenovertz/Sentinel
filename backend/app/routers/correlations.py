from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Analysis, Asset, Incident, Indicator

router = APIRouter(prefix="/correlations", tags=["Threat Correlation"])


@router.get("/graph")
def correlation_graph(db: Session = Depends(get_db)):
    """Build an evidence-backed graph from persisted foreign-key relationships.

    This endpoint deliberately does not infer attribution or invent links. Every
    edge is supported by a database relationship: analysis->indicator,
    incident->analysis, or incident->asset.
    """
    indicators = list(db.scalars(select(Indicator).order_by(Indicator.id)))
    analyses = list(db.scalars(select(Analysis).options(joinedload(Analysis.indicator)).order_by(Analysis.id)))
    incidents = list(db.scalars(select(Incident).options(joinedload(Incident.analysis), joinedload(Incident.asset)).order_by(Incident.id)))
    assets = list(db.scalars(select(Asset).order_by(Asset.id)))

    nodes = []
    edges = []
    for item in indicators:
        nodes.append({"id": f"ioc-{item.id}", "type": "indicator", "label": item.value,
                      "subtitle": item.type.upper(), "severity": "Unknown", "data": {"source": item.source}})
    for item in analyses:
        nodes.append({"id": f"analysis-{item.id}", "type": "analysis", "label": f"Analysis #{item.id}",
                      "subtitle": f"{item.severity} · {item.data_mode}", "severity": item.severity,
                      "data": {"risk_score": item.risk_score, "confidence": item.confidence}})
        edges.append({"id": f"edge-analysis-ioc-{item.id}", "source": f"analysis-{item.id}",
                      "target": f"ioc-{item.indicator_id}", "relationship": "analyzed indicator",
                      "evidence": "Analysis record references this indicator (database foreign key).", "confidence": "High"})
    for item in assets:
        nodes.append({"id": f"asset-{item.id}", "type": "asset", "label": item.name,
                      "subtitle": f"{item.asset_type} · {item.criticality} criticality", "severity": "Info",
                      "data": {"criticality": item.criticality}})
    for item in incidents:
        nodes.append({"id": f"incident-{item.id}", "type": "incident", "label": item.incident_code,
                      "subtitle": item.title, "severity": item.severity,
                      "data": {"status": item.status, "owner": item.owner}})
        if item.analysis_id:
            edges.append({"id": f"edge-incident-analysis-{item.id}", "source": f"incident-{item.id}",
                          "target": f"analysis-{item.analysis_id}", "relationship": "created from analysis",
                          "evidence": "Incident stores the analysis_id foreign key.", "confidence": "High"})
        if item.asset_id:
            edges.append({"id": f"edge-incident-asset-{item.id}", "source": f"incident-{item.id}",
                          "target": f"asset-{item.asset_id}", "relationship": "affects asset",
                          "evidence": "Incident stores the asset_id foreign key.", "confidence": "High"})

    return {"nodes": nodes, "edges": edges,
            "meta": {"node_count": len(nodes), "edge_count": len(edges),
                     "data_mode": "database_relationships",
                     "method": "Explicit persisted relationships only; no inferred attribution."}}
