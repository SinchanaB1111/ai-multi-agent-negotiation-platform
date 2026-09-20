import AgentCard from "./AgentCard";

function AgentConfiguration({ scenario, agents, mode, onAgentChange, onBack, onReady }) {
  const isPractice = mode === "practice";

  return (
    <section className="page agent-configuration-page">
      <div className="configuration-top">
        <button className="back-button" onClick={onBack}>← Back</button>
        <div className="configuration-status"><span className="status-dot" /> Step 2 • {isPractice ? "Practice Mode" : "Simulation Mode"}</div>
        <div className="configuration-top-spacer" />
      </div>

      <div className="configuration-hero">
        <div className="configuration-label">{isPractice ? "HUMAN VS AI" : "AI VS AI"}</div>
        <h1>Build your agent personas</h1>
        <p>Customize names, roles, goals, constraints, targets, direction and personality before entering the Arena.</p>
      </div>

      <div className="mode-summary-card">
        <div><span>SCENARIO</span><strong>{scenario.name}</strong></div>
        <div><span>MODE</span><strong>{isPractice ? "Practice Mode" : "Simulation Mode"}</strong></div>
        <div><span>PLAYERS</span><strong>{isPractice ? "You + AI Agent" : "AI Agent + AI Agent"}</strong></div>
      </div>

      <div className="agent-section-header">
        <div className="agent-header-center">
          <span className="section-label">PERSONA BUILDER</span>
          <div className="agent-title-row"><h2>Configure both sides</h2><div className="agent-count-badge">{agents.length} Agents</div></div>
          <p>Hard constraints remain enforceable while personality influences negotiation style.</p>
        </div>
      </div>

      <div className="agent-grid">
        {agents.map((agent, index) => (
          <div className="agent-wrapper" key={agent.id}>
            <AgentCard agent={agent} index={index} onChange={onAgentChange} />
          </div>
        ))}
      </div>

      <div className="configuration-action enhanced-action">
        <div className="action-text"><span className="action-ready-dot" /><div><strong>Configuration validated</strong><p>Review the values above, then continue to the negotiation setup.</p></div></div>
        <button className="ready-button" onClick={onReady}>Review Setup <span className="button-arrow">→</span></button>
      </div>
    </section>
  );
}

export default AgentConfiguration;
