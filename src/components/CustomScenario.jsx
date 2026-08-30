import { useState } from "react";

function CustomScenario({ onBack, onCreate }) {

  // =========================
  // SCENARIO STATE
  // =========================

  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");

  // =========================
  // AGENT 1 STATE
  // =========================

  const [agent1, setAgent1] = useState({
    name: "",
    role: "",
    goal: "",
    constraints: "",
    personality: "Collaborative",
  });

  // =========================
  // AGENT 2 STATE
  // =========================

  const [agent2, setAgent2] = useState({
    name: "",
    role: "",
    goal: "",
    constraints: "",
    personality: "Collaborative",
  });

  // =========================
  // UPDATE AGENT
  // =========================

  const updateAgent1 = (field, value) => {
    setAgent1((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateAgent2 = (field, value) => {
    setAgent2((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =========================
  // CREATE CUSTOM SCENARIO
  // =========================

  const handleCreate = (event) => {
    event.preventDefault();

    if (
      !scenarioName.trim() ||
      !scenarioDescription.trim() ||
      !agent1.name.trim() ||
      !agent1.role.trim() ||
      !agent1.goal.trim() ||
      !agent1.constraints.trim() ||
      !agent2.name.trim() ||
      !agent2.role.trim() ||
      !agent2.goal.trim() ||
      !agent2.constraints.trim()
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    const customScenario = {
      id: `custom-${Date.now()}`,

      name: scenarioName.trim(),

      description: scenarioDescription.trim(),

      type: "custom",

      agents: [
        {
          id: "custom-agent-1",
          name: agent1.name.trim(),
          role: agent1.role.trim(),
          goal: agent1.goal.trim(),
          constraints: agent1.constraints.trim(),
          personality: agent1.personality,
        },

        {
          id: "custom-agent-2",
          name: agent2.name.trim(),
          role: agent2.role.trim(),
          goal: agent2.goal.trim(),
          constraints: agent2.constraints.trim(),
          personality: agent2.personality,
        },
      ],
    };

    // Send the newly-created scenario
    // to the existing App.jsx flow.
    onCreate(customScenario);
  };

  return (
    <section className="page custom-scenario-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="configuration-top">

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back to Scenarios
        </button>

      </div>

      <div className="ready-hero">

        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          CUSTOM SCENARIO
        </div>

        <h1>Create Your Negotiation</h1>

        <p>
          Define the scenario and configure both negotiation
          agents according to your requirements.
        </p>

      </div>

      <form onSubmit={handleCreate}>

        {/* =========================
            SCENARIO DETAILS
        ========================= */}

        <div className="custom-section">

          <div className="custom-section-header">

            <div>
              <span className="ready-scenario-label">
                STEP 01
              </span>

              <h2>Scenario Details</h2>

              <p>
                Create the context in which the negotiation
                will take place.
              </p>
            </div>

          </div>

          <div className="custom-form-grid">

            <div className="custom-form-group full-width">

              <label>
                Scenario Name
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Example: Real Estate Price Negotiation"
                value={scenarioName}
                onChange={(event) =>
                  setScenarioName(event.target.value)
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Scenario Description
                <span>*</span>
              </label>

              <textarea
                rows="4"
                placeholder="Describe what the two agents are negotiating..."
                value={scenarioDescription}
                onChange={(event) =>
                  setScenarioDescription(event.target.value)
                }
              />

            </div>

          </div>

        </div>

        {/* =========================
            AGENT 1
        ========================= */}

        <div className="custom-section">

          <div className="custom-agent-heading">

            <div className="custom-agent-number">
              01
            </div>

            <div>
              <span className="ready-scenario-label">
                AGENT 01
              </span>

              <h2>First Negotiating Agent</h2>

              <p>
                Define the first participant completely.
              </p>
            </div>

          </div>

          <div className="custom-form-grid">

            <div className="custom-form-group">

              <label>
                Agent Name
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Example: Buyer Agent"
                value={agent1.name}
                onChange={(event) =>
                  updateAgent1("name", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group">

              <label>
                Role
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Example: Buyer"
                value={agent1.role}
                onChange={(event) =>
                  updateAgent1("role", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Goal
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="What does this agent want to achieve?"
                value={agent1.goal}
                onChange={(event) =>
                  updateAgent1("goal", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Constraint
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="What limitation must this agent follow?"
                value={agent1.constraints}
                onChange={(event) =>
                  updateAgent1(
                    "constraints",
                    event.target.value
                  )
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Personality
                <span>*</span>
              </label>

              <div className="custom-personality-options">

                {[
                  "Aggressive",
                  "Collaborative",
                  "Risk-Averse",
                ].map((personality) => (

                  <button
                    type="button"
                    key={personality}
                    className={`custom-personality-option ${
                      agent1.personality === personality
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      updateAgent1(
                        "personality",
                        personality
                      )
                    }
                  >

                    <span
                      className={`professional-radio ${
                        agent1.personality === personality
                          ? "checked"
                          : ""
                      }`}
                    >
                      {agent1.personality === personality && (
                        <span className="radio-inner-dot"></span>
                      )}
                    </span>

                    {personality}

                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            AGENT 2
        ========================= */}

        <div className="custom-section">

          <div className="custom-agent-heading">

            <div className="custom-agent-number">
              02
            </div>

            <div>
              <span className="ready-scenario-label">
                AGENT 02
              </span>

              <h2>Second Negotiating Agent</h2>

              <p>
                Define the second participant completely.
              </p>
            </div>

          </div>

          <div className="custom-form-grid">

            <div className="custom-form-group">

              <label>
                Agent Name
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Example: Vendor Agent"
                value={agent2.name}
                onChange={(event) =>
                  updateAgent2("name", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group">

              <label>
                Role
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Example: Vendor"
                value={agent2.role}
                onChange={(event) =>
                  updateAgent2("role", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Goal
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="What does this agent want to achieve?"
                value={agent2.goal}
                onChange={(event) =>
                  updateAgent2("goal", event.target.value)
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Constraint
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="What limitation must this agent follow?"
                value={agent2.constraints}
                onChange={(event) =>
                  updateAgent2(
                    "constraints",
                    event.target.value
                  )
                }
              />

            </div>

            <div className="custom-form-group full-width">

              <label>
                Personality
                <span>*</span>
              </label>

              <div className="custom-personality-options">

                {[
                  "Aggressive",
                  "Collaborative",
                  "Risk-Averse",
                ].map((personality) => (

                  <button
                    type="button"
                    key={personality}
                    className={`custom-personality-option ${
                      agent2.personality === personality
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      updateAgent2(
                        "personality",
                        personality
                      )
                    }
                  >

                    <span
                      className={`professional-radio ${
                        agent2.personality === personality
                          ? "checked"
                          : ""
                      }`}
                    >
                      {agent2.personality === personality && (
                        <span className="radio-inner-dot"></span>
                      )}
                    </span>

                    {personality}

                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            SUMMARY
        ========================= */}

        <div className="custom-summary">

          <div className="custom-summary-icon">
            ✓
          </div>

          <div>

            <strong>
              Custom negotiation environment
            </strong>

            <p>
              Your scenario, agents, roles, goals,
              constraints and personalities will be passed
              to the negotiation configuration.
            </p>

          </div>

        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="custom-actions">

          <button
            type="button"
            className="restart-button"
            onClick={onBack}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="start-negotiation-button"
          >
            <span>Create Custom Scenario</span>
            <span>→</span>
          </button>

        </div>

      </form>

    </section>
  );
}

export default CustomScenario;