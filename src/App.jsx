import { useCallback, useEffect, useState } from "react";
import { scenarios } from "./data/scenarios.js";
import ScenarioSelection from "./components/ScenarioSelection";
import AgentConfiguration from "./components/AgentConfiguration";
import ReadyScreen from "./components/ReadyScreen";
import NegotiationArena from "./components/NegotiationArena";
import PracticeArena from "./components/PracticeArena";
import OutcomeScreen from "./components/OutcomeScreen";
import "./App.css";

const navItems = [
  ["dashboard", "⌂", "Dashboard"],
  ["new", "+", "New Negotiation"],
  ["sessions", "◷", "My Sessions"],
  ["scenarios", "▦", "Scenarios"],
  ["reports", "▤", "Reports"],
  ["settings", "⚙", "Settings"],
];

function DashboardView({ onStart, onScenario }) {
  return (
    <section className="command-page dashboard-page">
      <div className="page-heading-row">
        <div><span className="eyebrow">OVERVIEW / WORKSPACE</span><h1>Good evening, Vinod.</h1><p>Sharpen your negotiation skills with intelligent agents, realistic scenarios, and measurable outcomes.</p></div>
        <button className="primary-action" onClick={onStart}>＋ Start New Negotiation <span>→</span></button>
      </div>
      <div className="metric-grid">
        {[["◈", "Total Sessions", "12", "+20%", "vs last 7 days"], ["✦", "Successful Agreements", "8", "+33%", "vs last 7 days"], ["◷", "Avg. Rounds / Session", "4.6", "−15%", "vs last 7 days"], ["✧", "Performance Score", "78%", "+12%", "vs last 7 days"]].map(([icon, label, value, change, note]) => <article className="metric-card" key={label}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><b>{change}</b><small>{note}</small></article>)}
      </div>
      <div className="dashboard-layout">
        <div className="panel-block scenario-panel"><div className="panel-heading"><div><span className="eyebrow">START FROM A TEMPLATE</span><h2>Choose a scenario</h2></div><button className="text-action" onClick={onScenario}>View all →</button></div><p className="panel-description">Select a pre-built scenario and configure your negotiating agents.</p><div className="dashboard-scenario-grid">{scenarios.map((scenario) => <button className="dashboard-scenario" key={scenario.id} onClick={() => onScenario(scenario)}><span className="scenario-symbol">{scenario.name.includes("Job") ? "▣" : scenario.name.includes("Project") ? "⌘" : "◇"}</span><strong>{scenario.name}</strong><p>{scenario.description}</p><span className="scenario-link">Configure →</span></button>)}</div></div>
        <aside className="dashboard-side"><div className="panel-block live-panel"><div className="panel-heading"><h2>Live negotiation</h2><span className="live-badge"><i /> Ready</span></div><div className="versus-row"><div><span className="agent-orb buyer">B</span><strong>Buyer Agent</strong><small>Cost Optimizer</small></div><span className="vs-pill">VS</span><div><span className="agent-orb vendor">V</span><strong>Vendor Agent</strong><small>Profit Maximizer</small></div></div><div className="progress-pair"><div><span>Buyer stance</span><b>72%</b><i><em style={{ width: "72%" }} /></i></div><div><span>Vendor stance</span><b>64%</b><i><em style={{ width: "64%" }} /></i></div></div><button className="secondary-action" onClick={onStart}>Open Negotiation Arena →</button></div><div className="panel-block tips-panel"><div className="panel-heading"><h2>Quick insights</h2><span>✦</span></div>{["Start with a clear goal and BATNA.", "Look for win-win opportunities.", "Use data and value-based arguments."].map((tip) => <p key={tip}><span>✓</span>{tip}</p>)}</div></aside>
      </div>
      <div className="panel-block recent-panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVITY</span><h2>Recent sessions</h2></div><button className="text-action" onClick={() => onScenario("sessions")}>View all →</button></div><div className="session-table"><div className="session-row session-head"><span>Date & Time</span><span>Scenario</span><span>Mode</span><span>Outcome</span><span>Status</span></div>{[["Sep 17, 2026", "Vendor Pricing", "Simulation", "Agreement", "Completed"], ["Sep 16, 2026", "Job Offer", "Practice", "Counter Offer", "Completed"], ["Sep 15, 2026", "Project Budget", "Simulation", "Agreement", "Completed"], ["Sep 14, 2026", "Vendor Pricing", "Practice", "No Agreement", "Completed"]].map((row) => <div className="session-row" key={row[0]}>{row.map((item, index) => <span key={`${row[0]}-${index}`} className={index === 2 ? "table-chip mode-chip" : index === 3 ? "table-chip outcome-chip" : ""}>{item}</span>)}</div>)}</div></div>
    </section>
  );
}

function InformationPage({ title, subtitle, type, onStart }) {
  const content = { sessions: ["Your negotiation history", "Review past simulations, practice attempts, outcomes, and performance patterns."], scenarios: ["Scenario library", "Explore vendor pricing, job offer, and project budget negotiations."], reports: ["Reports & analytics", "Completed negotiations will appear here with transcript downloads and concession insights."], settings: ["Workspace settings", "Manage visual preferences and prepare your provider configuration securely on the backend."] }[type];
  return <section className="command-page"><div className="page-heading-row"><div><span className="eyebrow">WORKSPACE / {title.toUpperCase()}</span><h1>{content?.[0] || title}</h1><p>{content?.[1] || subtitle}</p></div><button className="primary-action" onClick={onStart}>＋ New Negotiation →</button></div><div className="empty-workspace panel-block"><div className="empty-orb">✦</div><h2>{type === "settings" ? "Personalize your command center" : "Your workspace is ready"}</h2><p>Use the navigation and start a negotiation to populate this section with live project data.</p><button className="secondary-action" onClick={onStart}>Start a session</button></div></section>;
}

function App() {
  const [step, setStep] = useState("dashboard");
  const [page, setPage] = useState("dashboard");
  const [mode, setMode] = useState("simulation");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [agents, setAgents] = useState([]);
  const [completedState, setCompletedState] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "dark");

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("app-theme", theme); }, [theme]);

  const handleScenarioSelect = (scenario) => { setSelectedScenario(scenario); setAgents(scenario.agents.map((agent) => ({ ...agent, negotiation: { ...agent.negotiation } }))); setPage("new"); setStep("configure"); };
  const handleAgentChange = (agentId, patch) => setAgents((prev) => prev.map((agent) => agent.id === agentId ? { ...agent, ...patch, negotiation: patch.negotiation ? { ...agent.negotiation, ...patch.negotiation } : agent.negotiation } : agent));
  const restart = () => { setSelectedScenario(null); setAgents([]); setCompletedState(null); setPage("new"); setStep("scenario"); };
  const onBack = () => { setSelectedScenario(null); setAgents([]); setPage("new"); setStep("scenario"); };
  const handleSimulationComplete = useCallback((state) => setCompletedState(state), []);
  const handleSimulationViewOutcome = useCallback((state) => { setCompletedState(state); setPage("reports"); setStep("outcome"); }, []);
  const handleReady = () => { const valid = agents.length === 2 && agents.every((a) => a.name?.trim() && a.role?.trim() && a.goal?.trim() && a.constraints?.trim() && Number(a.negotiation?.targetValue) > 0 && ((a.decisionType === "minimize" && Number(a.negotiation?.maximumAcceptable) > 0) || (a.decisionType === "maximize" && Number(a.negotiation?.minimumAcceptable) > 0))); if (!valid) { window.alert("Please complete every agent field and negotiation boundary before continuing."); return; } setPage("new"); setStep("ready"); };
  const openNew = () => { setPage("new"); setStep("scenario"); };
  const navigate = (target) => { if (target === "new") return openNew(); if (target === "dashboard") { setPage("dashboard"); setStep("dashboard"); return; } setPage(target); setStep(target); };

  const renderPage = () => {
    if (step === "dashboard") return <DashboardView onStart={openNew} onScenario={(value) => value === "sessions" ? navigate("sessions") : value?.id ? handleScenarioSelect(value) : navigate("scenarios")} />;
    if (step === "scenario") return <ScenarioSelection scenarios={scenarios} mode={mode} onModeChange={setMode} onSelect={handleScenarioSelect} />;
    if (step === "configure") return <AgentConfiguration scenario={selectedScenario} agents={agents} mode={mode} onAgentChange={handleAgentChange} onBack={onBack} onReady={handleReady} />;
    if (step === "ready") return <ReadyScreen scenario={selectedScenario} agents={agents} onRestart={restart} onStartNegotiation={() => { setPage("arena"); setStep("arena"); }} mode={mode} />;
    if (step === "arena") return mode === "practice" ? <PracticeArena scenario={selectedScenario} agents={agents} onExit={() => setStep("ready")} /> : <NegotiationArena scenario={selectedScenario} agents={agents} onExit={() => setStep("ready")} onComplete={handleSimulationComplete} onViewOutcome={handleSimulationViewOutcome} />;
    if (step === "outcome" && completedState) return <OutcomeScreen state={completedState} mode={mode} onNew={restart} />;
    if (["sessions", "scenarios", "reports", "settings"].includes(step)) return <InformationPage type={step} title={step} onStart={openNew} />;
    return <DashboardView onStart={openNew} onScenario={navigate} />;
  };

  const isWorkflow = ["scenario", "configure", "ready", "arena"].includes(step);
  return <div className="app-container command-shell"><div className="ambient-layer" aria-hidden="true"><span /><span /><span /><span /><span /></div><header className="main-header command-header"><div className="brand-section"><div className="brand-icon">✦</div><div className="brand-titles"><h1>AI Negotiation Platform</h1><p>Practice <b>•</b> Learn <b>•</b> Excel</p></div></div><div className="header-right-group"><span className="header-health"><i /> System operational</span><button className="theme-toggle-button" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? "☼" : "☾"}</button><div className="profile-pill"><span>VM</span> Vinod <small>⌄</small></div></div></header><div className="app-body"><aside className="side-navigation"><div className="side-label">WORKSPACE</div>{navItems.map(([key, icon, label]) => <button key={key} className={`nav-item ${page === key ? "active" : ""}`} onClick={() => navigate(key)}><span>{icon}</span>{label}</button>)}<div className="sidebar-spacer" /><div className="upgrade-card"><strong>✦ Upgrade to Pro</strong><p>Unlock advanced scenarios, more LLM models, and detailed analytics.</p><button onClick={() => navigate("settings")}>Explore</button></div><div className="sidebar-footer"><span className="online-dot" /> All systems operational</div></aside><main className="main-content">{isWorkflow && <div className="workflow-progress">{[["scenario", "Scenario", "Choose context"], ["configure", "Configure", "Build personas"], ["ready", "Review", "Confirm setup"], ["arena", "Arena", "Negotiate"]].map(([key, title, sub], i) => <div key={key} className={`progress-step ${step === key ? "active" : ["configure", "ready", "arena"].includes(step) && i === 0 ? "completed" : ["ready", "arena"].includes(step) && i === 1 ? "completed" : step === "arena" && i === 2 ? "completed" : ""}`}><div className="step-number">{i + 1}</div><div className="step-info"><span className="step-title">{title}</span><span className="step-subtitle">{sub}</span></div>{i < 3 && <div className={`progress-line ${((step === "configure" || step === "ready" || step === "arena") && i === 0) || ((step === "ready" || step === "arena") && i === 1) || (step === "arena" && i === 2) ? "completed" : ""}`} />}</div>)}</div>}{renderPage()}</main></div><footer className="main-footer"><span>AI-Driven Multi-Agent Negotiation Platform</span><span>Milestones 1–3 preserved • Milestone 4 workspace</span></footer></div>;
}
export default App;
