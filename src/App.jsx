import { useState, useEffect } from "react";
import { scenarios } from "./data/scenarios.js";

import ScenarioSelection from "./components/ScenarioSelection";
import AgentConfiguration from "./components/AgentConfiguration";
import ReadyScreen from "./components/ReadyScreen";

import "./App.css";

function App() {
  const [step, setStep] = useState("scenario");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // Theme state: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario);

    // Create a separate copy of the agents
    setAgents(
      scenario.agents.map((agent) => ({
        ...agent,
      }))
    );

    setStep("configure");
  };

  const handlePersonalityChange = (agentId, personality) => {
    setAgents((previousAgents) =>
      previousAgents.map((agent) =>
        agent.id === agentId
          ? { ...agent, personality }
          : agent
      )
    );
  };

  const handleReady = () => {
    setStep("ready");
  };

  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setAgents([]);
    setStep("scenario");
  };

  const restart = () => {
    setSelectedScenario(null);
    setAgents([]);
    setStep("scenario");
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="brand-section">
          <div className="brand-icon">N</div>

          <div className="brand-titles">
            <h1>Negotiation AI</h1>
            <p>Multi-Agent Training & Simulation Platform</p>
          </div>
        </div>

        <div className="header-right-group">
          <div className="header-status">
            {selectedScenario ? (
              <>
                <span className="status-dot"></span>
                <span>{selectedScenario.name}</span>
              </>
            ) : (
              <span>Milestone 1</span>
            )}
          </div>

          {/* Minimalist Theme Toggle Button */}
          <button
            type="button"
            className="theme-toggle-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? (
              /* Sun Icon for switching to light */
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon Icon for switching to dark */
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="workflow-progress">
          <div
            className={`progress-step ${
              step === "scenario" ? "active" : "completed"
            }`}
          >
            <div className="step-number">1</div>
            <div className="step-info">
              <span className="step-title">Scenario</span>
              <span className="step-subtitle">Choose context</span>
            </div>
          </div>

          <div
            className={`progress-line ${
              step === "configure" || step === "ready"
                ? "completed"
                : ""
            }`}
          ></div>

          <div
            className={`progress-step ${
              step === "configure"
                ? "active"
                : step === "ready"
                ? "completed"
                : ""
            }`}
          >
            <div className="step-number">2</div>
            <div className="step-info">
              <span className="step-title">Configure</span>
              <span className="step-subtitle">Set agent personas</span>
            </div>
          </div>

          <div
            className={`progress-line ${
              step === "ready" ? "completed" : ""
            }`}
          ></div>

          <div
            className={`progress-step ${
              step === "ready" ? "active" : ""
            }`}
          >
            <div className="step-number">3</div>
            <div className="step-info">
              <span className="step-title">Ready</span>
              <span className="step-subtitle">Review setup</span>
            </div>
          </div>
        </div>

        {step === "scenario" && (
          <ScenarioSelection
            scenarios={scenarios}
            onSelect={handleScenarioSelect}
          />
        )}

        {step === "configure" && (
          <AgentConfiguration
            scenario={selectedScenario}
            agents={agents}
            onPersonalityChange={handlePersonalityChange}
            onBack={handleBackToScenarios}
            onReady={handleReady}
          />
        )}

        {step === "ready" && (
          <ReadyScreen
            scenario={selectedScenario}
            agents={agents}
            onRestart={restart}
          />
        )}
      </main>

      <footer className="main-footer">
        <span>AI-Driven Multi-Agent Negotiation Platform</span>
      </footer>
    </div>
  );
}

export default App;