const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type ApiIndicator = {
  id: number; value: string; type: string; source: string;
  first_seen: string; notes: string | null; risk_score?: number | null;
  severity?: string; confidence?: number | null;
};
export type ApiAnalysis = {
  id: number; indicator: string; indicator_type: string; risk_score: number | null;
  severity: string; confidence: number | null; confidence_label: string; data_mode: string;
  evidence: { source: string; description: string }[]; summary: string;
  reasoning: string[]; limitations: string[]; recommendation: string[]; created_at: string;
};
export type ApiGraphNode = { id: string; type: "indicator" | "analysis" | "incident" | "asset"; label: string; subtitle: string; severity: string; data: Record<string, unknown> };
export type ApiGraphEdge = { id: string; source: string; target: string; relationship: string; evidence: string; confidence: string };
export type ApiAsset = { id: number; name: string; asset_type: string; criticality: string; description: string | null };
export type ApiGraph = { nodes: ApiGraphNode[]; edges: ApiGraphEdge[]; meta: { node_count: number; edge_count: number; data_mode: string; method: string } };

export type ApiIncident = {
  id: number; incident_code: string; title: string; asset_name: string | null;
  severity: string; status: "New" | "Investigating" | "Contained" | "Resolved";
  owner: string; description: string | null; created_at: string; updated_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Backend tidak dapat dihubungi. Pastikan FastAPI berjalan di http://localhost:8000.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === "string" ? detail : `Request gagal (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: async () => { const response = await fetch("http://localhost:8000/health", { cache: "no-store" }); if (!response.ok) throw new Error("Backend offline"); return response.json() as Promise<{ status: string }>; },
  indicators: () => request<ApiIndicator[]>("/indicators"),
  analyze: (value: string, type: string) => request<ApiAnalysis>("/ioc/analyze", {
    method: "POST", body: JSON.stringify({ value, type }),
  }),
  incidents: () => request<ApiIncident[]>("/incidents"),
  createIncident: (payload: { title: string; severity: string; analysis_id?: number; asset_id?: number; description?: string }) =>
    request<ApiIncident>("/incidents", { method: "POST", body: JSON.stringify(payload) }),
  updateIncident: (id: number, status: string) => request<ApiIncident>(`/incidents/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status }),
  }),
  graph: () => request<ApiGraph>("/correlations/graph"),
  assets: () => request<ApiAsset[]>("/assets"),
  dashboard: () => request<{ total_indicators: number; total_analyses: number; active_incidents: number; critical_incidents: number; data_mode: string }>("/dashboard/summary"),
};

export function mapIndicator(item: ApiIndicator) {
  const typeMap: Record<string, string> = { ipv4: "IPv4", domain: "Domain", url: "URL", sha256: "SHA256", md5: "MD5" };
  return {
    id: `IOC-${String(item.id).padStart(3, "0")}`,
    value: item.value,
    type: typeMap[item.type] ?? item.type,
    source: item.source,
    severity: (item.severity ?? "Unknown") as "Critical" | "High" | "Medium" | "Low" | "Unknown",
    score: item.risk_score ?? null,
    firstSeen: new Date(item.first_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    confidence: item.confidence ?? null,
  };
}
export function mapIncident(item: ApiIncident) {
  return {
    id: item.incident_code,
    numericId: item.id,
    title: item.title,
    asset: item.asset_name ?? "Unassigned asset",
    severity: item.severity as "Critical" | "High" | "Medium" | "Low" | "Unknown",
    status: item.status,
    time: new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    owner: item.owner,
  };
}
