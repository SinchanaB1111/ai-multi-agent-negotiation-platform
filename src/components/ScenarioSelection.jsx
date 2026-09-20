import ScenarioCard from "./ScenarioCard";

function ScenarioSelection({ scenarios, mode, onModeChange, onSelect }) {
  return (
    <section className="page scenario-selection-page">
      <div className="scenario-hero enhanced-hero">
        <div className="hero-badge"><span className="badge-dot" /> Milestone 3 • Negotiation Training</div>
        <h1>Practice. Simulate. <span>Negotiate.</span></h1>
        <p>Choose a scenario and enter a realistic negotiation environment with live turns, reasoning, stance indicators, deadlock handling and outcome reporting.</p>
      </div>

      <div className="mode-picker">
        <button className={`mode-card ${mode === "simulation" ? "active" : ""}`} onClick={() => onModeChange("simulation")}>
          <div className="mode-icon">AI</div><div><strong>Simulation Mode</strong><p>Watch two autonomous AI agents negotiate.</p></div><span>AI ↔ AI</span>
        </button>
        <button className={`mode-card ${mode === "practice" ? "active" : ""}`} onClick={() => onModeChange("practice")}>
          <div className="mode-icon human">YOU</div><div><strong>Practice Mode</strong><p>Take one side and negotiate against an AI agent.</p></div><span>YOU ↔ AI</span>
        </button>
      </div>

      <div className="scenario-section-header"><div className="scenario-header-center"><div className="scenario-title-row"><h2>Choose a scenario</h2><div className="scenario-count"><span>{scenarios.length}</span> Templates</div></div><p>All three templates are ready for an end-to-end demonstration.</p></div></div>
      <div className="scenario-row">{scenarios.map((scenario, index) => <div className="scenario-wrapper" key={scenario.id}><ScenarioCard scenario={scenario} index={index} onSelect={onSelect} /></div>)}</div>

      <div className="feature-strip">
        <div><b>01</b><span>Live Arena</span><small>Transcript + metrics</small></div>
        <div><b>02</b><span>Practice Mode</span><small>Human input + AI response</small></div>
        <div><b>03</b><span>Deadlock Guard</span><small>Detects stalled rounds</small></div>
        <div><b>04</b><span>Report Export</span><small>Download summary + transcript</small></div>
      </div>
    </section>
  );
}

export default ScenarioSelection;
