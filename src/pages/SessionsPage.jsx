import { useMemo, useState } from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function statusLabel(status) {
  const value = String(status || "").toUpperCase();
  if (value === "AGREEMENT") return "Agreement";
  if (value === "DEADLOCK") return "Deadlock";
  if (value === "REJECTED") return "Rejected";
  return value ? value.replaceAll("_", " ") : "Completed";
}

function statusClass(status) {
  const value = String(status || "").toUpperCase();
  if (value === "AGREEMENT") return "history-status agreement";
  if (value === "DEADLOCK") return "history-status deadlock";
  if (value === "REJECTED") return "history-status rejected";
  return "history-status";
}

function modeLabel(mode) {
  return String(mode || "simulation").toLowerCase() === "practice" ? "Practice" : "Simulation";
}

export default function SessionsPage({ sessions = [], onOpen, onDelete }) {
  const [filter, setFilter] = useState("all");

  const sorted = useMemo(() => {
    const source = Array.isArray(sessions) ? sessions : [];
    return [...source].sort((a, b) => {
      const aTime = new Date(a.completedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.completedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [sessions]);

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((session) => String(session.mode || "simulation").toLowerCase() === filter);
  }, [sorted, filter]);

  const agreements = sorted.filter((session) => String(session.status).toUpperCase() === "AGREEMENT").length;
  const practice = sorted.filter((session) => String(session.mode || "simulation").toLowerCase() === "practice").length;
  const averageScore = sorted.filter((session) => Number.isFinite(Number(session.score))).length
    ? Math.round(sorted.reduce((sum, session) => sum + Number(session.score || 0), 0) / sorted.filter((session) => Number.isFinite(Number(session.score))).length)
    : null;

  return (
    <section className="command-page sessions-history-page">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">WORKSPACE / SESSIONS</span>
          <h1>Your negotiation history</h1>
          <p>Review your past simulations and practice negotiations, including the scenario, exact date and time, mode, outcome, rounds, and score.</p>
        </div>
        <div className="history-heading-meta">
          <span>{sorted.length} {sorted.length === 1 ? "session" : "sessions"}</span>
        </div>
      </div>

      <div className="history-summary-grid">
        <div className="history-summary-card"><span>◎</span><strong>{sorted.length}</strong><small>Total negotiations</small></div>
        <div className="history-summary-card"><span>✓</span><strong>{agreements}</strong><small>Agreements reached</small></div>
        <div className="history-summary-card"><span>★</span><strong>{practice}</strong><small>Practice sessions</small></div>
        <div className="history-summary-card"><span>▮</span><strong>{averageScore == null ? "—" : `${averageScore}%`}</strong><small>Average score</small></div>
      </div>

      <section className="panel-block history-table-card">
        <div className="history-table-toolbar">
          <div>
            <span className="eyebrow">SESSION RECORD</span>
            <h2>All negotiations</h2>
            <p>Your latest activity is shown first.</p>
          </div>
          <div className="history-filters" role="tablist" aria-label="Filter negotiation history">
            {[["all", "All"], ["simulation", "Simulation"], ["practice", "Practice"]].map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="history-empty">
            <div className="empty-orb">◷</div>
            <h2>{sorted.length ? "No sessions match this filter" : "No saved sessions yet"}</h2>
            <p>{sorted.length ? "Try another filter to view your negotiation history." : "Complete a negotiation and the real session will automatically appear here with its scenario and timestamp."}</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <div className="history-table-head">
              <span>Scenario</span>
              <span>Date &amp; time</span>
              <span>Mode</span>
              <span>Outcome</span>
              <span>Rounds</span>
              <span>Score</span>
              <span>Action</span>
            </div>
            <div className="history-table-body">
              {filtered.map((session) => (
                <article className="history-row" key={session.sessionId || session.id}>
                  <div className="history-scenario-cell">
                    <span className="history-scenario-icon">◈</span>
                    <div><strong>{session.scenarioName || session.stateSnapshot?.scenario?.name || "Negotiation"}</strong><small>{session.sessionId ? `Session ${String(session.sessionId).slice(0, 12)}` : "Recorded session"}</small></div>
                  </div>
                  <time className="history-date">{formatDateTime(session.completedAt || session.createdAt)}</time>
                  <span className="history-mode">{modeLabel(session.mode)}</span>
                  <span className={statusClass(session.status)}>{statusLabel(session.status)}</span>
                  <span className="history-number">{Number(session.rounds ?? session.currentRound ?? 0)}</span>
                  <span className="history-score">{Number.isFinite(Number(session.score)) ? `${Math.round(Number(session.score))}%` : "—"}</span>
                  <div className="history-actions">
                    <button type="button" onClick={() => onOpen?.(session)}>View</button>
                    <button type="button" className="history-delete" onClick={() => onDelete?.(session)} aria-label={`Delete ${session.scenarioName || "session"}`}>×</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
