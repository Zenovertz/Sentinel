import ipaddress
import json
import re
from urllib.parse import urlparse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Analysis, Indicator

# Synthetic records only. 192.0.2.0/24 is reserved for documentation (TEST-NET-1).
# .example is a reserved domain suffix. No live reputation lookup is performed.
DEMO_INTELLIGENCE = {
    "192.0.2.10": {
        "score": 82, "severity": "High", "confidence": 78,
        "evidence": [{"source": "SENTINEL demo feed", "description": "Synthetic suspicious-activity record for product demonstration."}],
        "summary": "This indicator matches a synthetic demonstration record. It is not a live reputation result.",
    },
    "suspicious-demo.example": {
        "score": 68, "severity": "Medium", "confidence": 65,
        "evidence": [{"source": "Local demo dataset", "description": "Domain appears in the local training dataset."}],
        "summary": "This domain appears in the local demonstration dataset. Validate it against trusted live sources before taking action.",
    },
}


def validate_indicator(value: str, indicator_type: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Indicator value cannot be empty.")
    if indicator_type == "ipv4":
        try:
            parsed = ipaddress.ip_address(value)
        except ValueError as exc:
            raise ValueError("Enter a valid IP address.") from exc
        if parsed.version != 4:
            raise ValueError("The selected type is IPv4, but the value is not IPv4.")
    elif indicator_type == "domain":
        pattern = r"(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}"
        if not re.fullmatch(pattern, value):
            raise ValueError("Enter a valid domain name.")
    elif indicator_type == "url":
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Enter a valid http:// or https:// URL.")
    elif indicator_type == "sha256" and not re.fullmatch(r"[a-fA-F0-9]{64}", value):
        raise ValueError("SHA-256 must contain exactly 64 hexadecimal characters.")
    elif indicator_type == "md5" and not re.fullmatch(r"[a-fA-F0-9]{32}", value):
        raise ValueError("MD5 must contain exactly 32 hexadecimal characters.")
    return value


def analyze_indicator(db: Session, value: str, indicator_type: str) -> Analysis:
    value = validate_indicator(value, indicator_type)
    normalized = value.lower()
    indicator = db.scalar(select(Indicator).where(Indicator.value == normalized))
    if indicator is None:
        indicator = Indicator(value=normalized, type=indicator_type, source="manual")
        db.add(indicator)
        db.flush()

    record = DEMO_INTELLIGENCE.get(normalized)
    if record:
        score, severity, confidence = record["score"], record["severity"], record["confidence"]
        evidence, summary, data_mode = record["evidence"], record["summary"], "demo"
    else:
        # Missing information is Unknown, never silently classified as safe.
        score, severity, confidence = None, "Unknown", None
        evidence = []
        summary = ("No matching record exists in the local demonstration dataset. This is not a clean bill of health; "
                   "connect an authorized threat-intelligence provider to obtain a live reputation assessment.")
        data_mode = "insufficient_data"

    analysis = Analysis(indicator_id=indicator.id, risk_score=score, severity=severity,
                        confidence=confidence, data_mode=data_mode,
                        evidence_json=json.dumps(evidence), summary=summary)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def analysis_to_dict(analysis: Analysis) -> dict:
    evidence = json.loads(analysis.evidence_json or "[]")
    if analysis.severity == "Unknown":
        recommendations = [
            "Do not classify the indicator as safe or malicious based on missing data.",
            "Check an approved threat-intelligence provider.",
            "Review relevant local logs and corroborating evidence.",
        ]
    else:
        recommendations = [
            "Validate the evidence with an independent trusted source.",
            "Review related network or endpoint logs.",
            "Create an incident if corroborating evidence affects a protected asset.",
        ]
    # Explainable, deterministic output for the hackathon MVP. This is NOT an LLM
    # and does not claim to discover evidence that is absent from the database.
    if analysis.severity == "Unknown":
        reasoning = [
            "No matching indicator record was found in the local demonstration dataset.",
            "A risk score cannot be calculated responsibly without corroborating evidence.",
            "Unknown means insufficient data; it does not mean safe or malicious.",
        ]
        limitations = [
            "No live reputation provider is connected.",
            "No endpoint, DNS, firewall, or network telemetry is ingested.",
            "No asset criticality context is linked to this analysis.",
        ]
        confidence_label = "Not assessed"
    else:
        reasoning = [
            f"The indicator matched a local synthetic record with severity {analysis.severity}.",
            f"The stored demonstration score is {analysis.risk_score}/100; it is not a calibrated production risk model.",
            *[f"Supporting evidence: {item.get('source', 'Unknown source')} — {item.get('description', 'No description')}" for item in evidence],
        ]
        limitations = [
            "The matched record is synthetic demonstration data, not a live threat-intelligence result.",
            "The score is illustrative and has not been validated against labelled incident outcomes.",
            "Analyst review and independent corroboration are required before response actions.",
        ]
        confidence_label = "Low" if analysis.confidence is None or analysis.confidence < 50 else "Moderate" if analysis.confidence < 80 else "High"

    return {
        "id": analysis.id, "indicator": analysis.indicator.value,
        "indicator_type": analysis.indicator.type, "risk_score": analysis.risk_score,
        "severity": analysis.severity, "confidence": analysis.confidence,
        "confidence_label": confidence_label,
        "data_mode": analysis.data_mode, "evidence": evidence,
        "summary": analysis.summary, "reasoning": reasoning,
        "limitations": limitations, "recommendation": recommendations,
        "created_at": analysis.created_at,
    }
