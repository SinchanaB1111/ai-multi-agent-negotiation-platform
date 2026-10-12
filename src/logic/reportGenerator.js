import { buildNegotiationAnalysis } from "./negotiationAnalysis.js";
import { calculatePerformanceScore } from "./negotiationInsights.js";

function money(value) { return value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

export function buildReportText(state, mode = "Simulation Mode") {
  const finalValue = state.status === "AGREEMENT"
    ? state.agreement?.offer?.value
    : null;
  const lines = [
    "AI-DRIVEN MULTI-AGENT NEGOTIATION PLATFORM",
    "=============================================",
    `Scenario: ${state.scenario?.name || "—"}`,
    `Mode: ${mode}`,
    `Status: ${state.status || "—"}`,
    `Rounds: ${state.currentRound || 0}`,
    `Offers: ${state.offers?.length || 0}`,
    `Concessions: ${state.concessions?.length || 0}`,
    `Final Value: ${finalValue == null ? "No agreement reached" : money(finalValue)}`,
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
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextReport(state, mode) { download(buildReportText(state, mode), "negotiation-report.txt", "text/plain;charset=utf-8"); }
export function downloadJsonReport(state, mode) { download(JSON.stringify({ ...state, reportMode: mode }, null, 2), "negotiation-transcript.json", "application/json"); }
export function downloadHtmlReport(state, mode) {
  const finalValue = state.status === "AGREEMENT"
    ? state.agreement?.offer?.value
    : null;
  const rows = (state.history || []).map((e) => `<tr><td>R${escapeHtml(e.round)}</td><td>${escapeHtml(e.agentName || "System")}</td><td>${escapeHtml(e.type || e.event)}</td><td>${escapeHtml(e.value != null ? money(e.value) : e.decision || "—")}</td><td>${escapeHtml(e.reason || e.message || "")}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Negotiation Report</title><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#172033}h1{margin-bottom:4px}.meta{color:#64748b}.cards{display:flex;gap:12px;flex-wrap:wrap;margin:25px 0}.card{padding:16px;border:1px solid #dbe3ef;border-radius:12px;min-width:150px}.label{font-size:11px;color:#64748b;text-transform:uppercase}.value{display:block;font-size:22px;font-weight:700;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px}th{background:#f8fafc}@media print{button{display:none}}</style></head><body><h1>Negotiation Outcome Report</h1><div class="meta">${escapeHtml(state.scenario?.name)} • ${escapeHtml(mode)}</div><div class="cards"><div class="card"><span class="label">Status</span><span class="value">${escapeHtml(state.status)}</span></div><div class="card"><span class="label">Final Value</span><span class="value">${finalValue == null ? "No agreement reached" : money(finalValue)}</span></div><div class="card"><span class="label">Rounds</span><span class="value">${state.currentRound || 0}</span></div><div class="card"><span class="label">Offers</span><span class="value">${state.offers?.length || 0}</span></div><div class="card"><span class="label">Concessions</span><span class="value">${state.concessions?.length || 0}</span></div></div><h2>Termination</h2><p>${escapeHtml(state.terminationReason || "—")}</p><h2>Negotiation Transcript</h2><table><thead><tr><th>Round</th><th>Agent</th><th>Event</th><th>Value / Decision</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  download(html, "negotiation-outcome-report.html", "text/html;charset=utf-8");
}

function pdfMoney(value) {
  return value == null ? "Not recorded" : `INR ${Number(value).toLocaleString("en-IN")}`;
}

function pdfText(value, fallback = "—") {
  return String(value ?? fallback).replace(/[₹→]/g, (character) => character === "₹" ? "INR " : "to");
}

function reportFilename(state) {
  const scenario = String(state.scenario?.name || "negotiation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${scenario || "negotiation"}-report.pdf`;
}

export function buildPdfReport(state, mode = "Simulation Mode", { jsPDF, autoTable }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const paintedPages = new Set();
  const analysis = buildNegotiationAnalysis(state);
  const performance = calculatePerformanceScore(state);
  const finalValue = state.status === "AGREEMENT"
    ? state.agreement?.offer?.value
    : null;

  const drawPage = (pageNumber, firstPage = false) => {
    doc.setPage(pageNumber);
    doc.setFillColor(7, 15, 34);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setFillColor(15, 34, 62);
    doc.rect(0, 0, pageWidth, firstPage ? 49 : 23, "F");
    doc.setFillColor(38, 180, 211);
    doc.rect(0, 0, pageWidth, 2, "F");
    doc.setTextColor(241, 248, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(firstPage ? 18 : 10);
    doc.text(firstPage ? "Negotiation Report" : "NegoSphere  /  Session Report", margin, firstPage ? 14 : 15);

    if (firstPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(173, 199, 224);
      const scenarioLines = doc.splitTextToSize(pdfText(state.scenario?.name, "Negotiation session"), pageWidth - margin * 2);
      doc.text(scenarioLines.slice(0, 2), margin, 26);
      doc.setFontSize(8);
      doc.setTextColor(105, 210, 229);
      doc.text(`${pdfText(mode)}  |  ${pdfText(state.status, "IN PROGRESS")}`, margin, 42);
    }
  };

  drawPage(1, true);
  paintedPages.add(1);

  const summaryY = 55;
  const summaryGap = 3;
  const summaryWidth = (pageWidth - margin * 2 - summaryGap * 4) / 5;
  const summary = [
    ["OUTCOME", pdfText(state.status, "—")],
    ["FINAL VALUE", pdfMoney(finalValue)],
    ["ROUNDS", String(analysis.rounds)],
    ["OFFERS", String(analysis.offers)],
    ["CONCESSIONS", String(analysis.concessions)],
  ];

  summary.forEach(([label, value], index) => {
    const x = margin + index * (summaryWidth + summaryGap);
    doc.setFillColor(17, 39, 68);
    doc.setDrawColor(44, 75, 111);
    doc.roundedRect(x, summaryY, summaryWidth, 23, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(130, 161, 193);
    doc.text(label, x + 2.2, summaryY + 6);
    doc.setFontSize(7.6);
    doc.setTextColor(237, 246, 255);
    doc.text(doc.splitTextToSize(value, summaryWidth - 4).slice(0, 2), x + 2.2, summaryY + 13);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(94, 203, 224);
  doc.text("FINAL DECISION", margin, 87);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(209, 224, 241);
  const reasonLines = doc.splitTextToSize(pdfText(state.terminationReason, "Negotiation completed."), pageWidth - margin * 2);
  doc.text(reasonLines.slice(0, 3), margin, 93);

  let cursorY = 98 + Math.min(reasonLines.length, 3) * 4;
  const drawSectionTitle = (title) => {
    if (cursorY > pageHeight - 32) {
      doc.addPage();
      const nextPage = doc.internal.getNumberOfPages();
      drawPage(nextPage);
      paintedPages.add(nextPage);
      cursorY = 31;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(91, 203, 226);
    doc.text(title, margin, cursorY);
    cursorY += 4;
  };

  const tableOptions = (body, head, startY) => ({
    startY,
    head: [head],
    body,
    theme: "grid",
    margin: { left: margin, right: margin, top: 27, bottom: 18 },
    styles: {
      fillColor: [13, 29, 51],
      textColor: [216, 231, 248],
      lineColor: [39, 63, 91],
      lineWidth: 0.2,
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 2.4,
      overflow: "linebreak",
    },
    headStyles: { fillColor: [17, 91, 130], textColor: [244, 251, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [17, 39, 67] },
    willDrawPage: ({ pageNumber }) => {
      if (!paintedPages.has(pageNumber)) {
        drawPage(pageNumber);
        paintedPages.add(pageNumber);
      }
    },
  });

  drawSectionTitle("PERFORMANCE");
  autoTable(doc, tableOptions([
    ["Goal achievement", `${performance.goalAchievement}%`],
    ["Constraint handling", `${performance.constraintHandling}%`],
    ["Concession management", `${performance.concessionManagement}%`],
    ["Negotiation efficiency", `${performance.negotiationEfficiency}%`],
    ["Strategy consistency", `${performance.strategyConsistency}%`],
    ["Final outcome score", `${performance.finalOutcome}/100`],
  ], ["Metric", "Score"], cursorY));
  cursorY = doc.lastAutoTable.finalY + 8;

  drawSectionTitle("AGENT ANALYTICS");
  const agentRows = analysis.agentAnalysis.length
    ? analysis.agentAnalysis.map((agent) => [
        pdfText(agent.agentName), pdfText(agent.behavior), String(agent.offerCount),
        String(agent.concessionCount), pdfMoney(agent.finalGap),
      ])
    : [["No agent analytics recorded", "—", "0", "0", "—"]];
  autoTable(doc, tableOptions(agentRows, ["Agent", "Behavior", "Offers", "Concessions", "Target gap"], cursorY));
  cursorY = doc.lastAutoTable.finalY + 8;

  drawSectionTitle("CONCESSION TIMELINE");
  const concessionRows = (state.concessions || []).length
    ? state.concessions.map((concession) => [
        `R${concession.fromRound ?? concession.round ?? "—"} to R${concession.toRound ?? concession.round ?? "—"}`,
        pdfText(concession.agentName || concession.agent, "Agent"),
        `${pdfMoney(concession.previousOffer)} to ${pdfMoney(concession.currentOffer)}`,
        pdfMoney(Math.abs(Number(concession.change || 0))),
      ])
    : [["—", "No concessions recorded", "—", "—"]];
  autoTable(doc, tableOptions(concessionRows, ["Rounds", "Agent", "Movement", "Change"], cursorY));
  cursorY = doc.lastAutoTable.finalY + 8;

  drawSectionTitle("NEGOTIATION TRANSCRIPT");
  const transcriptRows = (state.history || []).length
    ? state.history.map((event) => [
        `R${event.round || "—"}`,
        pdfText(event.agentName, "System"),
        pdfText(event.type || event.event, "EVENT"),
        pdfMoney(event.value),
        pdfText(event.reason || event.message || event.decision, "—"),
      ])
    : [["—", "System", "No events", "—", "No transcript events recorded."]];
  autoTable(doc, tableOptions(transcriptRows, ["Round", "Agent", "Event", "Value", "Details"], cursorY));

  const pageCount = doc.internal.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(36, 76, 111);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(123, 151, 181);
    doc.text("NegoSphere  /  Session Report", margin, pageHeight - 8);
    doc.text(`${pageNumber} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  doc.setProperties({ title: `${state.scenario?.name || "Negotiation"} Report`, subject: "Negotiation session report" });
  return doc;
}

export async function downloadPdfReport(state, mode) {
  if (!state || typeof window === "undefined") return;

  // PDF export intentionally uses the browser print dialog. The Reports &
  // Analytics print stylesheet hides application chrome and formats the
  // selected report as A4, so the user can choose "Save as PDF" themselves.
  document.title = `${state.scenario?.name || "Negotiation"} - Report`;
  window.print();
}

