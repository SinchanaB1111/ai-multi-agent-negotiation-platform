import { useMemo, useState } from "react";
import { downloadHtmlReport, downloadJsonReport, downloadPdfReport } from "../logic/reportGenerator.js";
import { buildNegotiationAnalysis } from "../logic/negotiationAnalysis.js";
import { calculatePerformanceScore } from "../logic/negotiationInsights.js";

const money = (value) => {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const formatSessionDate = (timestamp) => {
  if (!timestamp) return "Date unavailable";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatSessionOption = (session, index) => {
  const scenario = session?.scenarioName || session?.stateSnapshot?.scenario?.name || "Negotiation";
  const mode = session?.mode === "practice" ? "Practice" : "Simulation";
  const date = formatSessionDate(session?.completedAt);
  return index === 0 ? "Latest Session" : `${scenario} · ${mode} · ${date}`;
};


function Icon({ name }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    value: <><ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/></>,
    rounds: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    offers: <><path d="M5 5h14v11H5z"/><path d="M8 19h8M8 9h8M8 12h5"/></>,
    concessions: <><path d="M4 7.5 8.5 4 20 15.5 15.5 20 4 8.5z"/><path d="m8 12 2.5 2.5 5-5"/></>,
    score: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9z"/>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/></>,
    download: <><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5M5 20h14"/></>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></>,
    document: <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/></>,
    insight: <><path d="M9 18h6M10 21h4"/><path d="M8.5 14.5C7.6 13.6 7 12.4 7 11a5 5 0 0 1 10 0c0 1.4-.6 2.6-1.5 3.5-.7.7-1.2 1.2-1.2 2.5h-4.6c0-1.3-.5-1.8-1.2-2.5Z"/></>,
    trend: <><path d="M4 17 9 12l3 3 7-8"/><path d="M15 7h4v4"/></>,
    target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.5"/></>,
    bolt: <path d="m13 2-8 12h6l-1 8 8-12h-6z"/>,
    handshake: <><path d="m4 12 4-4 4 3 4-4 4 4-4 4-3-2-3 3z"/><path d="m8 8 2-2M16 7l2 2"/></>,
    user: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-3.5 3-5.2 7-5.2s6.3 1.7 7 5.2"/></>,
  };
  return <svg className="ra-icon" {...common}>{paths[name] || paths.document}</svg>;
}

function scoreForAgent(agent, finalValue, status) {
  if (status !== "AGREEMENT" || !Number.isFinite(finalValue)) {
    return status === "DEADLOCK" ? 50 : status === "REJECTED" ? 35 : 70;
  }
  const target = Number(agent?.negotiation?.targetValue);
  if (!Number.isFinite(target) || target <= 0) return 70;
  const minimum = Number(agent?.negotiation?.minimumAcceptable);
  const maximum = Number(agent?.negotiation?.maximumAcceptable);
  let score = 70;
  if (agent.decisionType === "minimize") {
    score = finalValue <= target ? 100 : Number.isFinite(maximum) && maximum > target ? 100 - ((finalValue - target) / (maximum - target)) * 100 : 70;
  } else {
    score = finalValue >= target ? 100 : Number.isFinite(minimum) && target > minimum ? 100 - ((target - finalValue) / (target - minimum)) * 100 : 70;
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

function ProgressChart({ state }) {
  const agents = (state?.agents || []).slice(0, 2);
  const offers = state?.offers || [];
  const rounds = Math.max(1, Number(state?.currentRound || 0), ...offers.map((item) => Number(item.round || 0)));
  const series = agents.map((agent) => Array.from({ length: rounds }, (_, index) => {
    const round = index + 1;
    const own = offers.filter((item) => item.agentId === agent.id && Number(item.round || 0) <= round && Number.isFinite(Number(item.value)));
    return own.length ? Number(own[own.length - 1].value) : null;
  }));
  const values = series.flat().filter(Number.isFinite);
  const finalValue = state?.status === "AGREEMENT" ? Number(state?.agreement?.offer?.value) : NaN;
  if (Number.isFinite(finalValue)) values.push(finalValue);
  if (!values.length) values.push(0);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.02, 1);
  const min = minValue - spread * 0.08;
  const max = maxValue + spread * 0.08;
  const range = Math.max(max - min, 1);
  const width = 760;
  const height = 220;
  const left = 66;
  const right = 12;
  const top = 14;
  const bottom = 40;
  const x = (i) => left + (i / Math.max(rounds - 1, 1)) * (width - left - right);
  const y = (value) => top + (1 - (value - min) / range) * (height - top - bottom);
  const path = (points) => points.map((value, index) => Number.isFinite(value) ? `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}` : "").filter(Boolean).join(" ");
  const grid = [0, .25, .5, .75, 1].map((ratio) => min + range * ratio);

  return <div className="ra-chart-wrap">
    <svg className="ra-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Negotiation progress by round">
      {grid.map((value, index) => <g key={`grid-${index}`}>
        <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="ra-grid"/>
        <text x="4" y={y(value) + 4} className="ra-axis-label">{money(Math.round(value))}</text>
      </g>)}
      {Array.from({ length: rounds }, (_, index) => <text key={index} x={x(index)} y={height - 10} textAnchor="middle" className="ra-axis-label">Round {index + 1}</text>)}
      {series.map((points, index) => <g key={agents[index]?.id || index}>
        <path d={path(points)} className={`ra-line ${index === 0 ? "ra-line-you" : "ra-line-opponent"}`}/>
        {points.map((value, pointIndex) => Number.isFinite(value) && <circle key={pointIndex} cx={x(pointIndex)} cy={y(value)} r="3.2" className={index === 0 ? "ra-point-you" : "ra-point-opponent"}/>) }
      </g>)}
    </svg>
  </div>;
}

function ConcessionBreakdown({ yours, opponent }) {
  const total = yours + opponent;
  const yourPercent = total ? Math.round((yours / total) * 100) : 0;
  return <div className="ra-donut-layout">
    <div className="ra-donut" style={{ "--ra-your": `${yourPercent}%` }}>
      <div><strong>{total}</strong><span>Total<br/>Concessions</span></div>
    </div>
    <div className="ra-donut-legend">
      <div><i className="ra-legend-you"/><span>Your Concessions</span><b>{yours} <small>({yourPercent}%)</small></b></div>
      <div><i className="ra-legend-opponent"/><span>Opponent Concessions</span><b>{opponent} <small>({total ? Math.round((opponent / total) * 100) : 0}%)</small></b></div>
    </div>
  </div>;
}

function MetricCard({ icon, label, value, detail }) {
  return <article className="ra-metric-card">
    <span className="ra-metric-icon"><Icon name={icon}/></span>
    <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
  </article>;
}

function eventType(event) {
  const type = String(event?.type || event?.event || "OFFER").toUpperCase();
  if (type.includes("AGREE")) return "Agreement";
  if (type.includes("CONCESS")) return "Concession";
  if (type.includes("COUNTER")) return "Counter";
  if (type.includes("REJECT")) return "Rejected";
  return "Offer";
}

function eventValue(event) {
  if (event?.value != null) return Number(event.value);
  if (event?.offerValue != null) return Number(event.offerValue);
  return null;
}

function PrintReport({ state, analysis, mode, score, finalValue, target, gap, hasAgreement, maxRounds, yourConcessions, opponentConcessions, insights, timeline, transcript }) {
  const agents = (state.agents || []).slice(0, 2);
  const statusLabel = state.status === "AGREEMENT" ? "AGREEMENT" : state.status === "DEADLOCK" ? "DEADLOCK" : state.status === "REJECTED" ? "REJECTED" : state.status || "IN PROGRESS";
  const completedAt = state.completedAt || state.createdAt;
  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };
  const agentRows = agents.map((agent, index) => {
    const aa = analysis.agentAnalysis.find((item) => item.agentId === agent.id) || {};
    const agentScore = scoreForAgent(agent, finalValue, state.status);
    const objective = agent?.goal || (agent?.decisionType === "minimize" ? "Achieve the lowest acceptable value" : "Maximize the final value");
    const satisfaction = Math.max(0, Math.min(100, agentScore));
    const offers = (state.offers || []).filter((offer) => offer.agentId === agent.id);
    const timelineRows = offers.map((offer, i) => {
      const previous = offers[i - 1];
      const movement = previous ? Number(offer.value) - Number(previous.value) : 0;
      return { round: offer.round || i + 1, value: Number(offer.value), movement };
    });
    return { agent, aa, agentScore, objective, satisfaction, timelineRows, index };
  });
  const progressAgents = agents.map((agent) => ({
    agent,
    offers: (state.offers || []).filter((offer) => offer.agentId === agent.id && Number.isFinite(Number(offer.value)))
  }));
  const yourPct = analysis.concessions ? Math.round((yourConcessions / analysis.concessions) * 100) : 0;
  const opponentPct = analysis.concessions ? 100 - yourPct : 0;

  return <div className="ra-print-report" aria-hidden="true">
    <div className="ra-print-page ra-print-cover">
      <header className="ra-print-brand"><strong>NEGOSPHERE</strong><span>AI-Driven Multi-Agent Negotiation Training &amp; Simulation Platform</span></header>
      <div className="ra-print-kicker">NEGOTIATION SUMMARY REPORT</div>
      <h1>{state.scenario?.name || "Negotiation Report"}</h1>
      <p className="ra-print-meta">Mode: {mode.replace(" Mode", "").toLowerCase()} {completedAt ? ` · Generated: ${formatDateTime(completedAt)}` : ""}</p>
      <span className={`ra-print-status ${hasAgreement ? "agreement" : "neutral"}`}>{statusLabel}</span>
      <div className="ra-print-rule" />
      <div className="ra-print-kpis">
        <div><small>FINAL AGREEMENT</small><b>{hasAgreement ? money(finalValue) : "No agreement"}</b></div>
        <div><small>ROUNDS ELAPSED</small><b>{analysis.rounds}</b></div>
        <div><small>TOTAL RECORDED TURNS</small><b>{transcript.length}</b></div>
        <div><small>NEGOTIATION MODE</small><b>{mode.replace(" Mode", "")}</b></div>
      </div>
      <section className="ra-print-card ra-print-summary-card">
        <h2>Agreement Summary</h2>
        <div className="ra-print-summary-grid">
          <div><span>Final agreement value</span><b className={hasAgreement ? "green" : ""}>{hasAgreement ? money(finalValue) : "No agreement reached"}</b></div>
          <div><span>Final status</span><b>{statusLabel}</b></div>
          <div><span>Settlement / terms</span><b>{hasAgreement ? money(finalValue) : "No settlement"}</b></div>
        </div>
        <p>{state.terminationReason || analysis.notes.join(" ") || "The negotiation session was completed and recorded."}</p>
      </section>
      <section className="ra-print-card">
        <h2>Performance Snapshot</h2>
        <div className="ra-print-stat-grid">
          <div><span>Negotiation score</span><b>{score}/100</b></div>
          <div><span>Target value</span><b>{Number.isFinite(target) ? money(target) : "—"}</b></div>
          <div><span>Target gap</span><b>{gap != null ? `${gap.toFixed(1)}%` : "—"}</b></div>
          <div><span>Counteroffers</span><b>{analysis.counteroffers}</b></div>
          <div><span>Concessions</span><b>{analysis.concessions}</b></div>
          <div><span>Max rounds</span><b>{maxRounds}</b></div>
        </div>
      </section>
    </div>

    <div className="ra-print-page">
      <section className="ra-print-card ra-print-agent-section">
        <h2>Agent Objectives &amp; Satisfaction</h2>
        {agentRows.map(({ agent, agentScore, objective, satisfaction, timelineRows }) => <article className="ra-print-agent" key={agent.id}>
          <div className="ra-print-agent-top"><div><h3>{agent.name || "Agent"}</h3><span>{agent.role || "Negotiator"} · {agent.personality || ""}</span></div><div><small>Satisfaction</small><b>{satisfaction}%</b></div></div>
          <div className="ra-print-line" />
          <p><strong>Objective</strong> {objective}</p>
          <p><strong>Final position</strong> <span className="green">{hasAgreement ? money(finalValue) : "No agreement"}</span></p>
          <p className="ra-print-subhead">Performance metrics</p>
          <div className="ra-print-mini-grid">
            <span>Score <b>{agentScore}%</b></span><span>Offers <b>{analysis.agentAnalysis.find((x) => x.agentId === agent.id)?.offerCount || 0}</b></span><span>Concessions <b>{analysis.agentAnalysis.find((x) => x.agentId === agent.id)?.concessionCount || 0}</b></span><span>Target gap <b>{analysis.agentAnalysis.find((x) => x.agentId === agent.id)?.finalGap != null ? money(analysis.agentAnalysis.find((x) => x.agentId === agent.id).finalGap) : "—"}</b></span>
          </div>
          <p className="ra-print-subhead">Concession timeline</p>
          <div className="ra-print-timeline-list">{timelineRows.length ? timelineRows.map((row, i) => <div key={`${row.round}-${i}`}><span>R{row.round}</span><b>{money(row.value)}</b><em>Movement: {row.movement === 0 ? money(0) : `${row.movement > 0 ? "+" : "-"}${money(Math.abs(row.movement))}`}</em></div>) : <div><span>—</span><b>Not recorded</b><em>Movement: —</em></div>}</div>
        </article>)}
      </section>
    </div>

    <div className="ra-print-page">
      <section className="ra-print-card">
        <h2>Negotiation Progress</h2>
        <div className="ra-print-progress">
          {progressAgents.map(({ agent, offers }, index) => <div key={agent.id}><strong>{index === 0 ? "Your Value" : "Opponent Value"}</strong><div className="ra-print-progress-list">{offers.length ? offers.map((offer, i) => <span key={`${offer.round}-${i}`}><i>R{offer.round || i + 1}</i><b>{money(offer.value)}</b></span>) : <span><i>—</i><b>No offers</b></span>}</div></div>)}
        </div>
      </section>
      <div className="ra-print-two-col">
        <section className="ra-print-card"><h2>Concession Breakdown</h2><div className="ra-print-breakdown"><div className="ra-print-donut" style={{"--your": `${yourPct}%`}}><strong>{analysis.concessions}</strong><span>Total<br/>Concessions</span></div><div className="ra-print-breakdown-legend"><p><i className="blue"/>Your Concessions <b>{yourConcessions} ({yourPct}%)</b></p><p><i className="gray"/>Opponent Concessions <b>{opponentConcessions} ({opponentPct}%)</b></p></div></div></section>
        <section className="ra-print-card"><h2>Key Insights</h2>{insights.map(([title, text], i) => <div className="ra-print-insight" key={`${title}-${i}`}><strong>{title}</strong><p>{text}</p></div>)}</section>
      </div>
      <section className="ra-print-card"><h2>Concession Timeline</h2><div className="ra-print-event-timeline">{timeline.length ? timeline.map((event, i) => <div key={`${event.round}-${i}`}><span>Round {event.round || i + 1}</span><p>{event.reason || event.message || (eventValue(event) != null ? `${event.agentName || "Agent"} · ${money(eventValue(event))}` : event.decision || event.type || event.event || "Negotiation event")}</p><b>{eventType(event)}</b></div>) : <p>No concession events were recorded.</p>}</div></section>
      <section className="ra-print-card"><h2>Overall Assessment</h2><p>{hasAgreement ? `The negotiation was successful, achieving an agreement ${gap != null ? `${gap.toFixed(1)}% from your target value` : "within the recorded target range"} with ${analysis.concessions ? "measured concession management" : "limited concession movement"} and clear strategic positioning.` : `The negotiation did not reach a final agreement. Review the concession timeline, remaining target gap, and final decision before your next session.`}</p><span className={`ra-print-assessment ${hasAgreement ? "success" : "neutral"}`}>{hasAgreement ? "Successful" : statusLabel}</span></section>
    </div>

    <div className="ra-print-page">
      <section className="ra-print-card"><h2>Negotiation Transcript &amp; Summary</h2><div className="ra-print-summary-text"><strong>{state.status === "AGREEMENT" ? "Successful negotiation" : state.status === "DEADLOCK" ? "Negotiation ended in deadlock" : state.status === "REJECTED" ? "Negotiation ended by rejection" : "Negotiation in progress"}</strong><p>{analysis.notes.join(" ") || "The session contains no additional summary notes."}</p><p>{state.terminationReason || "No termination reason was recorded."}</p></div></section>
      <section className="ra-print-card"><h2>Final Agreement Terms</h2>{hasAgreement ? <div className="ra-print-terms"><span>Price</span><b>{money(finalValue)}</b><span>Delivery Terms</span><b>Within 30 days</b><span>Payment Terms</span><b>Net 30</b></div> : <div className="ra-print-summary-text"><strong>No agreement reached</strong><p>{state.status === "DEADLOCK" ? "The negotiation ended in a deadlock." : state.status === "REJECTED" ? "The negotiation was rejected before an agreement was reached." : "No final agreement is recorded for this session."}</p></div>}</section>
      <section className="ra-print-card ra-print-transcript-card"><h2>Complete Negotiation Transcript</h2><table><thead><tr><th>Turn</th><th>Round</th><th>Agent</th><th>Decision</th><th>Offer</th><th>Concession</th><th>Reasoning</th></tr></thead><tbody>{transcript.length ? transcript.map((event, index) => { const value = eventValue(event); const type = String(event.type || event.event || "EVENT").toUpperCase(); const decision = event.decision ? String(event.decision).toUpperCase() : type.includes("ACCEPT") ? "ACCEPT" : type.includes("REJECT") ? "REJECT" : type.includes("COUNTER") ? "COUNTER" : type; const concession = state.concessions?.find((c) => c.agentId === event.agentId && Number(c.round || c.toRound || 0) === Number(event.round || 0)); return <tr key={`${event.timestamp || index}-${index}`}><td>{index + 1}</td><td>R{event.round || "—"}</td><td>{event.agentName || "System"}</td><td><span className={`ra-print-decision ${decision === "ACCEPT" ? "accept" : ""}`}>{decision}</span></td><td className="green">{value != null ? money(value) : "—"}</td><td>{concession ? `${Number(concession.change) >= 0 ? "+" : "-"}${money(Math.abs(Number(concession.change || 0)))}` : "N/A"}</td><td>{event.reason || event.message || event.decision || "—"}</td></tr>; }) : <tr><td colSpan="7">No transcript events were recorded.</td></tr>}</tbody></table></section>
    </div>
  </div>;
}

export default function ReportsAnalytics({ store, onStart }) {
  const sessions = useMemo(() => {
    const timestamp = (session) => session?.completedAt || session?.stateSnapshot?.completedAt || session?.stateSnapshot?.createdAt || 0;
    return (store?.sessions || [])
      .filter((session) => {
        const status = String(session?.stateSnapshot?.status || session?.status || "").toUpperCase();
        return Boolean(session?.stateSnapshot) && !["", "NOT_STARTED", "IN_PROGRESS", "ACTIVE"].includes(status);
      })
      .sort((a, b) => new Date(timestamp(b)).getTime() - new Date(timestamp(a)).getTime());
  }, [store?.sessions]);
  const [selectedId, setSelectedId] = useState(sessions[0]?.sessionId || "");
  const [activeTab, setActiveTab] = useState("transcript");

  const activeId = sessions.some((session) => session.sessionId === selectedId) ? selectedId : sessions[0]?.sessionId || "";
  const selected = sessions.find((session) => session.sessionId === activeId) || sessions[0];
  const state = selected?.stateSnapshot;
  const analysis = state ? buildNegotiationAnalysis(state) : null;
  const performance = state ? calculatePerformanceScore(state) : null;

  if (!state || !analysis) {
    return <section className="command-page reports-page ra-page">
      <div className="ra-heading">
        <div><span className="eyebrow">WORKSPACE / REPORTS</span><h1>Reports &amp; analytics</h1><p>Completed negotiations will appear here with detailed performance metrics, transcripts, concession patterns, and outcome analysis.</p></div>
        <button className="ra-primary-button" onClick={onStart}>＋ New Negotiation <span>→</span></button>
      </div>
      <div className="ra-empty"><div className="ra-empty-icon">✦</div><h2>Your workspace is ready</h2><p>Complete a negotiation to populate this report with live performance data, concession patterns, transcript details, and outcome analysis.</p><button onClick={onStart}>Start a session</button></div>
    </section>;
  }

  const hasAgreement = state.status === "AGREEMENT" && state.agreement?.offer?.value != null;
  const finalValue = hasAgreement ? Number(state.agreement.offer.value) : null;
  const firstAgent = state.agents?.[0];
  const target = Number(firstAgent?.negotiation?.targetValue);
  const gap = hasAgreement && Number.isFinite(target) && target !== 0 ? Math.abs(finalValue - target) / Math.abs(target) * 100 : null;
  const yourConcessions = (state.concessions || []).filter((item) => item.agentId === firstAgent?.id).length;
  const opponentConcessions = Math.max(0, (state.concessions?.length || 0) - yourConcessions);
  const score = Number.isFinite(Number(selected.score)) ? Number(selected.score) : Math.round((state.agents || []).slice(0, 2).reduce((sum, agent) => sum + scoreForAgent(agent, finalValue, state.status), 0) / Math.max((state.agents || []).slice(0, 2).length, 1));
  const rounds = Math.max(1, analysis.rounds || 0);
  const maxRounds = Number(state.maxRounds || state.scenario?.maxRounds || 10);
  const mode = selected.mode === "practice" ? "Practice Mode" : "Simulation Mode";

  const allEvents = (state.history || []).filter((event) => event?.agentName || event?.message || event?.reason || eventValue(event) != null || event?.decision || event?.type || event?.event);
  const timeline = allEvents.filter((event) => eventValue(event) != null || ["AGREEMENT", "DEADLOCK", "REJECTED", "CONCESSION"].includes(String(event.type || event.event || "").toUpperCase())).slice(-10);
  const transcript = allEvents;

  const insights = [
    score >= 70
      ? ["You performed well", `Your negotiation score is ${score}/100, which reflects the recorded outcome and objective alignment.`, "trend"]
      : ["Room to improve", `Your negotiation score is ${score}/100. Review the final position and concession timing.`, "trend"],
    ["Good concession strategy", `You made ${yourConcessions} concession${yourConcessions === 1 ? "" : "s"} out of ${state.offers?.length || 0} recorded offers.`, "concessions"],
    ["Strong final position", gap != null ? `You closed at ${gap.toFixed(1)}% from your target value.` : "No final agreement value is available for this session.", "target"],
    [hasAgreement ? "Faster negotiation" : "Negotiation outcome", hasAgreement ? `You reached an agreement in ${rounds} rounds.` : state.terminationReason || "No agreement was reached in this session.", "bolt"],
  ];

  return <section className="command-page reports-page ra-page">
    <div className="ra-heading">
      <div><span className="eyebrow">WORKSPACE / REPORTS</span><h1>Reports &amp; analytics</h1><p>Gain insights from your negotiation sessions with detailed reports, performance metrics, and actionable recommendations.</p></div>
      <div className="ra-actions">
        <label className="ra-session-select" title="Select a completed negotiation report">
          <Icon name="calendar"/>
          <select value={activeId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Select a completed negotiation report">
            {sessions.map((session, index) => (
              <option key={session.sessionId} value={session.sessionId}>{formatSessionOption(session, index)}</option>
            ))}
          </select>
          <span>⌄</span>
        </label>
        <button onClick={() => downloadPdfReport(state, mode)}><Icon name="download"/>Download PDF</button>
        <button onClick={() => downloadJsonReport(state, mode)}><Icon name="code"/>Download JSON</button>
        <button onClick={() => downloadHtmlReport(state, mode)}><Icon name="download"/>Download HTML</button>
      </div>
    </div>

    <div className="ra-metrics">
      <MetricCard icon="value" label="Final Agreement Value" value={hasAgreement ? money(finalValue) : "No agreement reached"} detail={hasAgreement && gap != null ? `Target: ${money(target)}   (Gap: ${gap.toFixed(1)}%)` : "No final agreement recorded"}/>
      <MetricCard icon="rounds" label="Total Rounds" value={analysis.rounds} detail={`(Max: ${maxRounds})`}/>
      <MetricCard icon="offers" label="Total Offers" value={analysis.offers} detail={`(${analysis.counteroffers} Counteroffers)`}/>
      <MetricCard icon="concessions" label="Concessions Made" value={analysis.concessions} detail={`(${yourConcessions} by you, ${opponentConcessions} by opponent)`}/>
      <MetricCard icon="score" label="Negotiation Score" value={`${score}/100`} detail={score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Developing" : "Needs improvement"}/>
    </div>

    <div className="ra-main-grid">
      <div className="ra-left-column">
        <section className="ra-panel ra-progress-panel">
          <div className="ra-panel-head"><h2>Negotiation Progress</h2><div className="ra-legend"><span><i className="ra-blue-dot"/>Your Value</span><span><i className="ra-gray-dot"/>Opponent Value</span></div></div>
          <ProgressChart state={state}/>
        </section>
        <section className="ra-panel ra-performance-panel">
          <div className="ra-panel-title"><h2>Agent Performance</h2></div>
          <div className="ra-agent-grid">
            {(state.agents || []).slice(0, 2).map((agent, index) => {
              const agentAnalysis = analysis.agentAnalysis.find((item) => item.agentId === agent.id);
              const agentScore = scoreForAgent(agent, finalValue, state.status);
              const offerCount = agentAnalysis?.offerCount || 0;
              const concessionCount = agentAnalysis?.concessionCount || 0;
              const concessionRate = Math.min(100, Math.round((concessionCount / Math.max(offerCount, 1)) * 100));
              const decisionQuality = Math.max(50, Math.min(100, agentScore + (index === 0 ? 4 : -4)));
              return <article className="ra-agent-card" key={agent.id}>
                <div className="ra-agent-head"><span className={`ra-agent-avatar ${index ? "opponent" : "you"}`}><Icon name="user"/></span><div><strong>{agent.name || `Agent ${index + 1}`}</strong><small>{agent.role || "Negotiator"}</small></div><span className="ra-score-ring"><b>{agentScore}</b><small>Score</small></span></div>
                <div className="ra-bar-row"><span>Goal Achievement</span><b>{agentScore}%</b><div><i style={{ width: `${agentScore}%` }}/></div></div>
                <div className="ra-bar-row"><span>Concession Rate</span><b>{concessionRate}%</b><div><i style={{ width: `${concessionRate}%` }}/></div></div>
                <div className="ra-bar-row"><span>Decision Quality</span><b>{decisionQuality}%</b><div><i style={{ width: `${decisionQuality}%` }}/></div></div>
              </article>;
            })}
          </div>
        </section>
      </div>

      <div className="ra-middle-column">
        <section className="ra-panel ra-concession-panel"><div className="ra-panel-title"><h2>Concession Breakdown</h2></div><ConcessionBreakdown yours={yourConcessions} opponent={opponentConcessions}/></section>
        <section className="ra-panel ra-timeline-panel"><div className="ra-panel-title"><h2>Concession Timeline</h2></div><div className="ra-timeline">
          {timeline.length ? timeline.map((event, index) => { const type = eventType(event); const value = eventValue(event); const action = value != null ? `${String(event.type || event.event || "OFFER").toUpperCase().includes("COUNTER") ? "Opponent countered" : String(event.type || event.event || "OFFER").toUpperCase().includes("CONCESS") ? "Concession" : event.agentName ? `${event.agentName} offered` : "Offer"} ${money(value)}` : event.reason || event.message || (type === "Agreement" ? "Agreement reached" : "Negotiation event"); return <div className="ra-timeline-row" key={`${event.round || index}-${index}`}><span className="ra-timeline-marker"/><span className="ra-timeline-round">Round {event.round || index + 1}</span><span className="ra-timeline-text">{action}</span><em className={`ra-badge ra-${type.toLowerCase()}`}>{type}</em></div>; }) : <p className="ra-muted">No concession events were recorded.</p>}
        </div></section>
      </div>

      <aside className="ra-panel ra-insights-panel"><div className="ra-panel-title"><h2><Icon name="insight"/> Key Insights</h2></div>{insights.map(([title, text, icon], index) => <div className="ra-insight" key={`${title}-${index}`}><span><Icon name={icon}/></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</aside>
    </div>

    <div className="ra-bottom-grid">
      <section className="ra-panel ra-transcript-panel">
        <div className="ra-tabs-head"><h2><Icon name="document"/> Negotiation Transcript &amp; Summary</h2><div><button className={activeTab === "transcript" ? "active" : ""} onClick={() => setActiveTab("transcript")}>Transcript</button><button className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}>Summary</button></div></div>
        {activeTab === "transcript" ? <div className="ra-transcript-list">{transcript.length ? transcript.map((event, index) => { const value = eventValue(event); const type = String(event.type || event.event || "EVENT").toUpperCase(); const action = event.decision ? String(event.decision).toUpperCase() : type === "COUNTEROFFER" ? "COUNTER" : type; const detail = event.reason || event.message || (value != null ? `${action} ${money(value)}` : action); return <article className="ra-transcript-entry" key={`${event.timestamp || index}-${index}`}><span>{(event.agentName || "SY").slice(0, 2).toUpperCase()}</span><div><strong>Round {event.round || "—"} <small>{event.agentName ? `(${event.agentName} · ${action})` : `(${action})`}</small></strong><p>{detail}{value != null && !detail.includes(money(value)) ? ` · ${money(value)}` : ""}</p></div><time>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</time></article>; }) : <p className="ra-muted">No transcript events were recorded.</p>}</div> : <div className="ra-summary"><strong>{state.status === "AGREEMENT" ? "Successful negotiation" : state.status === "DEADLOCK" ? "Negotiation ended in deadlock" : state.status === "REJECTED" ? "Negotiation ended by rejection" : "Negotiation in progress"}</strong><p>{analysis.notes.join(" ") || "The session contains no additional summary notes."}</p><p>{state.terminationReason || "No termination reason was recorded."}</p></div>}
      </section>

      <section className="ra-panel ra-terms-panel"><div className="ra-panel-title"><h2><Icon name="document"/> Final Agreement Terms</h2></div>{hasAgreement ? <div className="ra-terms"><span>Price</span><b>{money(finalValue)}</b><span>Delivery Terms</span><b>Within 30 days</b><span>Payment Terms</span><b>Net 30</b></div> : <div className="ra-no-agreement"><strong>No agreement reached</strong><p>{state.status === "DEADLOCK" ? "The negotiation ended in a deadlock." : state.status === "REJECTED" ? "The negotiation was rejected before an agreement was reached." : "No final agreement is recorded for this session."}</p></div>}</section>

      <section className="ra-panel ra-assessment-panel"><div className="ra-panel-title"><h2><Icon name="target"/> Overall Assessment</h2></div><p>{hasAgreement ? `The negotiation was successful, achieving an agreement ${gap != null ? `${gap.toFixed(1)}% from your target value` : "within the recorded target range"} with ${analysis.concessions ? "measured concession management" : "limited concession movement"} and clear strategic positioning.` : `The negotiation did not reach a final agreement. Review the concession timeline, remaining target gap, and final decision before your next session.`}</p><span className={`ra-assessment-badge ${hasAgreement ? "success" : "neutral"}`}>{hasAgreement ? "Successful" : state.status === "DEADLOCK" ? "Deadlock" : state.status === "REJECTED" ? "Rejected" : "Review"}</span></section>
    </div>

    <PrintReport state={state} analysis={analysis} mode={mode} score={score} finalValue={finalValue} target={target} gap={gap} hasAgreement={hasAgreement} maxRounds={maxRounds} yourConcessions={yourConcessions} opponentConcessions={opponentConcessions} insights={insights} timeline={timeline} transcript={transcript} />
  </section>;
}
