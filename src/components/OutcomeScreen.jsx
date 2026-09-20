import { downloadHtmlReport, downloadJsonReport, downloadTextReport } from "../logic/reportGenerator.js";
import "./OutcomeScreen.css";

function OutcomeScreen({ state, mode, onNew }) {
  const format = (v) => v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;
  const agreement = state.agreement?.offer?.value ?? state.currentOffer?.value;
  return <section className="page outcome-page">
    <div className="outcome-hero"><span className="hero-badge">NEGOTIATION COMPLETE</span><h1>{state.status === "AGREEMENT" ? "Agreement reached." : "Session completed."}</h1><p>{state.scenario?.name} • {mode === "practice" ? "Practice Mode" : "Simulation Mode"}</p></div>
    <div className="outcome-kpis"><div><span>OUTCOME</span><strong className={state.status === "AGREEMENT" ? "good" : "bad"}>{state.status}</strong></div><div><span>FINAL VALUE</span><strong>{format(agreement)}</strong></div><div><span>ROUNDS</span><strong>{state.currentRound}</strong></div><div><span>OFFERS</span><strong>{state.offers?.length || 0}</strong></div><div><span>CONCESSIONS</span><strong>{state.concessions?.length || 0}</strong></div></div>
    <div className="outcome-grid"><div className="outcome-card"><span className="eyebrow">FINAL DECISION</span><h2>{state.terminationReason || "Negotiation ended."}</h2><p>Agreement value: <b>{format(agreement)}</b></p></div><div className="outcome-card"><span className="eyebrow">CONCESSION TIMELINE</span>{(state.concessions || []).slice(-6).map((c, i) => <div className="concession-row" key={c.id || i}><b>{c.agentName}</b><span>{format(c.previousOffer)} → {format(c.currentOffer)}</span><em>{Number(c.change) > 0 ? "+" : ""}{format(c.change)}</em></div>)}{!(state.concessions || []).length && <p>No concessions recorded.</p>}</div></div>
    <div className="download-section"><div><span className="eyebrow">DOWNLOAD REPORT</span><h2>Take the negotiation with you</h2><p>Export a human-readable summary, full transcript, or structured JSON.</p></div><div className="download-buttons"><button onClick={() => downloadHtmlReport(state, mode)}>Download HTML Report</button><button onClick={() => downloadTextReport(state, mode)}>Download TXT</button><button onClick={() => downloadJsonReport(state, mode)}>Export JSON</button></div></div>
    <div className="outcome-actions"><button onClick={onNew}>← Start New Negotiation</button></div>
  </section>;
}
export default OutcomeScreen;
