import { useState, useEffect } from "react";

import { scenarios } from "./data/scenarios.js";
import { createNegotiationState } from "./models/negotiationState.js";

import ScenarioSelection from "./components/ScenarioSelection";
import ConfigurationChoice from "./components/ConfigurationChoice";
import AgentConfiguration from "./components/AgentConfiguration";
import ReadyScreen from "./components/ReadyScreen";
import NegotiationArena from "./components/NegotiationArena";

import "./App.css";


function App() {
  // ================= STATE =================

  const [step, setStep] = useState("scenario");

  const [selectedScenario, setSelectedScenario] =
    useState(null);

  const [agents, setAgents] = useState([]);

  const [negotiationState, setNegotiationState] =
    useState(null);


  // ================= THEME =================

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "dark";
  });


  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem("app-theme", theme);
  }, [theme]);


  const toggleTheme = () => {
    setTheme((previousTheme) =>
      previousTheme === "dark"
        ? "light"
        : "dark"
    );
  };


  // ================= SCENARIO SELECTION =================

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario);

    setAgents(
      scenario.agents.map((agent) => ({
        ...agent,
      }))
    );

    // Go to predefined/custom choice
    setStep("configuration-choice");
  };


  // ================= PREDEFINED CONFIGURATION =================

  const handlePredefinedConfiguration = () => {
    if (!selectedScenario) return;

    setAgents(
      selectedScenario.agents.map((agent) => ({
        ...agent,
      }))
    );

    setSelectedScenario({
      ...selectedScenario,
      type: "predefined",
    });

    setStep("configure");
  };


  // ================= CUSTOM CONFIGURATION =================

  const handleCustomConfiguration = () => {
    if (!selectedScenario) return;

    setAgents(
      selectedScenario.agents.map((agent) => ({
        ...agent,
      }))
    );

    setSelectedScenario({
      ...selectedScenario,
      type: "custom",
    });

    setStep("configure");
  };


  // ================= PERSONALITY =================

  const handlePersonalityChange = (
    agentId,
    personality
  ) => {
    setAgents((previousAgents) =>
      previousAgents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              personality,
            }
          : agent
      )
    );
  };


  // ================= CUSTOM AGENT UPDATE =================

  const handleAgentChange = (
    agentId,
    field,
    value
  ) => {
    setAgents((previousAgents) =>
      previousAgents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              [field]: value,
            }
          : agent
      )
    );
  };


  // ================= READY =================

  const handleReady = () => {
    const state = createNegotiationState(
      selectedScenario,
      agents
    );

    setNegotiationState(state);

    setStep("ready");
  };


  // ================= START NEGOTIATION =================

  const handleStartNegotiation = () => {
    const state =
      negotiationState ||
      createNegotiationState(
        selectedScenario,
        agents
      );

    setNegotiationState(state);

    setStep("negotiation");
  };


  // ================= BACK TO CONFIGURATION CHOICE =================

  const handleBackToConfigurationChoice = () => {
    setStep("configuration-choice");
  };


  // ================= BACK TO SCENARIOS =================

  const handleBackToScenarios = () => {
    setSelectedScenario(null);

    setAgents([]);

    setNegotiationState(null);

    setStep("scenario");
  };


  // ================= RESTART =================

  const restart = () => {
    setSelectedScenario(null);

    setAgents([]);

    setNegotiationState(null);

    setStep("scenario");
  };


  // ================= UI =================

  return (
    <div className="app-container">

      {/* ================= HEADER ================= */}

      <header className="main-header">

        <div className="brand-section">

          <div className="brand-icon">
            N
          </div>

          <div className="brand-titles">

            <h1>Negotiation AI</h1>

            <p>
              Multi-Agent Training & Simulation Platform
            </p>

          </div>

        </div>


        <div className="header-right-group">

          <div className="header-status">

            {selectedScenario ? (
              <>

                <span className="status-dot"></span>

                <span>
                  {selectedScenario.name}
                </span>

              </>
            ) : (

              <span>Milestone 1</span>

            )}

          </div>


          <button
            type="button"
            className="theme-toggle-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${
              theme === "dark"
                ? "light"
                : "dark"
            } theme`}
          >

            {theme === "dark" ? "☀" : "☾"}

          </button>

        </div>

      </header>


      {/* ================= MAIN ================= */}

      <main className="main-content">


        {/* ================= PROGRESS ================= */}
<div className="workflow-progress">

  {/* ================= STEP 1 ================= */}

  <div
    className={`progress-step ${
      step === "scenario"
        ? "active"
        : "completed"
    }`}
  >
    <div className="step-number">
      1
    </div>

    <div className="step-info">

      <span className="step-title">
        Scenario
      </span>

      <span className="step-subtitle">
        Choose negotiation context
      </span>

    </div>
  </div>


  {/* ================= LINE 1 ================= */}

  <div
    className={`progress-line ${
      step === "configuration-choice" ||
      step === "configure" ||
      step === "ready" ||
      step === "negotiation"
        ? "completed"
        : ""
    }`}
  />


  {/* ================= STEP 2 ================= */}

  <div
    className={`progress-step ${
      step === "configuration-choice" ||
      step === "configure"
        ? "active"
        : step === "ready" ||
          step === "negotiation"
        ? "completed"
        : ""
    }`}
  >
    <div className="step-number">
      2
    </div>

    <div className="step-info">

      <span className="step-title">
        Configure
      </span>

      <span className="step-subtitle">
        Set up predefined or custom agents
      </span>

    </div>
  </div>


  {/* ================= LINE 2 ================= */}

  <div
    className={`progress-line ${
      step === "ready" ||
      step === "negotiation"
        ? "completed"
        : ""
    }`}
  />


  {/* ================= STEP 3 ================= */}

  <div
    className={`progress-step ${
      step === "ready"
        ? "active"
        : step === "negotiation"
        ? "completed"
        : ""
    }`}
  >
    <div className="step-number">
      3
    </div>

    <div className="step-info">

      <span className="step-title">
        Ready
      </span>

      <span className="step-subtitle">
        Review setup and start negotiation
      </span>

    </div>
  </div>

</div>


        {/* ================= SCENARIO ================= */}

        {step === "scenario" && (

          <ScenarioSelection
            scenarios={scenarios}
            onSelect={handleScenarioSelect}
          />

        )}


        {/* ================= CONFIGURATION CHOICE ================= */}

        {step === "configuration-choice" && (

          <ConfigurationChoice
            scenario={selectedScenario}
            onPredefined={
              handlePredefinedConfiguration
            }
            onCustom={
              handleCustomConfiguration
            }
            onBack={handleBackToScenarios}
          />

        )}


        {/* ================= AGENT CONFIGURATION ================= */}

        {step === "configure" && (

          <AgentConfiguration
            scenario={selectedScenario}
            agents={agents}
            onPersonalityChange={
              handlePersonalityChange
            }
            onAgentChange={
              handleAgentChange
            }
            onBack={
              handleBackToConfigurationChoice
            }
            onReady={handleReady}
          />

        )}


        {/* ================= READY ================= */}

        {step === "ready" && (

          <ReadyScreen
            scenario={selectedScenario}
            agents={agents}
            negotiationState={
              negotiationState
            }
            onRestart={restart}
            onStartNegotiation={
              handleStartNegotiation
            }
          />

        )}


        {/* ================= NEGOTIATION ================= */}

        {step === "negotiation" &&
          negotiationState && (

            <NegotiationArena
              scenario={selectedScenario}
              agents={agents}
              negotiationState={
                negotiationState
              }
              onComplete={(finalState) => {
                setNegotiationState(
                  finalState
                );
              }}
            />

          )}

      </main>


      {/* ================= FOOTER ================= */}

      <footer className="main-footer">

        <span>
          AI-Driven Multi-Agent Negotiation Platform
        </span>

      </footer>

    </div>
  );
}


export default App;