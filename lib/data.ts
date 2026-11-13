export type Severity = "Critical" | "High" | "Medium" | "Low" | "Unknown";
export type Indicator = { id: string; value: string; type: string; source: string; severity: Severity; score: number; firstSeen: string; confidence: number };
export type Incident = { id: string; title: string; asset: string; severity: Severity; status: "New" | "Investigating" | "Contained" | "Resolved"; time: string; owner: string };
export const indicators: Indicator[] = [
  { id: "IOC-001", value: "185.220.101.1", type: "IPv4", source: "Demo threat feed", severity: "Critical", score: 94, firstSeen: "09:42:16", confidence: 91 },
  { id: "IOC-002", value: "malware-test.example", type: "Domain", source: "Local dataset", severity: "High", score: 82, firstSeen: "09:18:03", confidence: 87 },
  { id: "IOC-003", value: "198.51.100.24", type: "IPv4", source: "Lab telemetry", severity: "Medium", score: 58, firstSeen: "08:56:41", confidence: 63 },
  { id: "IOC-004", value: "e3b0c44298fc1c149afbf4c8996fb924", type: "SHA256", source: "Local dataset", severity: "Low", score: 18, firstSeen: "08:12:09", confidence: 42 },
];
export const initialIncidents: Incident[] = [
  { id: "INC-2026-008", title: "Suspicious outbound connection", asset: "Database Server", severity: "Critical", status: "Investigating", time: "09:42", owner: "Security Analyst" },
  { id: "INC-2026-007", title: "Repeated authentication failures", asset: "Web Gateway", severity: "High", status: "New", time: "09:18", owner: "Unassigned" },
  { id: "INC-2026-006", title: "Unusual DNS resolution", asset: "Internal Workstation", severity: "Medium", status: "Contained", time: "08:56", owner: "SOC Team" },
];
export const activity = [
  { day: "Mon", events: 32 }, { day: "Tue", events: 48 }, { day: "Wed", events: 37 },
  { day: "Thu", events: 69 }, { day: "Fri", events: 54 }, { day: "Sat", events: 82 }, { day: "Sun", events: 61 },
];
