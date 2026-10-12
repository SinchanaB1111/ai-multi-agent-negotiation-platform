
function ScenarioIcon({ name, size = 25 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  if (name === "vendor") return <svg {...common}><path d="M3.5 7h11l1.4 8.5H5z"/><path d="M7 7 8.6 3.5h4L14 7M7 18.5h.01M14 18.5h.01"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="14" cy="18.5" r="1.6"/></svg>;
  if (name === "job") return <svg {...common}><rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M8 7V5.7A1.7 1.7 0 0 1 9.7 4h4.6A1.7 1.7 0 0 1 16 5.7V7M3.5 12h17M10 12v2h4v-2"/></svg>;
  if (name === "budget") return <svg {...common}><circle cx="8" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 18.5c.6-3.2 2.2-5 4.5-5s3.9 1.8 4.5 5M13 18.5c.4-2.4 1.8-3.8 3.9-3.8 1.6 0 2.9.8 3.6 2.4"/></svg>;
  if (name === "car") return <svg {...common}><path d="m5 16-1-5 2-4h10l2 4-1 5"/><path d="M4 16h16M7 16v2M17 16v2"/><circle cx="7" cy="15" r="1.3"/><circle cx="17" cy="15" r="1.3"/></svg>;
  if (name === "house") return <svg {...common}><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>;
  if (name === "contract") return <svg {...common}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 13h6M9 17h5"/></svg>;
  if (name === "office") return <svg {...common}><path d="M5 21V4h10v17M15 9h4v12M8 8h3M8 12h3M8 16h3"/></svg>;
  if (name === "partnership") return <svg {...common}><path d="M7 12 4.5 9.5a2.5 2.5 0 0 1 3.5-3.5l4 4"/><path d="m17 12 2.5-2.5A2.5 2.5 0 0 0 16 6l-4 4"/><path d="m8 15 3 3a2 2 0 0 0 2.8 0l5.2-5.2"/><path d="m6 13 2 2M18 13l-2 2"/></svg>;
  return <svg {...common}><path d="M4 6.5h6l1.6 2H20a1 1 0 0 1 1 1v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/></svg>;
}

const iconForScenario = (scenario) => {
  const name = scenario.name.toLowerCase();
  if (name.includes("vendor") || name.includes("pricing")) return "vendor";
  if (name.includes("job") || name.includes("offer")) return "job";
  if (name.includes("budget") || name.includes("allocation")) return "budget";
  if (name.includes("car") || name.includes("purchase")) return "car";
  if (name.includes("house") || name.includes("rent")) return "house";
  if (name.includes("freelance") || name.includes("contract")) return "contract";
  if (name.includes("office") || name.includes("lease")) return "office";
  if (name.includes("partnership")) return "partnership";
  return "scenarios";
};

const toneForIndex = (index) => `library-tone-${(index % 8) + 1}`;

function ScenarioLibrary({ scenarios, onSelect, onCreateCustom, onBack }) {
  return (
    <section className="command-page scenario-library-page">
      <div className="scenario-library-heading">
        <div>
          <span className="eyebrow">WORKSPACE / SCENARIOS</span>
          <h1>Scenario library</h1>
          <p>Explore vendor pricing, job offer, project budget, and more negotiation situations.</p>
        </div>
        <button className="primary-action library-new-button" onClick={onCreateCustom}>＋ New Negotiation →</button>
      </div>

      <div className="scenario-library-grid">
        {scenarios.map((scenario, index) => (
          <button
            key={scenario.id}
            type="button"
            className={`library-scenario-card ${toneForIndex(index)}`}
            onClick={() => onSelect(scenario)}
          >
            <span className="library-card-top">
              <span className="library-icon"><ScenarioIcon name={iconForScenario(scenario)} size={25} /></span>
              <span className="library-card-arrow">→</span>
            </span>
            <span className="library-card-title">{scenario.name}</span>
            <span className="library-card-description">{scenario.description}</span>
            <span className="library-card-meta">
              <em>{scenario.libraryType || scenario.negotiationType || "Amount"}</em>
              <b>{scenario.agents?.length || 0} Agents</b>
            </span>
          </button>
        ))}
      </div>

      <div className="custom-library-card">
        <div className="custom-library-icon">✦</div>
        <div className="custom-library-copy">
          <span className="custom-library-label">OR</span>
          <strong>Create Custom Negotiation</strong>
          <p>Build your own scenario with custom agents, goals, constraints, and personalities.</p>
        </div>
        <button type="button" onClick={onCreateCustom}>Create Custom <span>→</span></button>
      </div>

      <button className="library-back-button" type="button" onClick={onBack}>← Back to Dashboard</button>
    </section>
  );
}

export default ScenarioLibrary;
