import PersonalitySelector from "./PersonalitySelector";

function AgentCard({ agent, index = 0, onChange }) {
  const update = (field, value) => onChange?.(agent.id, { [field]: value });
  const updateNegotiation = (field, value) =>
    onChange?.(agent.id, {
      negotiation: {
        ...agent.negotiation,
        [field]: Number(value),
      },
    });

  const getInitials = (name) => {
    if (!name) return "AG";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const isMinimize = agent.decisionType === "minimize";

  return (
    <article className="agent-card customizable-agent-card">
      <div className="agent-card-header">
        <div className="agent-avatar">{getInitials(agent.name)}</div>
        <div className="agent-title">
          <span className="agent-type">AGENT 0{index + 1} • CUSTOMIZABLE</span>
          <h2>{agent.name}</h2>
        </div>
        <div className="agent-role-badge">
          <span className="role-badge-label">ROLE</span>
          <span className="role-badge-value">{agent.role}</span>
        </div>
      </div>

      <div className="custom-form-grid">
        <label>
          <span>Agent Name</span>
          <input value={agent.name || ""} onChange={(e) => update("name", e.target.value)} />
        </label>
        <label>
          <span>Role</span>
          <input value={agent.role || ""} onChange={(e) => update("role", e.target.value)} />
        </label>
        <label className="full-width">
          <span>Goal</span>
          <input value={agent.goal || ""} onChange={(e) => update("goal", e.target.value)} />
        </label>
        <label className="full-width">
          <span>Constraint</span>
          <input value={agent.constraints || ""} onChange={(e) => update("constraints", e.target.value)} />
        </label>
        <label>
          <span>Negotiation Target (₹)</span>
          <input
            type="number"
            min="1"
            value={agent.negotiation?.targetValue ?? ""}
            onChange={(e) => updateNegotiation("targetValue", e.target.value)}
          />
        </label>
        <label>
          <span>{isMinimize ? "Maximum Acceptable (₹)" : "Minimum Acceptable (₹)"}</span>
          <input
            type="number"
            min="1"
            value={isMinimize ? agent.negotiation?.maximumAcceptable ?? "" : agent.negotiation?.minimumAcceptable ?? ""}
            onChange={(e) => updateNegotiation(isMinimize ? "maximumAcceptable" : "minimumAcceptable", e.target.value)}
          />
        </label>
        <label>
          <span>Negotiation Direction</span>
          <select value={agent.decisionType || "maximize"} onChange={(e) => onChange?.(agent.id, { decisionType: e.target.value })}>
            <option value="maximize">Maximize value</option>
            <option value="minimize">Minimize value</option>
          </select>
        </label>
      </div>

      <div className="personality-card-section">
        <div className="personality-heading">
          <span className="personality-label">PERSONALITY</span>
          <span className="personality-status">Active</span>
        </div>
        <PersonalitySelector
          value={agent.personality}
          onChange={(personality) => update("personality", personality)}
        />
      </div>
    </article>
  );
}

export default AgentCard;
