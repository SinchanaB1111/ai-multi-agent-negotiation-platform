function ConfigurationChoice({
  scenario,
  onPredefined,
  onCustom,
  onBack,
}) {
  return (
    <section className="page scenario-selection-page">

      {/* HEADER */}

      <div className="ready-hero">

        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          AGENT SETUP
        </div>

        <h1>Configure Your Agents</h1>

        <p>
          Choose how you would like to configure the agents for this
          negotiation scenario.
        </p>

      </div>


      {/* SELECTED SCENARIO */}

      <div
        className="ready-scenario-bar"
        style={{ marginBottom: "30px" }}
      >

        <div className="ready-scenario-label">
          SELECTED SCENARIO
        </div>

        <h2>{scenario?.name}</h2>

        <p>{scenario?.description}</p>

      </div>


      {/* TWO OPTIONS */}

      <div className="scenario-mode-selector">

        {/* PREDEFINED */}

        <button
          type="button"
          className="scenario-mode-card"
          onClick={onPredefined}
        >

          <div className="scenario-mode-icon">
            ✓
          </div>

          <div>

            <span className="scenario-mode-label">
              PREDEFINED
            </span>

            <h3>Use Predefined Configuration</h3>

            <p>
              Use the default agents, roles, goals, and constraints
              provided for this scenario.
            </p>

          </div>

        </button>


        {/* CUSTOM */}

        <button
          type="button"
          className="scenario-mode-card"
          onClick={onCustom}
        >

          <div className="scenario-mode-icon">
            +
          </div>

          <div>

            <span className="scenario-mode-label">
              CUSTOMIZABLE
            </span>

            <h3>Customize Agent Configuration</h3>

            <p>
              Modify the agent names, roles, goals, constraints, and
              personalities according to your requirements.
            </p>

          </div>

        </button>

      </div>


      {/* BACK */}

      <div
        style={{
          marginTop: "30px",
        }}
      >

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Scenarios
        </button>

      </div>

    </section>
  );
}

export default ConfigurationChoice;
