from fastapi.testclient import TestClient
from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_demo_ioc_analysis():
    with TestClient(app) as client:
        response = client.post("/api/v1/ioc/analyze", json={"value": "192.0.2.10", "type": "ipv4"})
        assert response.status_code == 200
        body = response.json()
        assert body["data_mode"] == "demo"
        assert body["risk_score"] == 82
        assert body["evidence"]
        assert body["reasoning"]
        assert body["limitations"]
        assert body["confidence_label"] == "Moderate"


def test_unknown_ioc_is_not_assumed_safe():
    with TestClient(app) as client:
        response = client.post("/api/v1/ioc/analyze", json={"value": "192.0.2.55", "type": "ipv4"})
        assert response.status_code == 200
        body = response.json()
        assert body["severity"] == "Unknown"
        assert body["risk_score"] is None
        assert body["data_mode"] == "insufficient_data"
        assert body["reasoning"]
        assert any("does not mean safe" in item.lower() for item in body["reasoning"])
        assert body["confidence_label"] == "Not assessed"


def test_invalid_ip_rejected():
    with TestClient(app) as client:
        response = client.post("/api/v1/ioc/analyze", json={"value": "not-an-ip", "type": "ipv4"})
        assert response.status_code == 422


def test_incident_status_update():
    with TestClient(app) as client:
        rows = client.get("/api/v1/incidents").json()
        response = client.patch(f"/api/v1/incidents/{rows[0]['id']}/status", json={"status": "Contained"})
        assert response.status_code == 200
        assert response.json()["status"] == "Contained"


def test_correlation_graph_uses_persisted_relationships():
    with TestClient(app) as client:
        analysis = client.post("/api/v1/ioc/analyze", json={"value": "192.0.2.10", "type": "ipv4"})
        assert analysis.status_code == 200
        assets = client.get("/api/v1/correlations/graph").json()
        asset_node = next(node for node in assets["nodes"] if node["type"] == "asset")
        created = client.post("/api/v1/incidents", json={
            "title": "Correlated demo investigation", "severity": "High",
            "analysis_id": analysis.json()["id"], "asset_id": int(asset_node["id"].split("-")[1]),
            "description": "Synthetic test relationship"
        })
        assert created.status_code == 201
        graph = client.get("/api/v1/correlations/graph")
        assert graph.status_code == 200
        body = graph.json()
        assert body["meta"]["node_count"] == len(body["nodes"])
        assert body["meta"]["edge_count"] == len(body["edges"])
        relationships = {edge["relationship"] for edge in body["edges"]}
        assert "analyzed indicator" in relationships
        assert "created from analysis" in relationships
        assert "affects asset" in relationships
        assert "inferred attribution" in body["meta"]["method"].lower()


def test_assets_endpoint_returns_demo_assets():
    with TestClient(app) as client:
        response = client.get("/api/v1/assets")
        assert response.status_code == 200
        assert response.json()
        assert {"id", "name", "criticality"}.issubset(response.json()[0])
