import { useEffect, useMemo, useRef, useState } from "react";
import {
  createNegotiationState,
  startNegotiation,
  NEGOTIATION_STATUS,
} from "../logic/negotiationState.js";
import {
  processPracticeOffer,
  processPracticeDecision,
} from "../logic/orchestrator.js";
import {
  buildReportText,
  downloadJsonReport,
  downloadHtmlReport,
  downloadPdfReport,
} from "../logic/reportGenerator.js";
import LiveStanceIndicator from "./LiveStanceIndicator.jsx";
import "./PracticeArena.css";

const MAX_PRACTICE_ROUNDS = 8;

function PracticeArena({ scenario, agents, onExit, onComplete }) {
  const human = agents[0];
  const ai = agents[1];

  const initial = useMemo(
    () =>
      startNegotiation(
        createNegotiationState(scenario, agents, Number(scenario?.maxRounds) || MAX_PRACTICE_ROUNDS)
      ),
    [scenario, agents]
  );

  const [state, setState] = useState(initial);
  const [input, setInput] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const completedSessionRef = useRef(null);

  useEffect(() => {
    const terminal = [NEGOTIATION_STATUS.AGREEMENT, NEGOTIATION_STATUS.REJECTED, NEGOTIATION_STATUS.DEADLOCK].includes(state.status);
    if (!terminal || completedSessionRef.current === state.sessionId) return;
    completedSessionRef.current = state.sessionId;
    onComplete?.(state);
  }, [state, onComplete]);

  const formatMoney = (value) =>
    value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

  const status = state.status;

  const getAgentOfferCount = (agentId) =>
    (state.offers || []).filter((offer) => offer.agentId === agentId).length;

  const getAgentConcessionAmount = (agentId) =>
    (state.concessions || [])
      .filter((concession) => concession.agentId === agentId)
      .reduce(
        (total, concession) => total + Number(concession.change || 0),
        0
      );

  const getGoalAchievement = (agent) => {
    if (!state.agreement?.offer || !agent?.negotiation) {
      return null;
    }

    const value = state.agreement.offer.value;
    const target = agent.negotiation.targetValue;

    if (agent.decisionType === "minimize") {
      if (value <= target) {
        return 100;
      }

      const max = agent.negotiation.maximumAcceptable;

      return Math.max(
        0,
        Math.min(
          100,
          100 -
            ((value - target) / Math.max(1, max - target)) * 100
        )
      );
    }

    if (value >= target) {
      return 100;
    }

    const min = agent.negotiation.minimumAcceptable;

    return Math.max(
      0,
      Math.min(
        100,
        100 -
          ((target - value) / Math.max(1, target - min)) * 100
      )
    );
  };

  const calculateNegotiationScore = () => {
    if (state.status === "NOT_STARTED") {
      return 0;
    }

    const outcome =
      state.status === "AGREEMENT"
        ? 40
        : state.status === "DEADLOCK"
        ? 20
        : state.status === "REJECTED"
        ? 10
        : 25;

    const goals = state.agreement?.offer
      ? (state.agents || [])
          .map(getGoalAchievement)
          .filter((value) => value !== null)
      : [];

    const goalScore = goals.length
      ? Math.round(
          (goals.reduce((a, b) => a + b, 0) / goals.length) * 0.3
        )
      : 0;

    const constraintScore = state.agreement?.offer ? 20 : 10;

    const efficiencyScore = Math.max(
      0,
      10 - Math.max(0, (state.offers?.length || 0) - 4)
    );

    return Math.min(
      100,
      Math.round(
        outcome + goalScore + constraintScore + efficiencyScore
      )
    );
  };

  const negotiationScore = calculateNegotiationScore();

  const getHealth = () => {
    const totalOffers = state.offers?.length || 0;
    const totalConcessions = state.concessions?.length || 0;

    if (state.status === "AGREEMENT") {
      return {
        label: "Excellent",
        score: 100,
      };
    }

    if (state.status === "REJECTED") {
      return {
        label: "Ended",
        score: 25,
      };
    }

    if (state.status === "DEADLOCK") {
      return {
        label: "Deadlocked",
        score: 10,
      };
    }

    if (totalOffers === 0) {
      return {
        label: "Ready",
        score: 70,
      };
    }

    const concessionBonus = Math.min(20, totalConcessions * 5);
    const roundPenalty = Math.max(
      0,
      ((state.currentRound || 0) - 3) * 5
    );

    return {
      label:
        concessionBonus >= 10 ? "Good progress" : "Negotiating",
      score: Math.max(
        20,
        Math.min(95, 65 + concessionBonus - roundPenalty)
      ),
    };
  };

  const health = getHealth();
  const geminiCallsUsed = state.geminiCallsUsed || 0;
  const isUsingFallback = state.usingFallback === true;

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
      const next = await processPracticeOffer(state, {
        value,
        terms: terms.trim() || null,
        reason: `Human participant proposed ${formatMoney(value)}${
          terms ? ` with terms: ${terms}` : "."
        }`,
      });

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
          ? `${human.name} accepted the AI offer of ${formatMoney(
              state.currentOffer.value
            )}.`
          : `${human.name} rejected the AI offer of ${formatMoney(
              state.currentOffer.value
            )}.`
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
    setReplayIndex(0);
    setIsReplayOpen(false);
  };

  const reportText = buildReportText(state, "Practice Mode");

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
        <div>
          <span>ROUND</span>
          <strong>{state.currentRound}</strong>
        </div>
        <div>
          <span>STATUS</span>
          <strong
            className={
              status === "AGREEMENT"
                ? "good"
                : status === "REJECTED" || status === "DEADLOCK"
                ? "bad"
                : "live"
            }
          >
            {status}
          </strong>
        </div>
        <div>
          <span>OFFERS</span>
          <strong>{state.offers?.length || 0}</strong>
        </div>
        <div>
          <span>DECISIONS</span>
          <strong>{state.decisions?.length || 0}</strong>
        </div>
        <div>
          <span>CONCESSIONS</span>
          <strong>{state.concessions?.length || 0}</strong>
        </div>
      </div>

      <main className="practice-grid">
        <aside className="practice-side">
          <div className="side-label">YOUR PROFILE</div>
          <h2>{human.name}</h2>
          <p>{human.role}</p>
          <div className="side-item">
            <span>Goal</span>
            <b>{human.goal}</b>
          </div>
          <div className="side-item">
            <span>Constraint</span>
            <b>{human.constraints}</b>
          </div>
          <div className="side-item">
            <span>Personality</span>
            <b>{human.personality}</b>
          </div>
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
                className={`chat-event ${
                  historyEvent.agentId === human.id
                    ? "human"
                    : historyEvent.agentId === ai.id
                    ? "ai"
                    : "system"
                }`}
              >
                <div className="event-meta">
                  <b>{historyEvent.agentName || "System"}</b>
                  <span>Round {historyEvent.round || state.currentRound}</span>
                </div>
                <div className="event-bubble">
                  {historyEvent.type === "OFFER" ||
                  historyEvent.type === "COUNTEROFFER" ? (
                    <>
                      <strong>
                        {historyEvent.type === "COUNTEROFFER"
                          ? "Counteroffer: "
                          : "Offer: "}
                        {formatMoney(historyEvent.value)}
                      </strong>
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
                    <p>
                      AI offered{" "}
                      <strong>{formatMoney(state.currentOffer.value)}</strong>.
                      You can accept it, reject it, or make your own
                      counteroffer.
                    </p>
                  </div>
                  <div className="decision-actions">
                    <button
                      type="button"
                      className="accept-button"
                      onClick={() => decideOnAiOffer("ACCEPT")}
                      disabled={busy}
                    >
                      ✓ Accept Offer
                    </button>
                    <button
                      type="button"
                      className="reject-button"
                      onClick={() => decideOnAiOffer("REJECT")}
                      disabled={busy}
                    >
                      ✕ Reject Offer
                    </button>
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
                    ? `Agreement at ${formatMoney(
                        state.agreement?.offer?.value
                      )}`
                    : status}
                </h2>
                <p>{state.terminationReason}</p>
              </div>
              <div className="report-actions">
                <button
                  onClick={() =>
                    downloadPdfReport(state, "Practice Mode")
                  }
                >
                  Download PDF Report
                </button>
                <button
                  onClick={() =>
                    downloadHtmlReport(state, "Practice Mode")
                  }
                >
                  Download HTML
                </button>
                <button
                  onClick={() =>
                    downloadJsonReport(state, "Practice Mode")
                  }
                >
                  Export JSON
                </button>
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
            <pre>
              {reportText.slice(0, 420)}
              {reportText.length > 420 ? "…" : ""}
            </pre>
          </div>
        </aside>
      </main>

      {/* =====================================================
          LIVE STANCE INDICATORS
          ===================================================== */}
      <LiveStanceIndicator
        state={state}
        agents={agents}
        title="Live Stance Indicators"
      />

      {/* =====================================================
          NEGOTIATION ANALYTICS
          ===================================================== */}
      <section className="practice-analysis-section">
        <div className="tracking-head">
          <div>
            <span className="eyebrow">NEGOTIATION ANALYTICS</span>
            <h2>Negotiation Analytics</h2>
            <p className="analytics-description">
              Live performance, efficiency, outcome and agent-level metrics.
            </p>
          </div>
          <strong>Practice Mode</strong>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <span>NEGOTIATION SCORE</span>
            <strong>{negotiationScore}/100</strong>
            <div className="analytics-progress">
              <div style={{ width: `${negotiationScore}%` }} />
            </div>
          </div>

          <div className="analytics-card">
            <span>NEGOTIATION HEALTH</span>
            <strong>{health.score}%</strong>
            <p>{health.label}</p>
            <div className="analytics-progress">
              <div style={{ width: `${health.score}%` }} />
            </div>
          </div>

          <div className="analytics-card">
            <span>TOTAL OFFERS</span>
            <strong>{state.offers?.length || 0}</strong>
            <p>{state.decisions?.length || 0} decisions recorded</p>
          </div>

          <div className="analytics-card">
            <span>AI ENGINE USAGE</span>
            <strong>{geminiCallsUsed}</strong>
            <p>
              {isUsingFallback
                ? "Rule-based fallback active"
                : "Gemini active"}
            </p>
          </div>
        </div>

        <div className="analytics-agent-grid">
          {(state.agents || []).map((agent) => {
            const goalScore = getGoalAchievement(agent);
            return (
              <div className="analytics-agent-card" key={agent.id}>
                <div className="analytics-agent-title">
                  <div>
                    <span>{agent.role}</span>
                    <strong>{agent.name}</strong>
                  </div>
                  <em>{agent.personality}</em>
                </div>

                <div className="analytics-agent-metrics">
                  <div>
                    <span>Offers</span>
                    <strong>{getAgentOfferCount(agent.id)}</strong>
                  </div>
                  <div>
                    <span>Concession</span>
                    <strong>
                      {formatMoney(getAgentConcessionAmount(agent.id))}
                    </strong>
                  </div>
                  <div>
                    <span>Goal score</span>
                    <strong>
                      {goalScore === null
                        ? "—"
                        : `${Math.round(goalScore)}%`}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {state.status !== NEGOTIATION_STATUS.IN_PROGRESS && (
          <div className="analytics-outcome">
            <div>
              <span>FINAL OUTCOME</span>
              <strong>
                {state.status === "AGREEMENT"
                  ? "Agreement Reached"
                  : state.status}
              </strong>
            </div>
            <div>
              <span>FINAL VALUE</span>
              <strong>
                {formatMoney(
                  state.agreement?.offer?.value ||
                    state.currentOffer?.value
                )}
              </strong>
            </div>
            <div>
              <span>ROUNDS</span>
              <strong>{state.currentRound}</strong>
            </div>
            <div>
              <span>ENGINE</span>
              <strong>
                {isUsingFallback ? "Rule-Based" : "Gemini"}
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          TRACKING & REPLAY
          ===================================================== */}
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
                <tr>
                  <th>Round</th>
                  <th>Actor</th>
                  <th>Event</th>
                  <th>Value</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(state.history || []).map((event, index) => (
                  <tr key={`${event.timestamp || index}-history`}>
                    <td>{event.round ?? "—"}</td>
                    <td>{event.agentName || "Orchestrator"}</td>
                    <td>
                      <span
                        className={`event-tag ${String(
                          event.type || "SYSTEM"
                        ).toLowerCase()}`}
                      >
                        {event.type || "SYSTEM"}
                      </span>
                    </td>
                    <td>
                      {event.value != null
                        ? formatMoney(event.value)
                        : event.offerValue != null
                        ? formatMoney(event.offerValue)
                        : "—"}
                    </td>
                    <td>
                      {event.reason ||
                        event.message ||
                        event.event ||
                        "—"}
                    </td>
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
            <div className="empty-tracking">
              Concessions appear automatically when the same agent changes its
              own offer.
            </div>
          ) : (
            <div className="concession-list">
              {state.concessions.map((item, index) => (
                <div
                  className="concession-row"
                  key={`${item.timestamp || index}-concession`}
                >
                  <div>
                    <b>{item.agentName || item.agentId}</b>
                    <span>
                      Round {item.fromRound} → {item.toRound}
                    </span>
                  </div>
                  <div className="concession-values">
                    <span>
                      {formatMoney(item.previousOffer)} →{" "}
                      {formatMoney(item.currentOffer)}
                    </span>
                    <strong>
                      {item.direction === "NO CHANGE"
                        ? "No change"
                        : `${item.direction === "DECREASE" ? "−" : "+"}${formatMoney(
                            item.change
                          )}`}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="concession-summary">
            <span>Total concessions</span>
            <b>{state.concessions?.length || 0}</b>
            <span>Total movement</span>
            <b>
              {formatMoney(
                (state.concessions || []).reduce(
                  (sum, item) => sum + (Number(item.change) || 0),
                  0
                )
              )}
            </b>
          </div>
        </div>
      </section>

      {state.history?.length > 0 && (
        <section className="practice-replay-section">
          <div className="tracking-head">
            <div>
              <span className="eyebrow">NEGOTIATION REPLAY</span>
              <h2>Negotiation Replay</h2>
              <p className="replay-description">
                Step through the recorded negotiation events.
              </p>
            </div>
            <button
              className="replay-toggle-button"
              onClick={() => {
                setIsReplayOpen((open) => !open);
                setReplayIndex(0);
              }}
            >
              {isReplayOpen ? "Hide Replay" : "Open Replay"}
            </button>
          </div>

          {isReplayOpen && (
            <div className="replay-panel">
              {(() => {
                const event = state.history[replayIndex];
                if (!event) return null;

                const eventAgentId =
                  event.agentId || event.offer?.agentId;
                const eventAgent = (state.agents || []).find(
                  (agent) => agent.id === eventAgentId
                );

                const eventType =
                  event.type || event.event || "SYSTEM";

                const displayEvent =
                  eventType === "COUNTEROFFER" || eventType === "COUNTER"
                    ? "COUNTER"
                    : eventType === "OFFER"
                    ? "OFFER"
                    : eventType === "DECISION"
                    ? "DECISION"
                    : eventType;

                const displayValue =
                  eventType === "OFFER" ||
                  eventType === "COUNTEROFFER" ||
                  eventType === "COUNTER"
                    ? formatMoney(
                        event.value ??
                          event.offer?.value ??
                          event.counterOffer
                      )
                    : eventType === "DECISION"
                    ? event.decision
                    : "—";

                return (
                  <>
                    <div className="replay-step">
                      <span>
                        EVENT {replayIndex + 1} / {state.history.length}
                      </span>
                      <strong>{displayEvent}</strong>
                    </div>

                    <div className="replay-content">
                      <div>
                        <span>ROUND</span>
                        <strong>R{event.round ?? "—"}</strong>
                      </div>
                      <div>
                        <span>AGENT</span>
                        <strong>
                          {eventAgent?.name ||
                            event.agentName ||
                            "System"}
                        </strong>
                      </div>
                      <div>
                        <span>VALUE / DECISION</span>
                        <strong>{displayValue}</strong>
                      </div>
                    </div>

                    <p className="replay-message">
                      {eventType === "OFFER" ||
                      eventType === "COUNTEROFFER" ||
                      eventType === "COUNTER"
                        ? event.reason || "Offer submitted."
                        : eventType === "DECISION"
                        ? event.reason || `Decision: ${event.decision}`
                        : event.message ||
                          event.reason ||
                          "Negotiation event recorded."}
                    </p>

                    <div className="replay-controls">
                      <button
                        disabled={replayIndex === 0}
                        onClick={() =>
                          setReplayIndex((index) => Math.max(0, index - 1))
                        }
                      >
                        ← Previous
                      </button>
                      <button
                        disabled={
                          replayIndex === state.history.length - 1
                        }
                        onClick={() =>
                          setReplayIndex((index) =>
                            Math.min(state.history.length - 1, index + 1)
                          )
                        }
                      >
                        Next →
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default PracticeArena;