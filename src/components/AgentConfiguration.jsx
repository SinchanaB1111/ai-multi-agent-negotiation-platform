import AgentCard from "./AgentCard";

function AgentConfiguration({
  scenario,
  agents,
  onPersonalityChange,
  onBack,
  onReady,
  onAgentChange,
}) {
  const isCustomizable =
  scenario?.type === "custom";

  return (
    <section className="page agent-configuration-page">

      {/* ================= TOP ================= */}

      <div className="configuration-top">

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="section-label">
          AGENT CONFIGURATION
        </div>

        <h1>
          {isCustomizable
            ? "Customize Your Agents"
            : "Configure Your Agents"}
        </h1>

        <p>
          {isCustomizable
            ? "Customize the name, role, goal, constraint and personality of each agent."
            : "Review the predefined agents and select their personalities."}
        </p>

      </div>


      {/* ================= SCENARIO INFO ================= */}

      <div
        className="ready-scenario-bar"
        style={{ marginBottom: "25px" }}
      >
        <div className="ready-scenario-label">
          SELECTED SCENARIO
        </div>

        <h2>{scenario?.name}</h2>

        <p>{scenario?.description}</p>
      </div>


      {/* ================= AGENTS ================= */}

      <div className="agent-configuration-list">

        {agents.map((agent, index) => (

          <div key={agent.id}>

            {isCustomizable ? (

              <CustomizableAgentCard
                agent={agent}
                agentNumber={index + 1}
                onChange={onAgentChange}
                onPersonalityChange={
                  onPersonalityChange
                }
              />

            ) : (

              <AgentCard
                agent={agent}
                onPersonalityChange={
                  onPersonalityChange
                }
              />

            )}

          </div>

        ))}

      </div>


      {/* ================= ACTIONS ================= */}

      <div
        className="ready-actions"
        style={{
          marginTop: "30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
        }}
      >

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Scenarios
        </button>

        <button
          className="start-negotiation-button"
          onClick={onReady}
        >
          <span>
            {isCustomizable
              ? "Save Configuration"
              : "Continue"}
          </span>

          <span>→</span>
        </button>

      </div>

    </section>
  );
}


/* =====================================================
   CUSTOMIZABLE AGENT CARD
   ===================================================== */

function CustomizableAgentCard({
  agent,
  agentNumber,
  onChange,
  onPersonalityChange,
}) {
  const updateField = (field, value) => {
    onChange(agent.id, field, value);
  };

  return (
    <article className="agent-card">

      {/* HEADER */}

      <div className="agent-card-header">

        <div className="agent-avatar">
          A{agentNumber}
        </div>

        <div className="agent-title">

          <span className="agent-type">
            AI NEGOTIATION AGENT
          </span>

          <h2>
            Agent {agentNumber}
          </h2>

        </div>

        <div className="agent-role-badge">

          <span className="role-badge-label">
            ROLE
          </span>

          <span className="role-badge-value">
            {agent.role || "Not defined"}
          </span>

        </div>

      </div>


      {/* FORM */}

      <div
        className="agent-details"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "20px",
        }}
      >

        {/* NAME */}

        <EditableField
          label="Agent Name"
          value={agent.name}
          placeholder="Enter agent name"
          onChange={(value) =>
            updateField("name", value)
          }
        />


        {/* ROLE */}

        <EditableField
          label="Role"
          value={agent.role}
          placeholder="Enter agent role"
          onChange={(value) =>
            updateField("role", value)
          }
        />


        {/* GOAL */}

        <EditableField
          label="Goal"
          value={agent.goal}
          placeholder="Enter agent goal"
          onChange={(value) =>
            updateField("goal", value)
          }
        />


        {/* CONSTRAINT */}

        <EditableField
  label="Constraint"
  value={
    typeof agent.constraints === "object"
      ? Object.entries(agent.constraints)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : agent.constraints
  }
  placeholder="Example: Maximum budget ₹100000"
  onChange={(value) =>
    updateField("constraints", value)
  }
/>

      </div>


      {/* PERSONALITY */}

      <div className="personality-card-section">

        <div className="personality-heading">

          <span className="personality-label">
            PERSONALITY SELECTION
          </span>

          <span className="personality-status">
            Active
          </span>

        </div>

        <PersonalitySelectorInline
          value={agent.personality}
          onChange={(personality) =>
            onPersonalityChange(
              agent.id,
              personality
            )
          }
        />

      </div>

    </article>
  );
}


/* =====================================================
   EDITABLE FIELD
   ===================================================== */

function EditableField({
  label,
  value,
  placeholder,
  onChange,
}) {
  return (
    <div
      className="agent-detail-item"
      style={{ width: "100%" }}
    >

      <div
        className="detail-text"
        style={{ width: "100%" }}
      >

        <strong className="detail-label">
          {label}
        </strong>

        <input
          type="text"
          value={value || ""}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          style={{
            width: "100%",
            marginTop: "8px",
            padding: "12px",
            borderRadius: "8px",
            border:
              "1px solid var(--border-color, #333)",
            background:
              "var(--input-background, transparent)",
            color: "inherit",
            boxSizing: "border-box",
          }}
        />

      </div>

    </div>
  );
}


/* =====================================================
   PERSONALITY SELECTOR
   ===================================================== */

function PersonalitySelectorInline({
  value,
  onChange,
}) {
  const personalities = [
    {
      name: "Aggressive",
      description:
        "Prioritizes strong outcomes and maximum advantage.",
    },
    {
      name: "Collaborative",
      description:
        "Focuses on cooperation and mutual benefit.",
    },
    {
      name: "Risk-Averse",
      description:
        "Prefers safe decisions and reduced risk.",
    },
  ];

  return (
    <div className="personality-options">

      {personalities.map((personality) => {

        const isSelected =
          value === personality.name;

        return (
          <button
            key={personality.name}
            type="button"
            className={`personality-option ${
              isSelected ? "selected" : ""
            }`}
            onClick={() =>
              onChange(personality.name)
            }
          >

            <span
              className={`professional-radio ${
                isSelected ? "checked" : ""
              }`}
            >
              {isSelected && (
                <span className="radio-inner-dot"></span>
              )}
            </span>

            <span className="personality-option-content">

              <strong>
                {personality.name}
              </strong>

              <small>
                {personality.description}
              </small>

            </span>

          </button>
        );

      })}

    </div>
  );
}

export default AgentConfiguration;