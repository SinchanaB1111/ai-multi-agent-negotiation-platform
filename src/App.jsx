import { useCallback, useEffect, useState } from "react";
import { scenarios } from "./data/scenarios.js";
import ScenarioSelection from "./components/ScenarioSelection";
import ScenarioLibrary from "./components/ScenarioLibrary";
import CustomScenario from "./components/CustomScenario";
import AgentConfiguration from "./components/AgentConfiguration";
import ReadyScreen from "./components/ReadyScreen";
import NegotiationArena from "./components/NegotiationArena";
import PracticeArena from "./components/PracticeArena";
import OutcomeScreen from "./components/OutcomeScreen";
import ReportsAnalytics from "./components/ReportsAnalytics";
import ProfilePage from "./pages/ProfilePage.jsx";
import SessionsPage from "./pages/SessionsPage.jsx";
import { useAuth } from "./context/authContext.js";
import heroImage from "./assets/dashboard-hero.png";
import mountainsImage from "./assets/mountains.png";
import "./App.css";
import {
  getDashboardMetrics,
  formatRelativeTime,
  readDashboardStore,
  recordActivity,
  recordCompletedSession,
  updateDashboardStore,
} from "./logic/dashboardStore.js";

const navItems = [
  { key: "dashboard", icon: "dashboard", label: "Dashboard", description: "Overview & live metrics" },
  { key: "new", icon: "new", label: "New Negotiation", description: "Start a fresh session" },
  { key: "scenarios", icon: "scenarios", label: "Scenario Library", description: "Training situations" },
  { key: "reports", icon: "reports", label: "Reports & Analytics", description: "Performance & negotiation insights" },
  { key: "profile", icon: "profile", label: "Profile", description: "Your profile" },
  { key: "settings", icon: "settings", label: "Settings", description: "Preferences & account" },
];

function MenuIcon({ name, size = 21 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  if (name === "dashboard") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (name === "new") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "sessions") return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>;
  if (name === "reports") return <svg {...common}><path d="M5 3.5h14v17H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === "simulate") return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M8.5 9.2 15.5 12l-7 2.8 1.6-2.8-1.6-2.8Z"/></svg>;
  if (name === "mode-simulate") return <svg {...common} viewBox="0 0 48 36"><g stroke="none" fill="currentColor"><rect x="2" y="7" width="19" height="19" rx="5"/><rect x="27" y="7" width="19" height="19" rx="5"/><rect x="8" y="2" width="7" height="5" rx="2.5"/><rect x="33" y="2" width="7" height="5" rx="2.5"/><circle cx="8" cy="16" r="2.1" fill="#1644b5"/><circle cx="15" cy="16" r="2.1" fill="#1644b5"/><rect x="8" y="20" width="7" height="2.5" rx="1.25" fill="#1644b5"/><circle cx="33" cy="16" r="2.1" fill="#13766f"/><circle cx="40" cy="16" r="2.1" fill="#13766f"/><rect x="33" y="20" width="7" height="2.5" rx="1.25" fill="#13766f"/></g></svg>;
  if (name === "mode-practice") return <svg {...common} viewBox="0 0 36 40"><g fill="currentColor" stroke="none"><circle cx="18" cy="11" r="8"/><path d="M5 37c.7-10 5.1-15 13-15s12.3 5 13 15H5Z"/></g></svg>;
  if (name === "practice") return <svg {...common}><circle cx="9" cy="8" r="3.2"/><path d="M3.8 19.8c.4-3.4 2.2-5.1 5.2-5.1s4.8 1.7 5.2 5.1"/><path d="M16.2 10.3c.6-.4 1.4-.7 2.2-.7 2 0 3.4 1.2 3.7 3.5M16 15.2c1.6.1 2.8 1.2 3.1 3"/></svg>;
  if (name === "scenarios") return <svg {...common}><path d="M4 6.5h6l1.6 2H20a1 1 0 0 1 1 1v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/><path d="M8 13h8M8 16h5"/></svg>;
  if (name === "vendor") return <svg {...common}><path d="M3.5 7h11l1.4 8.5H5z"/><path d="M7 7 8.6 3.5h4L14 7M7 18.5h.01M14 18.5h.01"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="14" cy="18.5" r="1.6"/></svg>;
  if (name === "job") return <svg {...common}><rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M8 7V5.7A1.7 1.7 0 0 1 9.7 4h4.6A1.7 1.7 0 0 1 16 5.7V7M3.5 12h17M10 12v2h4v-2"/></svg>;
  if (name === "budget") return <svg {...common}><circle cx="8" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 18.5c.6-3.2 2.2-5 4.5-5s3.9 1.8 4.5 5M13 18.5c.4-2.4 1.8-3.8 3.9-3.8 1.6 0 2.9.8 3.6 2.4"/></svg>;
  if (name === "analytics") return <svg {...common}><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3 19h18"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .35 2l.05.05-1.9 1.9-.05-.05a1.8 1.8 0 0 0-2-.35 1.8 1.8 0 0 0-1.1 1.65V21h-2.7v-.8A1.8 1.8 0 0 0 11 18.55a1.8 1.8 0 0 0-2 .35l-.05.05-1.9-1.9.05-.05a1.8 1.8 0 0 0 .35-2A1.8 1.8 0 0 0 5.8 13.9H5v-2.7h.8A1.8 1.8 0 0 0 7.45 10a1.8 1.8 0 0 0-.35-2l-.05-.05 1.9-1.9.05.05a1.8 1.8 0 0 0 2 .35A1.8 1.8 0 0 0 12.1 4.8V4h2.7v.8A1.8 1.8 0 0 0 15.9 6.45a1.8 1.8 0 0 0 2-.35l.05-.05 1.9 1.9-.05.05a1.8 1.8 0 0 0-.35 2A1.8 1.8 0 0 0 21.1 11.2h.8v2.7h-.8A1.8 1.8 0 0 0 19.4 15Z"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.4"/><path d="M5 20c.6-3.5 3-5.3 7-5.3s6.4 1.8 7 5.3"/></svg>;
}


function DashboardView({ onStart, onScenario, dashboardStore, profileName }) {
  const metrics = getDashboardMetrics(dashboardStore);
  const recentActivity = dashboardStore.activities.slice(0, 5);

  const scenarioMeta = (scenario, index) => ({
    0: "Amount",
    1: "Salary",
    2: "Budget",
  }[index] || scenario.negotiationType || "Negotiation");

  const activityAction = (activity) => {
    if (activity.type === "completed" && activity.mode === "practice") return () => onStart("practice");
    if (activity.type === "completed") return () => onStart("simulation");
    return () => onStart(activity.mode || "simulation");
  };

  return (
    <section className="command-page dashboard-page redesigned-dashboard">
      <div className="dashboard-top-grid">
        <div className="dashboard-left-stack">
          <section className="welcome-card">
            <div className="welcome-copy">
              <span className="dashboard-kicker">WELCOME BACK</span>
              <h1>{profileName} <span className="wave-emoji">👋</span></h1>
              <p>Sharpen your negotiation skills with AI agents. Choose a mode, explore scenarios, and start your negotiation journey!</p>
              <div className="welcome-actions">
                <button className="welcome-primary" onClick={() => onStart()}>Start New Negotiation <span>→</span></button>
                <button className="welcome-secondary" onClick={() => onScenario("scenarios")}>Explore scenarios</button>
              </div>
            </div>
            <img className="welcome-art" src={heroImage} alt="Two AI negotiators communicating across a negotiation interface" />
          </section>

          <div className="mode-grid">
            <article className="mode-card simulation-card">
              <div className="mode-icon mode-icon-simulation"><MenuIcon name="mode-simulate" size={38} /></div>
              <div className="mode-copy">
                <span className="mode-label">SIMULATION</span>
                <h2>Simulation Mode</h2>
                <p>Watch AI agents negotiate with each other. Observe, analyze, and learn.</p>
                <button onClick={() => onStart("simulation")}>Start Simulation <span>→</span></button>
              </div>
            </article>
            <article className="mode-card practice-card">
              <div className="mode-icon mode-icon-practice"><MenuIcon name="mode-practice" size={38} /></div>
              <div className="mode-copy">
                <span className="mode-label">HUMAN VS AI</span>
                <h2>Practice Mode</h2>
                <p>Step into the negotiation arena yourself. Negotiate against AI agents.</p>
                <button onClick={() => onStart("practice")}>Start Practice <span>→</span></button>
              </div>
            </article>
          </div>

          <section className="panel-block scenarios-panel dashboard-scenarios-full">
            <div className="panel-heading dashboard-section-heading">
              <div><span className="eyebrow">TRAINING LIBRARY</span><h2>Explore Scenarios</h2></div>
              <button className="text-action" onClick={() => onScenario("scenarios")}>View All →</button>
            </div>
            <div className="dashboard-scenario-grid refreshed-scenario-grid">
              {scenarios.slice(0, 3).map((scenario, index) => (
                <button className={`dashboard-scenario scenario-accent-${index + 1}`} key={scenario.id} onClick={() => onScenario(scenario)}>
                  <span className={`scenario-symbol scenario-symbol-${index + 1}`}><MenuIcon name={index === 0 ? "vendor" : index === 1 ? "job" : "budget"} size={22} /></span>
                  <span className="scenario-arrow">→</span>
                  <strong>{scenario.name}</strong>
                  <p>{scenario.description}</p>
                  <span className="scenario-meta"><em>{scenarioMeta(scenario, index)}</em><b>{scenario.agents?.length || 0} Agents</b></span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-right-stack">
          <aside className="progress-card panel-block">
            <div className="progress-card-heading"><h2>Your Progress</h2><span>↗</span></div>
            <div className="progress-grid">
              <div className="progress-stat"><span className="progress-stat-icon">◎</span><strong>{metrics.scenariosCompleted}</strong><small>Scenarios Completed</small></div>
              <div className="progress-stat"><span className="progress-stat-icon warm">★</span><strong>{metrics.practiceSessions}</strong><small>Practice Sessions</small></div>
              <div className="progress-stat"><span className="progress-stat-icon aqua">▮</span><strong>{metrics.scoredSessions ? `${metrics.averageScore}%` : "—"}</strong><small>Avg. Negotiation Score</small></div>
              <div className="progress-stat performance-stat" title={metrics.performanceMeta.description} aria-label={`${metrics.performance}. ${metrics.performanceMeta.description}`}><span className="progress-stat-icon gold">♛</span><strong>{metrics.performance}</strong><small>Overall Performance{metrics.performanceMeta.range ? ` · ${metrics.performanceMeta.range}%` : ""}</small></div>
            </div>
          </aside>

          <aside className="panel-block activity-panel">
            <div className="panel-heading dashboard-section-heading">
              <div><span className="eyebrow">WORKSPACE</span><h2>Recent Activity</h2></div>
              <span className="activity-status-dot" />
            </div>
            <div className="activity-list">
              {recentActivity.length ? recentActivity.map((activity, index) => (
                <button key={activity.id} className="activity-item" onClick={activityAction(activity)}>
                  <span className={`activity-dot activity-dot-${(index % 3) + 1}`} />
                  <span className="activity-copy"><strong>{activity.title}</strong>{activity.mode && <small>{activity.mode === "practice" ? "Practice Mode" : "Simulation Mode"}</small>}</span>
                  <time>{formatRelativeTime(activity.timestamp)}</time>
                </button>
              )) : (
                <div className="activity-empty">
                  <strong>No activity yet</strong>
                  <small>Complete a negotiation and your real session history will appear here.</small>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <section className="quote-banner">
        <img src={mountainsImage} alt="Mountain illustration representing progress and better opportunities" />
      </section>
    </section>
  );
}
function InformationPage({ title, subtitle, type, onStart }) {
  const content = { sessions: ["Your negotiation history", "Review past simulations, practice attempts, outcomes, and performance patterns."], scenarios: ["Scenario library", "Explore vendor pricing, job offer, and project budget negotiations."], reports: ["Reports & analytics", "Completed negotiations will appear here with transcript downloads and concession insights."], settings: ["Workspace settings", "Manage visual preferences and prepare your provider configuration securely on the backend."] }[type];
  return <section className="command-page"><div className="page-heading-row"><div><span className="eyebrow">WORKSPACE / {title.toUpperCase()}</span><h1>{content?.[0] || title}</h1><p>{content?.[1] || subtitle}</p></div><button className="primary-action" onClick={onStart}>＋ New Negotiation →</button></div><div className="empty-workspace panel-block"><div className="empty-orb">✦</div><h2>{type === "settings" ? "Personalize your command center" : "Your workspace is ready"}</h2><p>Use the navigation and start a negotiation to populate this section with live project data.</p><button className="secondary-action" onClick={onStart}>Start a session</button></div></section>;
}

function App() {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState("dashboard");
  const [page, setPage] = useState("dashboard");
  const [mode, setMode] = useState("simulation");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [agents, setAgents] = useState([]);
  const [completedState, setCompletedState] = useState(null);
  const [dashboardStore, setDashboardStore] = useState(() => readDashboardStore());
  // Keep dashboard metrics live when session data changes, including changes
  // made by another browser tab/window.
  useEffect(() => {
    const refreshDashboard = () => setDashboardStore(readDashboardStore());
    window.addEventListener("negosphere-dashboard-updated", refreshDashboard);
    window.addEventListener("negosphere-reports-updated", refreshDashboard);
    window.addEventListener("storage", refreshDashboard);
    return () => {
      window.removeEventListener("negosphere-dashboard-updated", refreshDashboard);
      window.removeEventListener("negosphere-reports-updated", refreshDashboard);
      window.removeEventListener("storage", refreshDashboard);
    };
  }, []);

  const handleScenarioSelect = (scenario) => {
    recordActivity({ type: "started", title: `Started ${scenario.name}`, mode, scenarioName: scenario.name });
    setDashboardStore(readDashboardStore());
    setSelectedScenario(scenario); setAgents(scenario.agents.map((agent) => ({ ...agent, negotiation: { ...agent.negotiation } }))); setPage("new"); setStep("configure"); };
  const handleCustomScenarioCreate = (scenario) => {
    const customAgents = scenario.agents.map((agent) => ({
      ...agent,
      negotiation: { ...agent.negotiation },
    }));
    const readyScenario = {
      ...scenario,
      negotiationType: scenario.negotiationType || "amount",
      libraryType: "Custom",
      maxRounds: Number(scenario.maxRounds) || 10,
      agents: customAgents,
    };
    recordActivity({ type: "started", title: `Created ${readyScenario.name}`, mode, scenarioName: readyScenario.name });
    setDashboardStore(readDashboardStore());
    setSelectedScenario(readyScenario);
    setAgents(customAgents);
    setPage("new");
    setStep("configure");
  };

  const handleAgentChange = (agentId, patch) => setAgents((prev) => prev.map((agent) => agent.id === agentId ? { ...agent, ...patch, negotiation: patch.negotiation ? { ...agent.negotiation, ...patch.negotiation } : agent.negotiation } : agent));
  const restart = () => { setSelectedScenario(null); setAgents([]); setCompletedState(null); setPage("new"); setStep("scenario"); };
  const onBack = () => { setSelectedScenario(null); setAgents([]); setPage("new"); setStep("scenario"); };
  const handleSimulationComplete = useCallback((state) => {
    setCompletedState(state);
    recordCompletedSession(state, "simulation");
    setDashboardStore(readDashboardStore());
  }, []);
  const handlePracticeComplete = useCallback((state) => {
    setCompletedState(state);
    recordCompletedSession(state, "practice");
    setDashboardStore(readDashboardStore());
  }, []);
  const handleSimulationViewOutcome = useCallback((state) => { setCompletedState(state); setPage("reports"); setStep("reports"); }, []);
  const handleReady = () => { const valid = agents.length === 2 && agents.every((a) => a.name?.trim() && a.role?.trim() && a.goal?.trim() && a.constraints?.trim() && Number(a.negotiation?.targetValue) > 0 && ((a.decisionType === "minimize" && Number(a.negotiation?.maximumAcceptable) > 0) || (a.decisionType === "maximize" && Number(a.negotiation?.minimumAcceptable) > 0))); if (!valid) { window.alert("Please complete every agent field and negotiation boundary before continuing."); return; } setPage("new"); setStep("ready"); };
  const openNew = (newMode) => { if (newMode) setMode(newMode); setPage("new"); setStep("scenario"); };
  const navigate = (target) => { if (target === "new") return openNew(); if (target === "dashboard") { setPage("dashboard"); setStep("dashboard"); return; } setPage(target); setStep(target); };

  const renderPage = () => {
    if (step === "dashboard") return <DashboardView dashboardStore={dashboardStore} profileName={dashboardStore.profile?.name || "Negotiator"} onStart={openNew} onScenario={(value) => value === "sessions" ? navigate("sessions") : value?.id ? handleScenarioSelect(value) : navigate("scenarios")} />;
    if (step === "scenarios") return <ScenarioLibrary scenarios={scenarios} onSelect={handleScenarioSelect} onCreateCustom={() => { setPage("custom"); setStep("custom"); }} onBack={() => navigate("dashboard")} />;
    if (step === "custom") return <CustomScenario onBack={() => navigate("scenarios")} onCreate={handleCustomScenarioCreate} />;
    if (step === "scenario") return <ScenarioSelection scenarios={scenarios} mode={mode} onModeChange={setMode} onSelect={handleScenarioSelect} />;
    if (step === "configure") return <AgentConfiguration scenario={selectedScenario} agents={agents} mode={mode} onAgentChange={handleAgentChange} onBack={onBack} onReady={handleReady} />;
    if (step === "ready") return <ReadyScreen scenario={selectedScenario} agents={agents} onRestart={restart} onStartNegotiation={() => { setPage("arena"); setStep("arena"); }} mode={mode} />;
    if (step === "arena") return mode === "practice" ? <PracticeArena scenario={selectedScenario} agents={agents} onExit={() => setStep("ready")} onComplete={handlePracticeComplete} /> : <NegotiationArena scenario={selectedScenario} agents={agents} onExit={() => setStep("ready")} onComplete={handleSimulationComplete} onViewOutcome={handleSimulationViewOutcome} />;
    if (step === "outcome" && completedState) return <OutcomeScreen state={completedState} mode={mode} onNew={restart} onReports={() => { setPage("reports"); setStep("reports"); }} />;
    if (step === "reports") return <ReportsAnalytics store={dashboardStore} onStart={openNew} />;
    if (step === "profile") return <ProfilePage user={user} store={dashboardStore} onNavigate={navigate} onSignOut={signOut} />;
    if (step === "sessions") return <SessionsPage sessions={dashboardStore.sessions || []} onOpen={(session) => {
      if (session?.stateSnapshot) { setCompletedState(session.stateSnapshot); setMode(session.mode || "simulation"); setPage("reports"); setStep("reports"); }
    }} onDelete={(session) => {
      if (!session?.sessionId) return;
      if (!window.confirm("Delete this negotiation from your history?")) return;
      updateDashboardStore((store) => ({ ...store, sessions: (store.sessions || []).filter((item) => item.sessionId !== session.sessionId), activities: (store.activities || []).filter((item) => item.sessionId !== session.sessionId) }));
      setDashboardStore(readDashboardStore());
    }} />;
    if (step === "settings") return <InformationPage type={step} title={step} onStart={openNew} />;
    return <DashboardView dashboardStore={dashboardStore} profileName={dashboardStore.profile?.name || "Negotiator"} onStart={openNew} onScenario={navigate} />;
  };

  const isWorkflow = ["scenario", "configure", "ready", "arena"].includes(step);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleExternalScenario = (event) => {
      const scenario = event.detail;
      if (!scenario?.id) return;
      handleScenarioSelect(scenario);
    };
    const handleExternalCustom = () => {
      setPage("custom");
      setStep("custom");
    };
    window.addEventListener("platform-scenario-request", handleExternalScenario);
    window.addEventListener("platform-custom-scenario-request", handleExternalCustom);
    return () => {
      window.removeEventListener("platform-scenario-request", handleExternalScenario);
      window.removeEventListener("platform-custom-scenario-request", handleExternalCustom);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleMenuSelect = (key) => {
    setMenuOpen(false);
    if (key === "simulate") {
      setMode("simulation");
      openNew();
      return;
    }
    if (key === "practice") {
      setMode("practice");
      openNew();
      return;
    }
    if (key === "reports") {
      navigate("reports");
      return;
    }
    if (key === "settings") {
      window.dispatchEvent(new CustomEvent("platform-open-workspace", { detail: { tab: key } }));
      return;
    }
    if (key === "profile") {
      navigate("profile");
      return;
    }
    navigate(key);
  };

  return (
    <div className={`app-container command-shell ${menuOpen ? "menu-is-open" : ""}`}>
      <div className="ambient-layer" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <header className="main-header command-header revamped-header">
        <div className="header-left-tools">
          <button className="menu-trigger" type="button" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)}>
            <span className="menu-trigger-lines"><i /><i /><i /></span>
            <span>Menu</span>
          </button>
          <div className="brand-section">
            <div className="brand-icon" aria-hidden="true"><span className="brand-orbit">◌</span></div>
            <div className="brand-titles"><h1>NegoSphere</h1><p>Train <b>•</b> Negotiate <b>•</b> Master</p></div>
          </div>
        </div>
        <div className="header-right-group">
          <button className="header-icon-button notification-button" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
          </button>
          <button className="profile-pill profile-button" type="button" aria-label="Open profile" onClick={() => navigate("profile")}>
            <span>{(dashboardStore.profile?.name || "Negotiator").trim().charAt(0).toUpperCase()}</span><strong>{dashboardStore.profile?.name || "Negotiator"}</strong>
          </button>
        </div>

        {menuOpen && (
          <>
            <button className="menu-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />
            <div className="menu-drawer" role="menu">
              <div className="menu-dropdown-head"><div><span className="menu-overline">NEGOTIATION CONTROL</span><h2>Navigate</h2></div><button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>
              <div className="menu-grid">
                {navItems.map((item) => (
                  <button key={item.key} className={`menu-item ${page === item.key ? "active" : ""}`} role="menuitem" onClick={() => handleMenuSelect(item.key)}>
                    <span className="menu-item-icon"><MenuIcon name={item.icon} size={23} /></span>
                    <span className="menu-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                    <span className="menu-item-arrow">›</span>
                  </button>
                ))}
              </div>
              <div className="menu-footer-strip"><span className="online-dot" /> AI negotiation workspace online</div>
            </div>
          </>
        )}
      </header>

      <div className="app-body negosphere-app-body">
        <main className="main-content no-sidebar-content">
        {isWorkflow && (
          <div className="workflow-progress">
            {[["scenario", "Scenario", "Choose context"], ["configure", "Configure", "Build personas"], ["ready", "Review", "Confirm setup"], ["arena", "Arena", "Negotiate"]].map(([key, title, sub], i) => <div key={key} className={`progress-step ${step === key ? "active" : ["configure", "ready", "arena"].includes(step) && i === 0 ? "completed" : ["ready", "arena"].includes(step) && i === 1 ? "completed" : step === "arena" && i === 2 ? "completed" : ""}`}><div className="step-number">{i + 1}</div><div className="step-info"><span className="step-title">{title}</span><span className="step-subtitle">{sub}</span></div>{i < 3 && <div className={`progress-line ${((step === "configure" || step === "ready" || step === "arena") && i === 0) || ((step === "ready" || step === "arena") && i === 1) || (step === "arena" && i === 2) ? "completed" : ""}`} />}</div>)}
          </div>
        )}
        {renderPage()}
        </main>
      </div>
      <footer className="main-footer revamped-footer"><span>NegoSphere</span><span>AI-Driven Multi-Agent Negotiation Training & Simulation Platform</span><span>Milestones 1–3 preserved</span></footer>
    </div>
  );
}
export default App;
