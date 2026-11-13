"use client";
import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BrainCircuit, Check,
  ChevronDown, CircleHelp, Clock3, Database, FileText, Filter, Gauge, Globe2,
  LayoutDashboard, Menu, Network, Plus, Radar, ScanSearch, Search, Settings,
  Shield, ShieldAlert, ShieldCheck, Siren, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activity, type Incident, type Severity } from "@/lib/data";
import { api, mapIndicator, mapIncident, type ApiAnalysis, type ApiGraph, type ApiGraphNode, type ApiAsset } from "@/lib/api";

type Page = "Overview" | "Threat Intelligence" | "IOC Analyzer" | "AI Analysis" | "Threat Graph" | "Incidents" | "Reports";
const nav: { label: Page; icon: typeof LayoutDashboard; group: string }[] = [
  { label: "Overview", icon: LayoutDashboard, group: "OPERATIONS" },
  { label: "Threat Intelligence", icon: Radar, group: "INTELLIGENCE" },
  { label: "IOC Analyzer", icon: ScanSearch, group: "INTELLIGENCE" },
  { label: "AI Analysis", icon: BrainCircuit, group: "INTELLIGENCE" },
  { label: "Threat Graph", icon: Network, group: "INTELLIGENCE" },
  { label: "Incidents", icon: ShieldAlert, group: "OPERATIONS" },
  { label: "Reports", icon: FileText, group: "OPERATIONS" },
];
const severityClass: Record<Severity, string> = {
  Critical: "badge badge-critical", High: "badge badge-high", Medium: "badge badge-medium", Low: "badge badge-low", Unknown: "badge badge-low",
};
function Badge({ value }: { value: Severity }) { return <span className={severityClass[value]}>{value}</span>; }
function StatCard({ title, value, note, icon: Icon, trend }: { title: string; value: string; note: string; icon: typeof Activity; trend?: "up" | "down" }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className="stat-icon"><Icon size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-note">{trend === "up" ? <ArrowUpRight size={13}/> : trend === "down" ? <ArrowDownRight size={13}/> : null}{note}</div></div>;
}
function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export default function Home() {
  const [page, setPage] = useState<Page>("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ioc, setIoc] = useState("192.0.2.10");
  const [iocType, setIocType] = useState("IP Address");
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [indicatorRows, setIndicatorRows] = useState<ReturnType<typeof mapIndicator>[]>([]);
  const [graph, setGraph] = useState<ApiGraph | null>(null);
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | "">("");
  const [dashboard, setDashboard] = useState<{total_indicators:number;total_analyses:number;active_incidents:number;critical_incidents:number;data_mode:string} | null>(null);
  const [filter, setFilter] = useState("All");
  const [incidents, setIncidents] = useState<(Incident & { numericId: number })[]>([]);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [search, setSearch] = useState("");
  const result = analysis;
  const filteredIndicators = indicatorRows.filter(x => (filter === "All" || x.severity === filter) && `${x.value} ${x.type} ${x.source}`.toLowerCase().includes(search.toLowerCase()));
  const currentIncident = incidents.find(x => x.id === selectedIncident) ?? incidents[0];
  async function refreshData() {
    try {
      const [indicatorData, incidentData, summary, graphData, assetData] = await Promise.all([api.indicators(), api.incidents(), api.dashboard(), api.graph(), api.assets()]);
      setIndicatorRows(indicatorData.map(mapIndicator));
      const mapped = incidentData.map(mapIncident);
      setIncidents(mapped);
      setDashboard(summary);
      setGraph(graphData);
      setAssets(assetData);
      if (assetData[0] && selectedAssetId === "") setSelectedAssetId(assetData[0].id);
      if (mapped[0] && !mapped.some(x => x.id === selectedIncident)) setSelectedIncident(mapped[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memuat data API."); }
  }
  useEffect(() => { void refreshData(); }, []);
  function apiType(type: string) {
    return ({ "IP Address": "ipv4", "Domain": "domain", "URL": "url", "File Hash": "sha256", "IPv4": "ipv4", "SHA256": "sha256", "MD5": "md5" } as Record<string,string>)[type] ?? "ipv4";
  }
  async function runAnalysis() {
    setAnalysisLoading(true); setError(""); setAnalysis(null);
    try { const data = await api.analyze(ioc, apiType(iocType)); setAnalysis(data); setAnalyzed(true); await refreshData(); }
    catch (e) { setError(e instanceof Error ? e.message : "Analisis gagal."); setAnalyzed(false); }
    finally { setAnalysisLoading(false); }
  }
  async function updateStatus(status: Incident["status"]) {
    if (!currentIncident) return;
    const row = incidents.find(x => x.id === currentIncident.id); if (!row) return;
    setBusy(true); setError("");
    try { const updated = await api.updateIncident(row.numericId, status); setIncidents(prev => prev.map(x => x.id === row.id ? mapIncident(updated) : x)); await refreshData(); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal memperbarui incident."); }
    finally { setBusy(false); }
  }
  function go(target: Page) { setPage(target); setMobileOpen(false); }
  async function createIncident() {
    if (!analysis) return;
    setBusy(true); setError("");
    try {
      const created = await api.createIncident({ title: `IOC investigation: ${analysis.indicator}`, severity: analysis.severity === "Unknown" ? "Medium" : analysis.severity, analysis_id: analysis.id, asset_id: selectedAssetId === "" ? undefined : selectedAssetId, description: analysis.summary });
      const mapped = mapIncident(created); await refreshData(); setSelectedIncident(mapped.id); go("Incidents");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal membuat incident."); }
    finally { setBusy(false); }
  }
  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={23}/></div><div><div className="brand-name">SENTINEL</div><div className="brand-sub">THREAT INTELLIGENCE</div></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace"><div className="workspace-avatar">S</div><div><strong>Security Operations</strong><span>Demo workspace</span></div><ChevronDown size={15}/></div>
      <nav className="nav-list">{["OPERATIONS", "INTELLIGENCE"].map(group => <div className="nav-group" key={group}><div className="nav-label">{group}</div>{nav.filter(x => x.group === group).map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => go(item.label)} className={`nav-item ${page === item.label ? "active" : ""}`}><Icon size={17}/><span>{item.label}</span>{item.label === "Incidents" && <i className="nav-count">{incidents.filter(x => x.status !== "Resolved").length}</i>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-card-top"><span className="live-dot"/>All systems operational</div><p>Threat feeds · Demo mode</p><div className="system-meter"><span/></div></div><button className="nav-item"><Settings size={17}/>Settings</button><button className="nav-item"><CircleHelp size={17}/>Help & documentation</button><div className="user-profile"><div className="user-avatar">SA</div><div><strong>Security Analyst</strong><span>Analyst account</span></div><ChevronDown size={15}/></div></div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <div className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div></div><div className="topbar-right"><div className="environment"><span className="live-dot"/>DEMO ENVIRONMENT</div><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">SA</div></div></header>
      <div className="content-wrap">
        {error && <div className="recommendation" role="alert"><strong>Backend/API notice</strong><p>{error}</p><button className="row-action" onClick={() => { setError(""); void refreshData(); }}>Retry connection</button></div>}
        <div className="page-title-row"><div><div className="eyebrow">SECURITY OPERATIONS CENTER <span>•</span> NOVEMBER 2026</div><h1>{page}</h1><p>{page === "Overview" ? "Real-time visibility into your security posture and threat landscape." : page === "IOC Analyzer" ? "Investigate indicators of compromise and assess their risk." : page === "Threat Intelligence" ? "Monitor, search, and prioritize known threat indicators." : page === "AI Analysis" ? "Understand threat evidence with explainable security assessments." : page === "Threat Graph" ? "Explore relationships between indicators, events, and assets." : page === "Incidents" ? "Track investigations and coordinate incident response." : "Understand trends, severity distribution, and security activity."}</p></div><div className="title-actions"><span className="last-updated"><Activity size={14}/> Updated just now</span><button className="button button-secondary" onClick={() => go("IOC Analyzer")}><Plus size={16}/> New analysis</button></div></div>
        {page === "Overview" && <>
          <div className="stats-grid"><StatCard title="Threats detected" value={String(dashboard?.total_indicators ?? 0)} note="Stored indicators" icon={Radar} trend="up"/><StatCard title="Critical incidents" value={String(dashboard?.critical_incidents ?? 0)} note="Requires attention" icon={AlertTriangle}/><StatCard title="Active incidents" value={String(dashboard?.active_incidents ?? incidents.filter(x => x.status !== "Resolved").length).padStart(2, "0")} note="Under investigation" icon={ShieldAlert}/><StatCard title="Sources monitored" value="1" note="Local demo dataset" icon={Database} trend="up"/></div>
          <div className="dashboard-grid"><Panel title="Threat activity" subtitle="Incoming security events over the last 7 days" action={<button className="select-button">Last 7 days <ChevronDown size={14}/></button>}><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#1d2b40" vertical={false}/><XAxis dataKey="day" tick={{ fill: "#8293aa", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: "#8293aa", fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: "#101d30", border: "1px solid #263a56", borderRadius: 9, color: "#e5edf7" }}/><Bar dataKey="events" fill="#3988f5" radius={[5,5,0,0]} maxBarSize={35}/></BarChart></ResponsiveContainer></div></Panel>
            <Panel title="Threat severity" subtitle="Illustrative severity breakdown (demo chart)"><div className="severity-chart"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name:"Critical",value:24,color:"#ef626b"},{name:"High",value:42,color:"#f4a64d"},{name:"Medium",value:78,color:"#4e9df7"},{name:"Low",value:31,color:"#36bd91"}]} dataKey="value" innerRadius={54} outerRadius={73} stroke="none">{["#ef626b", "#f4a64d", "#4e9df7", "#36bd91"].map((c,i)=><Cell key={i} fill={c}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>{dashboard?.total_indicators ?? 0}</strong><span>Indicators</span></div></div><div className="legend-list">{[{n:"Critical",v:24,c:"#ef626b"},{n:"High",v:42,c:"#f4a64d"},{n:"Medium",v:78,c:"#4e9df7"},{n:"Low",v:31,c:"#36bd91"}].map(x=><div className="legend-item" key={x.n}><i style={{background:x.c}}/><span>{x.n}</span><strong>{x.v}</strong></div>)}</div></div></Panel></div>
          <Panel title="Recent threat indicators" subtitle="Latest indicators observed by SENTINEL" action={<button className="text-action" onClick={() => go("Threat Intelligence")}>View all indicators <ArrowUpRight size={14}/></button>}><IndicatorTable rows={indicatorRows.slice(0,4)} onInvestigate={(value,type)=>{setIoc(value);setIocType(type === "IPv4" ? "IP Address" : type === "Domain" ? "Domain" : type === "URL" ? "URL" : type === "MD5" ? "MD5" : "File Hash");setAnalyzed(false);go("IOC Analyzer")}}/></Panel>
          <Panel title="Active incidents" subtitle="Cases requiring analyst attention" action={<button className="text-action" onClick={() => go("Incidents")}>Open incident queue <ArrowUpRight size={14}/></button>}><IncidentTable rows={incidents.slice(0,3)} onSelect={id=>{setSelectedIncident(id);go("Incidents")}}/></Panel>
        </>}
        {page === "Threat Intelligence" && <Panel title="Indicator database" subtitle="Search and filter indicators stored by the FastAPI backend" action={<span className="feed-status"><span className="live-dot"/>Demo feed synced</span>}><div className="table-tools"><div className="search-box"><Search size={16}/><input placeholder="Search indicators, type, source..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filter-wrap"><Filter size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Unknown</option></select></div></div><IndicatorTable rows={filteredIndicators} onInvestigate={(value,type)=>{setIoc(value);setIocType(type === "IPv4" ? "IP Address" : type === "Domain" ? "Domain" : type === "URL" ? "URL" : type === "MD5" ? "MD5" : "File Hash");setAnalyzed(false);go("IOC Analyzer")}}/></Panel>}
        {page === "IOC Analyzer" && <div className="two-column"><Panel title="Indicator investigation" subtitle="Submit an IOC for a local demonstration analysis"><div className="form-stack"><label>Indicator type</label><div className="segmented">{["IP Address","Domain","URL","File Hash","MD5"].map(t=><button key={t} className={iocType===t?"selected":""} onClick={()=>{setIocType(t);setAnalyzed(false);setAnalysis(null)}}>{t === "IP Address" ? "IP" : t === "File Hash" ? "Hash" : t}</button>)}</div><label htmlFor="ioc-value">Indicator value</label><input id="ioc-value" className="text-input" value={ioc} onChange={e=>{setIoc(e.target.value);setAnalyzed(false);setAnalysis(null)}} placeholder={iocType === "IP Address" ? "e.g. 192.0.2.10" : "Enter indicator value"}/><div className="helper-text">IOC akan divalidasi dan dianalisis oleh backend. Data yang tidak dikenal akan ditandai Unknown.</div><button className="button button-primary full-button" disabled={!ioc.trim() || analysisLoading} onClick={runAnalysis}><ScanSearch size={16}/> {analysisLoading ? "Analyzing..." : "Analyze indicator"}</button></div></Panel><Panel title="Analysis result" subtitle="Evidence-based risk assessment">{!analyzed || !result ? <div className="empty-state"><div className="empty-icon"><ScanSearch size={25}/></div><strong>No analysis performed</strong><p>Submit an indicator to view its risk score, evidence, and recommended actions.</p></div> : <div className="result-stack"><div className="result-label">ANALYZED INDICATOR</div><div className="result-indicator">{ioc}</div><div className="score-row"><div><div className="result-label">RISK SCORE</div><div className="risk-score">{result.risk_score ?? "—"}<small>{result.risk_score === null ? "No score" : "/100"}</small></div></div><Badge value={result.severity as Severity}/></div><div className="score-track"><span style={{width:`${result.risk_score ?? 0}%`,background:result.severity === "Critical" ? "#ef626b" : result.severity === "High" ? "#f4a64d" : result.severity === "Medium" ? "#4e9df7" : "#36bd91"}}/></div><div className="evidence-box"><strong>Assessment evidence</strong><ul><li>{result.summary}</li><li>Confidence: {result.confidence === null ? "Not available" : `${result.confidence}%`}. Data mode: {result.data_mode}.</li><li>Evidence: {result.evidence.length ? result.evidence.map(x => `${x.source}: ${x.description}`).join("; ") : "No supporting evidence returned."}</li></ul></div><div className="recommendation"><strong><ShieldCheck size={15}/> Recommended next steps</strong><p>{result.recommendation.join(" ")}</p></div><label htmlFor="affected-asset">Link protected asset (optional)</label><select id="affected-asset" className="text-input" value={selectedAssetId} onChange={e=>setSelectedAssetId(e.target.value ? Number(e.target.value) : "")}><option value="">No asset selected</option>{assets.map(asset=><option key={asset.id} value={asset.id}>{asset.name} · {asset.criticality}</option>)}</select><button className="button button-primary full-button" onClick={createIncident}><Plus size={16}/> Create incident from finding</button><div className="disclaimer">Local demo dataset only. Unknown means insufficient evidence, not safe.</div></div>}</Panel></div>}
        {page === "AI Analysis" && <div className="two-column"><Panel title="Explainable threat assessment" subtitle="Reasoning generated from the latest IOC analysis"><div className="ai-card"><div className="ai-heading"><div className="ai-icon"><BrainCircuit size={20}/></div><div><strong>SENTINEL Analysis Assistant</strong><span>Deterministic explainable engine · MVP</span></div><span className="ai-online">READY</span></div>{analysis ? <><div className="ai-message"><div className="message-label">ANALYZED INDICATOR</div><h3>{analysis.indicator}</h3><p>{analysis.summary}</p></div><div className="score-row"><div><div className="result-label">RISK SCORE</div><div className="risk-score">{analysis.risk_score ?? "—"}<small>{analysis.risk_score === null ? "No score" : "/100"}</small></div></div><Badge value={analysis.severity as Severity}/></div><div className="message-label">REASONING</div><ul className="evidence-list">{analysis.reasoning.map((item,i)=><li key={i}><Check size={15}/>{item}</li>)}</ul><div className="message-label">LIMITATIONS</div><ul className="evidence-list">{analysis.limitations.map((item,i)=><li key={i}><CircleHelp size={15}/>{item}</li>)}</ul><div className="recommendation"><strong>Recommended next steps</strong><p>{analysis.recommendation.join(" ")}</p></div><div className="disclaimer">Confidence: {analysis.confidence_label}{analysis.confidence === null ? "" : ` (${analysis.confidence}%)`} · Data mode: {analysis.data_mode}. This is a rule-based MVP explanation, not a generative AI verdict.</div></> : <div className="empty-state"><div className="empty-icon"><BrainCircuit size={25}/></div><strong>No analysis available yet</strong><p>Run an IOC analysis first. The assistant will explain the returned evidence, confidence, and data limitations here.</p><button className="button button-primary" onClick={() => go("IOC Analyzer")}>Open IOC Analyzer <ArrowUpRight size={15}/></button></div>}</div></Panel><Panel title="Assessment principles" subtitle="How SENTINEL explains risk"><div className="principle-list">{[{n:"Evidence first",d:"Every assessment should cite the data or signal that supports it."},{n:"Confidence-aware",d:"Uncertain or incomplete data should lower confidence, not create certainty."},{n:"Human in the loop",d:"Analysts validate findings before containment or response actions."},{n:"Context matters",d:"Asset criticality and business impact help prioritize investigation."}].map((x,i)=><div className="principle" key={x.n}><span>0{i+1}</span><div><strong>{x.n}</strong><p>{x.d}</p></div></div>)}</div></Panel></div>}
        {page === "Threat Graph" && <div className="two-column"><Panel title="Evidence-backed relationship graph" subtitle={`${graph?.meta.node_count ?? 0} nodes · ${graph?.meta.edge_count ?? 0} relationships`}><ThreatGraph graph={graph}/></Panel><Panel title="Relationship details" subtitle="Only persisted database relationships are shown"><div className="relationship-list">{graph?.edges.length ? graph.edges.map(edge=><div className="relationship" key={edge.id}><div><strong>{graph.nodes.find(n=>n.id===edge.source)?.label ?? edge.source}</strong><span>{edge.relationship} · {edge.evidence}</span><strong>{graph.nodes.find(n=>n.id===edge.target)?.label ?? edge.target}</strong></div><span className="relationship-tag">{edge.confidence}</span></div>) : <div className="empty-state">No correlated relationships yet. Analyze an IOC, then create an incident linked to an asset to build the graph.</div>}</div><div className="disclaimer">{graph?.meta.method ?? "Graph is built from explicit database relationships."}</div></Panel></div>}
        {page === "Incidents" && <div className="incident-layout"><Panel title="Incident queue" subtitle={`${incidents.length} total cases`}><IncidentTable rows={incidents} onSelect={setSelectedIncident} selected={selectedIncident}/></Panel><Panel title="Incident details" subtitle={currentIncident?.id ?? "Select an incident"}>{currentIncident ? <div className="incident-detail"><div className="incident-detail-title"><div><span className="result-label">CASE ID</span><h2>{currentIncident.id}</h2></div><Badge value={currentIncident.severity}/></div><h3>{currentIncident.title}</h3><div className="detail-grid"><div><span>Asset</span><strong>{currentIncident.asset}</strong></div><div><span>Detected</span><strong>{currentIncident.time}</strong></div><div><span>Owner</span><strong>{currentIncident.owner}</strong></div></div><label htmlFor="incident-status">Incident status</label><select id="incident-status" className="text-input" value={currentIncident.status} onChange={e=>void updateStatus(e.target.value as Incident["status"])} disabled={busy}><option>New</option><option>Investigating</option><option>Contained</option><option>Resolved</option></select><div className="recommendation"><strong><ShieldCheck size={15}/> Response guidance</strong><p>Preserve relevant logs, validate the affected asset, document evidence, and follow the organization's approved incident response procedure.</p></div><div className="disclaimer">Status tersimpan melalui API dan dicatat sebagai incident event.</div></div> : <div className="empty-state">Choose an incident from the queue.</div>}</Panel></div>}
        {page === "Reports" && <div className="dashboard-grid"><Panel title="Indicator severity distribution" subtitle="Sample dataset overview"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name:"Critical",value:24},{name:"High",value:42},{name:"Medium",value:78},{name:"Low",value:31}]} dataKey="value" nameKey="name" outerRadius={105} label>{["#ef626b","#f4a64d","#4e9df7","#36bd91"].map((c,i)=><Cell key={i} fill={c}/>)}</Pie><Tooltip contentStyle={{background:"#101d30",border:"1px solid #263a56",borderRadius:9}}/></PieChart></ResponsiveContainer></div></Panel><Panel title="Report templates" subtitle="Planned export capabilities"><div className="report-list">{[{title:"Daily threat summary",desc:"Daily IOC and alert overview",icon:FileText},{title:"Critical incident report",desc:"Investigation evidence and response notes",icon:ShieldAlert},{title:"Threat trend analysis",desc:"Historical trends and risk distribution",icon:Activity}].map(x=><div className="report-item" key={x.title}><div className="report-icon"><x.icon size={18}/></div><div><strong>{x.title}</strong><span>{x.desc}</span></div><span className="coming-soon">PLANNED</span></div>)}</div><div className="disclaimer">PDF export is not implemented in this frontend starter.</div></Panel></div>}
        <footer className="footer"><span>© 2026 SENTINEL Security Intelligence</span><span><span className="live-dot"/> MVP 1.1.0 <span className="footer-separator">·</span> Backend connected · Demo intelligence</span></footer>
      </div>
    </div>
  </main>;
}
function IndicatorTable({ rows, onInvestigate }: { rows: ReturnType<typeof mapIndicator>[]; onInvestigate: (value: string, type: string) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>INDICATOR</th><th>TYPE</th><th>SOURCE</th><th>RISK</th><th>SCORE</th><th/></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><div className="table-primary">{x.value}</div><div className="table-secondary">{x.id} · {x.firstSeen}</div></td><td>{x.type}</td><td>{x.source}</td><td><Badge value={x.severity}/></td><td><strong className="score-cell">{x.score ?? "—"}</strong></td><td><button className="row-action" onClick={()=>onInvestigate(x.value,x.type)}>Analyze <ArrowUpRight size={13}/></button></td></tr>)}{rows.length===0&&<tr><td colSpan={6} className="no-results">No indicators match your search.</td></tr>}</tbody></table></div>;
}
function IncidentTable({ rows, onSelect, selected }: { rows: Incident[]; onSelect: (id:string)=>void; selected?:string }) {
  return <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>ASSET</th><th>SEVERITY</th><th>STATUS</th><th>TIME</th></tr></thead><tbody>{rows.map(x=><tr key={x.id} className={selected===x.id?"selected-row":"clickable-row"} onClick={()=>onSelect(x.id)}><td><div className="table-primary">{x.id}</div><div className="table-secondary">{x.title}</div></td><td>{x.asset}</td><td><Badge value={x.severity}/></td><td><span className={`status status-${x.status.toLowerCase()}`}>{x.status}</span></td><td>{x.time}</td></tr>)}</tbody></table></div>;
}
function ThreatGraph({ graph }: { graph: ApiGraph | null }) {
  if (!graph || graph.nodes.length === 0) return <div className="empty-state">No graph data available. Start by analyzing an IOC.</div>;
  const columns: ApiGraphNode["type"][] = ["indicator", "analysis", "incident", "asset"];
  const colors: Record<string,string> = { indicator: "#f4a64d", analysis: "#438ff0", incident: "#ef626b", asset: "#36bd91" };
  const positions: Record<string,{x:number;y:number}> = {};
  columns.forEach((type, col) => {
    const items = graph.nodes.filter(node => node.type === type);
    items.forEach((node, index) => { positions[node.id] = { x: 75 + col * 130, y: 65 + index * Math.max(85, 250 / Math.max(items.length, 1)) }; });
  });
  const height = Math.max(260, ...Object.values(positions).map(p=>p.y+65));
  return <div className="graph-area"><svg viewBox={`0 0 560 ${height}`} role="img" aria-label="Evidence-backed threat correlation graph"><g stroke="#345b86" strokeWidth="2" fill="none">{graph.edges.map(edge=>{const a=positions[edge.source],b=positions[edge.target];return a&&b?<line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>:null;})}</g>{graph.nodes.map(node=>{const p=positions[node.id];if(!p)return null;const c=colors[node.type]??"#438ff0";return <g key={node.id}><circle cx={p.x} cy={p.y} r="24" fill="#10243b" stroke={c} strokeWidth="2"/><circle cx={p.x} cy={p.y} r="4" fill={c}/><text x={p.x} y={p.y+39} fill="#9bb0c9" fontSize="9" textAnchor="middle">{node.type.toUpperCase()}</text><text x={p.x} y={p.y+53} fill="#e0eaf6" fontSize="9" textAnchor="middle">{node.label.length>19?node.label.slice(0,18)+"…":node.label}</text></g>;})}</svg><div className="graph-legend">{columns.map(type=><span key={type}><i style={{background:colors[type]}}/>{type}</span>)}</div></div>;
}
