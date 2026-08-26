function ScenarioCard({ scenario, onSelect, index }) {
  // Professional SVG icons replacing emojis
  const renderScenarioIcon = (name) => {
    const lowerName = name.toLowerCase();

    if (lowerName.includes("vendor") || lowerName.includes("pricing")) {
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    }

    if (lowerName.includes("job") || lowerName.includes("offer")) {
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    }

    if (lowerName.includes("budget") || lowerName.includes("allocation")) {
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    }

    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  };

  return (
    <article className="scenario-card">
      <div className="scenario-card-top">
        <div className="scenario-top-left">
          {index !== undefined && (
            <span className="scenario-number">0{index + 1}</span>
          )}
          <div className="scenario-icon">
            {renderScenarioIcon(scenario.name)}
          </div>
        </div>

        <span className="scenario-tag">
          {scenario.agents.length} AGENTS
        </span>
      </div>

      <div className="scenario-card-content">
        <h2>{scenario.name}</h2>

        <p className="scenario-description">
          {scenario.description}
        </p>
      </div>

      <div className="scenario-agents-preview">
        <span className="agents-label">PARTIES:</span>

        <div className="agent-role-list">
          {scenario.agents.map((agent, idx) => (
            <div className="agent-role" key={agent.id}>
              <span>{agent.role}</span>
              {idx < scenario.agents.length - 1 && (
                <span className="versus">↔</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        className="select-scenario-button"
        onClick={() => onSelect(scenario)}
      >
        <span>Configure</span>
        <span className="button-arrow">→</span>
      </button>
    </article>
  );
}

export default ScenarioCard;