import "./OutcomeScreen.css";
import { analyzeNegotiationLearning } from "../learning/learningEngine.js";

function OutcomeScreen({ state, mode, onNew, onReports }) {
  const format = (v) => v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;
  const agreement = state.agreement?.offer?.value ?? state.currentOffer?.value;
  const learning = analyzeNegotiationLearning(state);
  return <section className="page outcome-page">
    <div className="outcome-hero"><span className="hero-badge">NEGOTIATION COMPLETE</span><h1>{state.status === "AGREEMENT" ? "Agreement reached." : "Session completed."}</h1><p>{state.scenario?.name} • {mode === "practice" ? "Practice Mode" : "Simulation Mode"}</p></div>
    <div className="outcome-kpis"><div><span>OUTCOME</span><strong className={state.status === "AGREEMENT" ? "good" : "bad"}>{state.status}</strong></div><div><span>FINAL VALUE</span><strong>{format(agreement)}</strong></div><div><span>ROUNDS</span><strong>{state.currentRound}</strong></div><div><span>OFFERS</span><strong>{state.offers?.length || 0}</strong></div><div><span>CONCESSIONS</span><strong>{state.concessions?.length || 0}</strong></div></div>
    <div className="outcome-grid"><div className="outcome-card"><span className="eyebrow">FINAL DECISION</span><h2>{state.terminationReason || "Negotiation ended."}</h2><p>Agreement value: <b>{format(agreement)}</b></p></div><div className="outcome-card"><span className="eyebrow">CONCESSION TIMELINE</span>{(state.concessions || []).slice(-6).map((c, i) => <div className="concession-row" key={c.id || i}><b>{c.agentName}</b><span>{format(c.previousOffer)} → {format(c.currentOffer)}</span><em>{Number(c.change) > 0 ? "+" : ""}{format(c.change)}</em></div>)}{!(state.concessions || []).length && <p>No concessions recorded.</p>}</div></div>
    <section className="outcome-learning-card">
      <div className="outcome-learning-heading">
        <div>
          <span className="eyebrow">AI NEGOTIATION LEARNING</span>
          <h2>Negotiation Journey</h2>
          <p>Observable lessons derived from the recorded negotiation history and concession data.</p>
        </div>
        <span className="outcome-learning-count">{learning.tactics.length} tactics • {learning.turningPoints.length} turning points</span>
      </div>

      {learning.turningPoints.length > 0 && (
        <div className="outcome-journey">
          {learning.turningPoints.slice(0, 5).map((point, index) => (
            <div className="outcome-journey-step" key={point.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{point.title}</strong>
                <small>Round {point.round}</small>
                <p>{point.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="outcome-learning-columns">
        <div>
          <span className="eyebrow">KEY TAKEAWAYS</span>
          <div className="outcome-takeaway-list">
            {learning.takeaways.slice(0, 5).map((takeaway) => (
              <div key={takeaway.title}>
                <strong>{takeaway.title}</strong>
                <p>{takeaway.lesson}</p>
                <small>{takeaway.evidence}</small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="eyebrow">SKILLS OBSERVED</span>
          <div className="outcome-skill-list">
            {learning.skillObservations.map((skill) => (
              <div key={skill.skill}>
                <span>{skill.skill}</span>
                <strong className={
                  skill.level === "Strongly Demonstrated"
                    ? "learning-level-strong"
                    : skill.level === "Observed"
                    ? "learning-level-observed"
                    : "learning-level-none"
                }>{skill.level}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <div className="download-section"><div><span className="eyebrow">REPORT &amp; ANALYTICS</span><h2>View the complete report</h2><p>Open Reports &amp; Analytics to review the full session, transcript, insights, and download or print the report.</p></div><div className="download-buttons"><button onClick={onReports}>View Report &amp; Analytics →</button></div></div>
    <div className="outcome-actions"><button onClick={onNew}>← Start New Negotiation</button></div>
  </section>;
}
export default OutcomeScreen;
