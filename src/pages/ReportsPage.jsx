import { downloadHtmlReport, downloadJsonReport, downloadPdfReport, downloadTextReport } from "../logic/reportGenerator.js";
import { buildNegotiationAnalysis } from "../logic/negotiationAnalysis.js";
import { calculatePerformanceScore } from "../logic/negotiationInsights.js";
import "./ReportsPage.css";

function formatMoney(value) {
  return value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function ReportsPage({ sessions, selected }) {
  const state = selected || sessions[0];
  const analysis = state ? buildNegotiationAnalysis(state) : null;
  const performance = state ? calculatePerformanceScore(state) : null;
  const finalValue = state?.agreement?.offer?.value ?? state?.currentOffer?.value;
  const performanceMetrics = performance
    ? [
        ["Goal achievement", performance.goalAchievement],
        ["Constraint handling", performance.constraintHandling],
        ["Concession management", performance.concessionManagement],
        ["Negotiation efficiency", performance.negotiationEfficiency],
        ["Strategy consistency", performance.strategyConsistency],
      ]
    : [];

  return (
    <section className="command-page reports-page">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">WORKSPACE / REPORTS</span>
          <h1>Reports &amp; Insights</h1>
          <p>Review negotiation outcomes, performance, concessions and session analytics.</p>
        </div>
      </div>

      {!state ? (
        <div className="empty-workspace panel-block">
          <div className="empty-orb">▤</div>
          <h2>No report available yet</h2>
          <p>Complete a negotiation to generate a report.</p>
        </div>
      ) : (
        <div className="report-dashboard">
          <section className="report-overview panel-block">
            <div className="report-overview-copy">
              <span className="eyebrow">NEGOTIATION SUMMARY</span>
              <div className="report-title-row">
                <h2>{state.scenario?.name || "Negotiation report"}</h2>
                <span className={`report-status ${state.status === "AGREEMENT" ? "is-agreement" : ""}`}>
                  {state.status || "IN PROGRESS"}
                </span>
              </div>
              <p>{state.terminationReason || "Negotiation session summary and recorded outcome."}</p>
              <div className="report-meta">
                <span>{state.mode === "practice" ? "Practice" : "Simulation"} session</span>
                {state.createdAt && <span>{new Date(state.createdAt).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="report-downloads">
              <button className="report-download-primary" onClick={() => downloadPdfReport(state, state.mode)}>
                <span aria-hidden="true">↓</span> Download PDF Report
              </button>
              <div className="report-export-secondary">
                <button onClick={() => downloadHtmlReport(state, state.mode)}>Download HTML</button>
                <button onClick={() => downloadTextReport(state, state.mode)}>Download TXT</button>
                <button onClick={() => downloadJsonReport(state, state.mode)}>Export JSON</button>
              </div>
            </div>
          </section>

          <section className="report-kpis report-summary-kpis" aria-label="Negotiation summary metrics">
            <article><span>Outcome</span><b className={state.status === "AGREEMENT" ? "report-positive" : ""}>{state.status || "—"}</b></article>
            <article><span>Final value</span><b>{formatMoney(finalValue)}</b></article>
            <article><span>Rounds</span><b>{analysis.rounds}</b></article>
            <article><span>Offers</span><b>{analysis.offers}</b></article>
            <article><span>Concessions</span><b>{analysis.concessions}</b></article>
          </section>

          <div className="report-content-grid">
            <section className="panel-block report-section report-performance">
              <div className="panel-heading">
                <div><span className="eyebrow">PERFORMANCE</span><h2>Negotiation scorecard</h2></div>
                <strong className="report-outcome-score">{performance.finalOutcome}<small>/100</small></strong>
              </div>
              <div className="report-performance-list">
                {performanceMetrics.map(([label, value]) => (
                  <div className="report-performance-row" key={label}>
                    <div><span>{label}</span><b>{value}%</b></div>
                    <div className="report-meter" role="meter" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
                      <span style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-block report-section report-analytics">
              <div className="panel-heading">
                <div><span className="eyebrow">SESSION ANALYTICS</span><h2>Agent performance</h2></div>
              </div>
              {analysis.agentAnalysis.length ? analysis.agentAnalysis.map((agent) => (
                <article className="report-agent-row" key={agent.agentId}>
                  <div className="report-agent-heading"><b>{agent.agentName}</b><span>{agent.behavior}</span></div>
                  <div className="report-agent-stats">
                    <span>{agent.offerCount} offers</span>
                    <span>{agent.concessionCount} concessions</span>
                    <span>Target gap {formatMoney(agent.finalGap)}</span>
                  </div>
                </article>
              )) : <p className="report-empty-note">No agent performance data is available.</p>}
              <div className="report-gap-note"><span>Target gap analysis</span><p>{analysis.targetGapText}</p></div>
            </section>

            <section className="panel-block report-section report-concessions">
              <div className="panel-heading">
                <div><span className="eyebrow">CONCESSIONS</span><h2>Movement by round</h2></div>
                <span className="report-section-count">{analysis.concessions} recorded</span>
              </div>
              {state.concessions?.length ? (
                <div className="report-concession-list">
                  {state.concessions.map((concession, index) => (
                    <article className="report-concession-row" key={concession.id || index}>
                      <span className="report-round-tag">R{concession.fromRound ?? concession.round ?? "—"}<i>→</i>R{concession.toRound ?? concession.round ?? "—"}</span>
                      <div><b>{concession.agentName || concession.agent || "Agent"}</b><small>{formatMoney(concession.previousOffer)} <i>→</i> {formatMoney(concession.currentOffer)}</small></div>
                      <strong>{Number(concession.change) > 0 ? "+" : Number(concession.change) < 0 ? "-" : ""}{formatMoney(Math.abs(Number(concession.change || 0)))}</strong>
                    </article>
                  ))}
                </div>
              ) : <p className="report-empty-note">No concessions were recorded in this session.</p>}
            </section>

            <section className="panel-block report-section report-transcript-section">
              <div className="panel-heading">
                <div><span className="eyebrow">SESSION RECORD</span><h2>Negotiation transcript</h2></div>
                <span className="report-section-count">{state.history?.length || 0} events</span>
              </div>
              {state.history?.length ? (
                <div className="report-transcript">
                  {state.history.map((event, index) => (
                    <article key={`${event.type || event.event || "event"}-${index}`}>
                      <span>R{event.round || "—"}</span>
                      <b>{event.agentName || "System"}</b>
                      <strong>{event.type || event.event || "EVENT"}</strong>
                      <p>{event.reason || event.message || event.decision || ""}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="report-empty-note">No transcript events are available.</p>}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
