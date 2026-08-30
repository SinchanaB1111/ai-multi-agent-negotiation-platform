function ScenarioSelection({ scenarios, onSelect }) {
  return (
    <section className="page scenario-selection-page">

      {/* HEADER */}

      <div className="ready-hero">
        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          SCENARIO SETUP
        </div>

        <h1>Select Negotiation Scenario</h1>

        <p>
          Choose a negotiation scenario to begin the setup process.
        </p>
      </div>


      {/* SCENARIO HEADER */}

      <div className="scenario-section-header">
        <div>
          <span className="ready-scenario-label">
            AVAILABLE SCENARIOS
          </span>

          <h2>Choose a scenario</h2>
        </div>

        <span className="scenario-count">
          {scenarios.length} Available
        </span>
      </div>


      {/* SCENARIOS */}

      <div className="scenario-grid">

        {scenarios.map((scenario) => (
          <article
            className="scenario-card"
            key={scenario.id}
          >

            <div className="scenario-card-top">

              <div className="scenario-number">
                {String(scenario.id).padStart(2, "0")}
              </div>

              <span className="scenario-type">
                NEGOTIATION
              </span>

            </div>


            <h2>{scenario.name}</h2>

            <p>{scenario.description}</p>


            {/* AGENTS PREVIEW */}

            <div className="scenario-agents-preview">

              {scenario.agents.map((agent) => (

                <div
                  className="scenario-agent-preview"
                  key={agent.id}
                >

                  <div className="scenario-agent-avatar">
                    {agent.role
                      ? agent.role.charAt(0).toUpperCase()
                      : "A"}
                  </div>

                  <div>
                    <strong>{agent.name}</strong>
                    <span>{agent.role}</span>
                  </div>

                </div>

              ))}

            </div>


            <button
              type="button"
              className="scenario-select-button"
              onClick={() => onSelect(scenario)}
            >
              <span>Select Scenario</span>
              <span>→</span>
            </button>

          </article>
        ))}

      </div>

    </section>
  );
}

export default ScenarioSelection;