import AgentCard from "./AgentCard";

function AgentConfiguration({
  scenario,
  agents,
  onPersonalityChange,
  onBack,
  onReady,
}) {
  return (
    <section className="page agent-configuration-page">
      <div className="configuration-top">
        <button className="back-button" onClick={onBack}>
          <span>←</span>
          Back to Scenarios
        </button>

        <div className="configuration-status">
          <span className="status-dot"></span>
          Step 2: Agent Configuration
        </div>

        {/* Empty placeholder div to keep the flex header balanced */}
        <div className="configuration-top-spacer"></div>
      </div>

      <div className="configuration-hero">
        <div className="configuration-label">
          SELECTED SCENARIO
        </div>

        <h1>{scenario.name}</h1>

        <p>{scenario.description}</p>
      </div>

      <div className="configuration-info-bar">
        <div className="info-item">
          <span className="info-label">AGENTS</span>
          <strong>{agents.length} Negotiating Agents</strong>
        </div>

        <div className="info-divider"></div>

        <div className="info-item">
          <span className="info-label">CONFIGURATION</span>
          <strong>Role, Goal & Personality</strong>
        </div>

        <div className="info-divider"></div>

        <div className="info-item">
          <span className="info-label">NEXT STEP</span>
          <strong>Review Negotiation Setup</strong>
        </div>
      </div>

      <div className="agent-section-header">
        <div className="agent-header-center">
          <span className="section-label">
            AGENT PERSONAS
          </span>

          <div className="agent-title-row">
            <h2>Configure your negotiating agents</h2>
            <div className="agent-count-badge">
              {agents.length} Agents
            </div>
          </div>

          <p>
            Each agent has a specific role, goal, constraint, and negotiation
            personality.
          </p>
        </div>
      </div>

      <div className="agent-grid">
        {agents.map((agent, index) => (
          <div className="agent-wrapper" key={agent.id}>
            <div className="agent-position">
              Agent 0{index + 1}
            </div>

            <AgentCard
              agent={agent}
              onPersonalityChange={onPersonalityChange}
            />
          </div>
        ))}
      </div>

      <div className="configuration-action">
        <div className="action-text">
          <span className="action-ready-dot"></span>

          <div>
            <strong>Agents are ready to review</strong>
            <p>
              Confirm the selected personalities and proceed to the negotiation
              setup.
            </p>
          </div>
        </div>

        <button className="ready-button" onClick={onReady}>
          <span>Review Negotiation Setup</span>
          <span className="button-arrow">→</span>
        </button>
      </div>
    </section>
  );
}

export default AgentConfiguration;