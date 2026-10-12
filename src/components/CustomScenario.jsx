import { useMemo, useState } from "react";

const PERSONALITIES = ["Collaborative", "Aggressive", "Risk-Averse"];
const SCENARIO_TYPES = ["General", "Amount", "Salary", "Budget", "Multi-Issue"];

const initialAgent = (id, personality) => ({
  id,
  role: "",
  goal: "",
  constraints: "",
  targetValue: "",
  decisionType: id === "custom-agent-1" ? "minimize" : "maximize",
  boundaryValue: "",
  personality,
});

function CustomScenario({ onBack, onCreate }) {
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [scenarioType, setScenarioType] = useState("General");
  const [agent1, setAgent1] = useState(() => initialAgent("custom-agent-1", "Collaborative"));
  const [agent2, setAgent2] = useState(() => initialAgent("custom-agent-2", "Aggressive"));
  const [maxRounds, setMaxRounds] = useState(10);
  const [initialStrategy, setInitialStrategy] = useState("Balanced");
  const [environment, setEnvironment] = useState("Standard");
  const [showReasoning, setShowReasoning] = useState(true);

  const updateAgent = (setter, field, value) => setter((previous) => ({ ...previous, [field]: value }));

  const agentReady = useMemo(() => [agent1, agent2].every((agent) =>
    agent.role.trim() && agent.goal.trim() && agent.constraints.trim() &&
    Number(agent.targetValue) > 0 && Number(agent.boundaryValue) > 0
  ), [agent1, agent2]);

  const handleCreate = (event) => {
    event.preventDefault();
    if (!scenarioName.trim() || !scenarioDescription.trim() || !agentReady) {
      window.alert("Please complete the scenario details and all agent fields before creating the scenario.");
      return;
    }

    const makeAgent = (agent, index) => ({
      id: agent.id,
      name: agent.role.trim(),
      role: agent.role.trim(),
      goal: agent.goal.trim(),
      constraints: agent.constraints.trim(),
      personality: agent.personality,
      decisionType: agent.decisionType,
      negotiation: agent.decisionType === "minimize"
        ? { targetValue: Number(agent.targetValue), maximumAcceptable: Number(agent.boundaryValue) }
        : { targetValue: Number(agent.targetValue), minimumAcceptable: Number(agent.boundaryValue) },
      settings: { maxRounds: Number(maxRounds), initialStrategy, environment, showReasoning },
      colorTone: index === 0 ? "blue" : "purple",
    });

    onCreate({
      id: `custom-${Date.now()}`,
      name: scenarioName.trim(),
      description: scenarioDescription.trim(),
      type: "custom",
      negotiationType: scenarioType.toLowerCase(),
      maxRounds: Number(maxRounds),
      initialStrategy,
      environment,
      showReasoning,
      agents: [makeAgent(agent1, 0), makeAgent(agent2, 1)],
    });
  };

  const renderAgentCard = (agent, setter, number, accent) => (
    <div className={`custom-agent-card custom-agent-${accent}`}>
      <div className="custom-agent-card-head">
        <div className="custom-agent-avatar"><span>●</span></div>
        <div><strong>Agent {number}</strong><small>Configure the {number === 1 ? "first" : "second"} negotiating party</small></div>
        <span className="custom-agent-tag">Agent {number}</span>
      </div>

      <div className="custom-agent-fields">
        <label className="custom-field full"><span>Role</span><input value={agent.role} onChange={(e) => updateAgent(setter, "role", e.target.value)} placeholder="e.g. Buyer, Seller, Manager, Client" /></label>
        <label className="custom-field"><span>Goal</span><input value={agent.goal} onChange={(e) => updateAgent(setter, "goal", e.target.value)} placeholder="e.g. Minimize cost, Maximize profit, Get best terms..." /></label>
        <div className="custom-target-group">
          <label className="custom-field"><span>Target Value</span><input type="number" min="0" value={agent.targetValue} onChange={(e) => updateAgent(setter, "targetValue", e.target.value)} placeholder="e.g. 50,000" /></label>
          <select aria-label="Negotiation direction" value={agent.decisionType} onChange={(e) => updateAgent(setter, "decisionType", e.target.value)}>
            <option value="minimize">Minimize</option>
            <option value="maximize">Maximize</option>
          </select>
        </div>
        <label className="custom-field full"><span>Constraints</span><input value={agent.constraints} onChange={(e) => updateAgent(setter, "constraints", e.target.value)} placeholder="e.g. Budget limit, Time constraint, Minimum value..." /></label>
        <div className="custom-field full"><span>Personality</span><div className="custom-personality-select">{PERSONALITIES.map((personality) => <button type="button" key={personality} className={agent.personality === personality ? "selected" : ""} onClick={() => updateAgent(setter, "personality", personality)}><i>{agent.personality === personality ? "✓" : ""}</i>{personality}</button>)}</div></div>
        <label className="custom-field full"><span>{agent.decisionType === "minimize" ? "Maximum Acceptable" : "Minimum Acceptable"}</span><input type="number" min="0" value={agent.boundaryValue} onChange={(e) => updateAgent(setter, "boundaryValue", e.target.value)} placeholder={agent.decisionType === "minimize" ? "Highest value this agent accepts" : "Lowest value this agent accepts"} /></label>
      </div>
    </div>
  );

  return (
    <section className="custom-create-page">
      <div className="custom-create-breadcrumb">WORKSPACE / SCENARIOS / CREATE CUSTOM</div>
      <div className="custom-create-back" onClick={onBack} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onBack()}>← Back to Scenario Library</div>

      <div className="custom-create-hero">
        <div><h1>Create Custom Negotiation</h1><p>Build your own negotiation scenario with custom agents, goals, constraints and personalities.</p></div>
        <div className="custom-create-hero-note"><div className="custom-hero-people"><span>●</span><span>●</span></div><div><strong>Design your scenario</strong><p>Create unique negotiation challenges for personalized learning experiences.</p></div></div>
      </div>

      <form onSubmit={handleCreate}>
        <section className="custom-create-panel">
          <div className="custom-panel-title"><span>♧</span><div><h2>Basic Details</h2></div></div>
          <div className="custom-basic-grid">
            <label className="custom-field"><span>Scenario Name <b>*</b></span><input maxLength={100} value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="e.g. Global Supply Contract Negotiation" /><small>{scenarioName.length}/100</small></label>
            <label className="custom-field"><span>Description</span><textarea maxLength={300} value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="Briefly describe the scenario, objectives and key context..." /><small>{scenarioDescription.length}/300</small></label>
            <label className="custom-field"><span>Scenario Type</span><select value={scenarioType} onChange={(e) => setScenarioType(e.target.value)}>{SCENARIO_TYPES.map((type) => <option key={type}>{type}</option>)}</select><small>Choose a category that best fits your scenario</small></label>
          </div>
        </section>

        <section className="custom-create-panel custom-agents-panel">
          <div className="custom-panel-title"><span>♧</span><div><h2>Configure Agents</h2><p>Add two negotiating parties with their roles, goals, constraints and personalities.</p></div></div>
          <div className="custom-agents-layout">
            {renderAgentCard(agent1, setAgent1, 1, "blue")}
            <div className="custom-vs-badge">VS</div>
            {renderAgentCard(agent2, setAgent2, 2, "purple")}
          </div>
        </section>

        <section className="custom-create-panel custom-settings-panel">
          <div className="custom-panel-title"><span>♧</span><div><h2>Negotiation Settings</h2><p>Configure additional parameters for the negotiation process.</p></div></div>
          <div className="custom-settings-grid">
            <label className="custom-setting"><span>▣</span><div><small>Maximum Rounds</small><input type="number" min="1" max="50" value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)} /></div></label>
            <label className="custom-setting"><span>◎</span><div><small>Initial Offer Strategy</small><select value={initialStrategy} onChange={(e) => setInitialStrategy(e.target.value)}><option>Balanced</option><option>Anchored</option><option>Conservative</option><option>Aggressive</option></select></div></label>
            <label className="custom-setting"><span>◎</span><div><small>Negotiation Environment</small><select value={environment} onChange={(e) => setEnvironment(e.target.value)}><option>Standard</option><option>Competitive</option><option>Collaborative</option><option>Time Pressure</option></select></div></label>
            <label className="custom-reasoning-toggle"><button type="button" aria-pressed={showReasoning} className={showReasoning ? "on" : ""} onClick={() => setShowReasoning((value) => !value)}><span /></button><div><strong>Enable AI Reasoning Display</strong><small>Show agent reasoning in the negotiation arena</small></div></label>
          </div>
        </section>

        <div className="custom-create-actions"><button type="button" className="custom-cancel" onClick={onBack}>Cancel</button><button type="submit" className="custom-create-submit">✣ &nbsp;Create Scenario <span>→</span></button></div>
      </form>
    </section>
  );
}

export default CustomScenario;
