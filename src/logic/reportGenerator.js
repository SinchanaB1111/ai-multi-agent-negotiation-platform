function money(value) { return value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

export function buildReportText(state, mode = "Simulation Mode") {
  const lines = [
    "AI-DRIVEN MULTI-AGENT NEGOTIATION PLATFORM",
    "=============================================",
    `Scenario: ${state.scenario?.name || "—"}`,
    `Mode: ${mode}`,
    `Status: ${state.status || "—"}`,
    `Rounds: ${state.currentRound || 0}`,
    `Offers: ${state.offers?.length || 0}`,
    `Concessions: ${state.concessions?.length || 0}`,
    `Final Value: ${money(state.agreement?.offer?.value ?? state.currentOffer?.value)}`,
    `Reason: ${state.terminationReason || "—"}`,
    "",
    "AGENTS",
    "------",
    ...(state.agents || []).map((a) => `${a.name} | ${a.role} | ${a.personality} | Goal: ${a.goal} | Constraint: ${a.constraints}`),
    "",
    "TRANSCRIPT",
    "----------",
    ...(state.history || []).map((e) => `[R${e.round || "-"}] ${e.agentName || "System"} | ${e.type || e.event || "EVENT"} | ${e.value != null ? money(e.value) : e.decision || ""} | ${e.reason || e.message || ""}`),
  ];
  return lines.join("\n");
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextReport(state, mode) { download(buildReportText(state, mode), "negotiation-report.txt", "text/plain;charset=utf-8"); }
export function downloadJsonReport(state, mode) { download(JSON.stringify({ ...state, reportMode: mode }, null, 2), "negotiation-transcript.json", "application/json"); }
export function downloadHtmlReport(state, mode) {
  const rows = (state.history || []).map((e) => `<tr><td>R${escapeHtml(e.round)}</td><td>${escapeHtml(e.agentName || "System")}</td><td>${escapeHtml(e.type || e.event)}</td><td>${escapeHtml(e.value != null ? money(e.value) : e.decision || "—")}</td><td>${escapeHtml(e.reason || e.message || "")}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Negotiation Report</title><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#172033}h1{margin-bottom:4px}.meta{color:#64748b}.cards{display:flex;gap:12px;flex-wrap:wrap;margin:25px 0}.card{padding:16px;border:1px solid #dbe3ef;border-radius:12px;min-width:150px}.label{font-size:11px;color:#64748b;text-transform:uppercase}.value{display:block;font-size:22px;font-weight:700;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px}th{background:#f8fafc}@media print{button{display:none}}</style></head><body><h1>Negotiation Outcome Report</h1><div class="meta">${escapeHtml(state.scenario?.name)} • ${escapeHtml(mode)}</div><div class="cards"><div class="card"><span class="label">Status</span><span class="value">${escapeHtml(state.status)}</span></div><div class="card"><span class="label">Final Value</span><span class="value">${money(state.agreement?.offer?.value ?? state.currentOffer?.value)}</span></div><div class="card"><span class="label">Rounds</span><span class="value">${state.currentRound || 0}</span></div><div class="card"><span class="label">Offers</span><span class="value">${state.offers?.length || 0}</span></div><div class="card"><span class="label">Concessions</span><span class="value">${state.concessions?.length || 0}</span></div></div><h2>Termination</h2><p>${escapeHtml(state.terminationReason || "—")}</p><h2>Negotiation Transcript</h2><table><thead><tr><th>Round</th><th>Agent</th><th>Event</th><th>Value / Decision</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  download(html, "negotiation-outcome-report.html", "text/html;charset=utf-8");
}
