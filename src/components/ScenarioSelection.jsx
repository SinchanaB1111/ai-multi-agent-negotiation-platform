import ScenarioCard from "./ScenarioCard";

function ScenarioSelection({ scenarios, onSelect }) {
  return (
    <section className="page scenario-selection-page">
      <div className="scenario-hero">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Negotiation Setup
        </div>

        <h1>
          Choose your <span>negotiation scenario</span>
        </h1>

        <p>
          Select a real-world negotiation situation. You will then configure
          the participating agents, their personalities, goals, and constraints.
        </p>
      </div>

      <div className="scenario-section-header">
        <div className="scenario-header-center">
          <div className="scenario-title-row">
            <h2>Available Scenarios</h2>
            <div className="scenario-count">
              <span>{scenarios.length}</span>
              Scenarios
            </div>
          </div>
          <p>Choose one scenario to begin the simulation setup.</p>
        </div>
      </div>

      <div className="scenario-row">
        {scenarios.map((scenario, index) => (
          <div className="scenario-wrapper" key={scenario.id}>
            <ScenarioCard
              scenario={scenario}
              index={index}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>

      <div className="scenario-help">
        <div className="help-icon">i</div>

        <div className="help-content">
          <strong>How it works</strong>
          <p>
            Select a scenario → Configure both agents → Choose personalities →
            Review goals and constraints → Get ready for negotiation.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ScenarioSelection;