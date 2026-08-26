import PersonalitySelector from "./PersonalitySelector";

function AgentCard({ agent, onPersonalityChange }) {
  const getInitials = (name) => {
    if (!name) return "AG";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <article className="agent-card">
      <div className="agent-card-header">
        <div className="agent-avatar">
          {getInitials(agent.name)}
        </div>

        <div className="agent-title">
          <span className="agent-type">AI NEGOTIATION AGENT</span>
          <h2>{agent.name}</h2>
        </div>

        <div className="agent-role-badge">
          <span className="role-badge-label">ROLE</span>
          <span className="role-badge-value">{agent.role}</span>
        </div>
      </div>

      <div className="agent-details">
        <div className="agent-detail-item">
          <div className="detail-icon">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>

          <div className="detail-text">
            <strong className="detail-label">Goal:</strong>
            <p className="detail-value">{agent.goal}</p>
          </div>
        </div>

        <div className="agent-detail-item">
          <div className="detail-icon">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <div className="detail-text">
            <strong className="detail-label">Constraint:</strong>
            <p className="detail-value">{agent.constraints}</p>
          </div>
        </div>
      </div>

      <div className="personality-card-section">
        <div className="personality-heading">
          <span className="personality-label">PERSONALITY SELECTION</span>
          <span className="personality-status">Active</span>
        </div>

        <PersonalitySelector
          value={agent.personality}
          onChange={(personality) =>
            onPersonalityChange(agent.id, personality)
          }
        />
      </div>
    </article>
  );
}

export default AgentCard;