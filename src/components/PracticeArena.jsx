import { useMemo, useState } from "react";
import {
  createNegotiationState,
  startNegotiation,
  NEGOTIATION_STATUS,
} from "../logic/negotiationState.js";
import { processPracticeOffer, processPracticeDecision } from "../logic/orchestrator.js";
import { buildNegotiationAnalysis } from "../logic/negotiationAnalysis.js";
import {
  buildReportText,
  downloadJsonReport,
  downloadHtmlReport,
} from "../logic/reportGenerator.js";
import "./PracticeArena.css";

const MAX_PRACTICE_ROUNDS = 6;

function PracticeArena({ scenario, agents, onExit }) {
  const human = agents[0];
  const ai = agents[1];

  const initial = useMemo(
    () => startNegotiation(createNegotiationState(scenario, agents, MAX_PRACTICE_ROUNDS)),
    [scenario, agents]
  );

  const [state, setState] = useState(initial);
  const [input, setInput] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const formatMoney = (value) =>
    value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

  const status = state.status;

  const submitOffer = async (event) => {
    event?.preventDefault();
    if (busy || status !== NEGOTIATION_STATUS.IN_PROGRESS) return;

    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid positive offer amount.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const next = await processPracticeOffer(
        state,
        {
          value,
          terms: terms.trim() || null,
          reason: `Human participant proposed ${formatMoney(value)}${terms ? ` with terms: ${terms}` : "."}`,
        }
      );

      setState(next);
      setInput("");
      setTerms("");
    } catch (submissionError) {
      setError(submissionError.message || "Unable to process the offer.");
    } finally {
      setBusy(false);
    }
  };

  const decideOnAiOffer = (decision) => {
    if (busy || status !== NEGOTIATION_STATUS.IN_PROGRESS) return;
    if (!state.currentOffer || state.currentOffer.agentId !== ai.id) {
      setError("There is no AI offer available to accept or reject.");
      return;
    }

    setError("");
    try {
      const next = processPracticeDecision(
        state,
        decision,
        decision === "ACCEPT"
          ? `${human.name} accepted the AI offer of ${formatMoney(state.currentOffer.value)}.`
          : `${human.name} rejected the AI offer of ${formatMoney(state.currentOffer.value)}.`
      );
      setState(next);
    } catch (decisionError) {
      setError(decisionError.message || "Unable to record your decision.");
    }
  };

  const reset = () => {
    setState(initial);
    setInput("");
    setTerms("");
    setError("");
  };

  const reportText = buildReportText(state, "Practice Mode");
  const analysis = buildNegotiationAnalysis(state);

  return (
    <div className="practice-page">
      <header className="practice-header">
        <div>
          <span className="eyebrow">MILESTONE 3 • PRACTICE MODE</span>
          <h1>Negotiation Arena</h1>
          <p>
            {scenario.name} • You are negotiating as {human.role}
          </p>
        </div>
        <div className="practice-actions">
          <button onClick={onExit}>← Exit</button>
          <button onClick={reset}>↻ Reset</button>
        </div>
      </header>

      <div className="practice-stats">
        <div><span>ROUND</span><strong>{state.currentRound}</strong></div>
        <div>
          <span>STATUS</span>
          <strong className={status === "AGREEMENT" ? "good" : status === "REJECTED" || status === "DEADLOCK" ? "bad" : "live"}>
            {status}
          </strong>
        </div>
        <div><span>OFFERS</span><strong>{state.offers?.length || 0}</strong></div>
        <div><span>DECISIONS</span><strong>{state.decisions?.length || 0}</strong></div>
        <div><span>CONCESSIONS</span><strong>{state.concessions?.length || 0}</strong></div>
      </div>

      <main className="practice-grid">
        <aside className="practice-side">
          <div className="side-label">YOUR PROFILE</div>
          <h2>{human.name}</h2>
          <p>{human.role}</p>
          <div className="side-item"><span>Goal</span><b>{human.goal}</b></div>
          <div className="side-item"><span>Constraint</span><b>{human.constraints}</b></div>
          <div className="side-item"><span>Personality</span><b>{human.personality}</b></div>
        </aside>

        <section className="practice-chat">
          <div className="chat-head">
            <div>
              <span className="eyebrow">LIVE TRANSCRIPT</span>
              <h2>{ai.name} is your AI opponent</h2>
            </div>
            <span className="live-pill">● LIVE</span>
          </div>

          <div className="chat-scroll">
            {state.history?.map((historyEvent, index) => (
              <div
                key={`${historyEvent.timestamp || index}-${index}`}
                className={`chat-event ${historyEvent.agentId === human.id ? "human" : historyEvent.agentId === ai.id ? "ai" : "system"}`}
              >
                <div className="event-meta">
                  <b>{historyEvent.agentName || "System"}</b>
                  <span>Round {historyEvent.round || state.currentRound}</span>
                </div>
                <div className="event-bubble">
                  {historyEvent.type === "OFFER" || historyEvent.type === "COUNTEROFFER" ? (
                    <>
                      <strong>{historyEvent.type === "COUNTEROFFER" ? "Counteroffer: " : "Offer: "}{formatMoney(historyEvent.value)}</strong>
                      <p>{historyEvent.reason}</p>
                    </>
                  ) : historyEvent.type === "DECISION" ? (
                    <>
                      <strong>{historyEvent.decision}</strong>
                      <p>{historyEvent.reason}</p>
                    </>
                  ) : (
                    <p>{historyEvent.message || historyEvent.event}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {status === NEGOTIATION_STATUS.IN_PROGRESS ? (
            <>
              {state.currentOffer?.agentId === ai.id && (
                <div className="human-decision-bar">
                  <div>
                    <span className="eyebrow">YOUR DECISION</span>
                    <p>AI offered <strong>{formatMoney(state.currentOffer.value)}</strong>. You can accept it, reject it, or make your own counteroffer.</p>
                  </div>
                  <div className="decision-actions">
                    <button type="button" className="accept-button" onClick={() => decideOnAiOffer("ACCEPT")} disabled={busy}>✓ Accept Offer</button>
                    <button type="button" className="reject-button" onClick={() => decideOnAiOffer("REJECT")} disabled={busy}>✕ Reject Offer</button>
                  </div>
                </div>
              )}
              <form className="offer-form" onSubmit={submitOffer}>
              <div className="offer-fields">
                <label>
                  Offer amount (₹)
                  <input
                    type="number"
                    min="1"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="e.g. 100000"
                    disabled={busy}
                  />
                </label>
                <label>
                  Terms / note (optional)
                  <input
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    placeholder="Add a condition or benefit"
                    disabled={busy}
                  />
                </label>
                <button disabled={busy}>
                  {busy ? "AI is evaluating…" : "Send Offer →"}
                </button>
              </div>
                {error && <p className="form-error">{error}</p>}
              </form>
            </>
          ) : (
            <div className="practice-complete">
              <div>
                <span className="eyebrow">NEGOTIATION COMPLETE</span>
                <h2>
                  {status === "AGREEMENT"
                    ? `Agreement at ${formatMoney(state.agreement?.offer?.value)}`
                    : status}
                </h2>
                <p>{state.terminationReason}</p>
              </div>
              <div className="report-actions">
                <button onClick={() => downloadHtmlReport(state, "Practice Mode")}>Download Report</button>
                <button onClick={() => downloadJsonReport(state, "Practice Mode")}>Export JSON</button>
              </div>
            </div>
          )}
        </section>

        <aside className="practice-side intelligence">
          <div className="side-label">AI INTELLIGENCE</div>
          <div className="intel-card">
            <span>Latest AI action</span>
            <strong>{state.lastDecision || "WAITING"}</strong>
            <p>
              {state.currentOffer?.agentId === ai.id
                ? state.currentOffer.reason
                : "Submit an offer and the AI opponent will evaluate it against its goals and constraints."}
            </p>
          </div>
          <div className="intel-card">
            <span>Report preview</span>
            <pre>{reportText.slice(0, 420)}{reportText.length > 420 ? "…" : ""}</pre>
          </div>
        </aside>
      </main>

      <section className="analysis-panel">
        <div className="tracking-head">
          <div>
            <span className="eyebrow">NEGOTIATION ANALYSIS</span>
            <h2>How the negotiation progressed</h2>
          </div>
          <strong>{analysis.status}</strong>
        </div>
        <div className="analysis-kpis">
          <div><span>FINAL VALUE</span><b>{formatMoney(analysis.finalValue)}</b></div>
          <div><span>ROUNDS</span><b>{analysis.rounds}</b></div>
          <div><span>OFFERS</span><b>{analysis.offers}</b></div>
          <div><span>CONCESSIONS</span><b>{analysis.concessions}</b></div>
          <div><span>COUNTEROFFERS</span><b>{analysis.counteroffers}</b></div>
        </div>
        <div className="analysis-body">
          <div className="analysis-card">
            <span className="side-label">TARGET ALIGNMENT</span>
            <p>{analysis.targetGapText}</p>
          </div>
          {analysis.agentAnalysis.map((item) => (
            <div className="analysis-card" key={item.agentId}>
              <span className="side-label">{item.agentName}</span>
              <p><b>{item.behavior}</b> • {item.offerCount} offer{item.offerCount === 1 ? "" : "s"} • {item.concessionCount} concession{item.concessionCount === 1 ? "" : "s"}</p>
              <p>Target: {formatMoney(item.targetValue)} • Last offer: {formatMoney(item.lastOffer)} • Target gap: {formatMoney(item.finalGap)}</p>
            </div>
          ))}
        </div>
        <ul className="analysis-notes">
          {analysis.notes.map((note, index) => <li key={index}>{note}</li>)}
        </ul>
      </section>

      <section className="practice-tracking-grid">
        <div className="tracking-panel">
          <div className="tracking-head">
            <div>
              <span className="eyebrow">ORCHESTRATOR HISTORY</span>
              <h2>Negotiation History</h2>
            </div>
            <strong>{state.history?.length || 0} events</strong>
          </div>
          <div className="history-table-wrap">
            <table className="practice-table">
              <thead>
                <tr><th>Round</th><th>Actor</th><th>Event</th><th>Value</th><th>Details</th></tr>
              </thead>
              <tbody>
                {(state.history || []).map((event, index) => (
                  <tr key={`${event.timestamp || index}-history`}>
                    <td>{event.round ?? "—"}</td>
                    <td>{event.agentName || "Orchestrator"}</td>
                    <td><span className={`event-tag ${String(event.type || "SYSTEM").toLowerCase()}`}>{event.type || "SYSTEM"}</span></td>
                    <td>{event.value != null ? formatMoney(event.value) : event.offerValue != null ? formatMoney(event.offerValue) : "—"}</td>
                    <td>{event.reason || event.message || event.event || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tracking-panel">
          <div className="tracking-head">
            <div>
              <span className="eyebrow">CONCESSION TRACKER</span>
              <h2>Concessions</h2>
            </div>
            <strong>{state.concessions?.length || 0} tracked</strong>
          </div>
          {(state.concessions || []).length === 0 ? (
            <div className="empty-tracking">Concessions appear automatically when the same agent changes its own offer.</div>
          ) : (
            <div className="concession-list">
              {state.concessions.map((item, index) => (
                <div className="concession-row" key={`${item.timestamp || index}-concession`}>
                  <div>
                    <b>{item.agentName || item.agentId}</b>
                    <span>Round {item.fromRound} → {item.toRound}</span>
                  </div>
                  <div className="concession-values">
                    <span>{formatMoney(item.previousOffer)} → {formatMoney(item.currentOffer)}</span>
                    <strong>{item.direction === "NO CHANGE" ? "No change" : `${item.direction === "DECREASE" ? "−" : "+"}${formatMoney(item.change)}`}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="concession-summary">
            <span>Total concessions</span><b>{state.concessions?.length || 0}</b>
            <span>Total movement</span><b>{formatMoney((state.concessions || []).reduce((sum, item) => sum + (Number(item.change) || 0), 0))}</b>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PracticeArena;
