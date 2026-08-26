import React from "react";

function ReadyScreen({ scenario, agents, onRestart }) {
  const agent1 = agents[0];
  const agent2 = agents[1];

  return (
    <section className="page ready-screen">
      <div className="ready-hero">
        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          AGENTS CONFIGURED
        </div>

        <h1>Negotiation Setup Complete</h1>

        <p>
          Both AI agents are configured and ready to begin the negotiation.
        </p>
      </div>

      <div className="ready-scenario-bar">
        <div className="ready-scenario-label">
          SELECTED NEGOTIATION SCENARIO
        </div>

        <h2>{scenario.name}</h2>

        <p>{scenario.description}</p>
      </div>

      <div className="negotiation-arena">
        {/* Agent 1 */}
        {agent1 && (
          <article className="negotiation-agent-card">
            <div className="negotiation-card-header">
              <div className="ready-agent-number">AGENT 01</div>

              <div className="ready-status">
                <span className="ready-status-dot"></span>
                Ready
              </div>
            </div>

            <div className="ready-agent-title">
              <div className="ready-agent-avatar">
                {agent1.role.charAt(0)}
              </div>

              <div>
                <h3>{agent1.name}</h3>
                <span>{agent1.role}</span>
              </div>
            </div>

            <div className="ready-agent-info">
              <div className="ready-info-block">
                <div className="ready-info-icon">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>

                <div className="ready-info-text">
                  <strong className="ready-info-label">GOAL:</strong>
                  <p>{agent1.goal}</p>
                </div>
              </div>

              <div className="ready-info-block">
                <div className="ready-info-icon">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                <div className="ready-info-text">
                  <strong className="ready-info-label">CONSTRAINT:</strong>
                  <p>{agent1.constraints}</p>
                </div>
              </div>
            </div>

            <div className="ready-personality">
              <span className="personality-label">PERSONALITY:</span>

              <div className="personality-display">
                <span className="personality-display-dot"></span>
                <strong>{agent1.personality}</strong>
              </div>
            </div>
          </article>
        )}

        {/* Professional Exchange Bridge Indicator */}
        <div className="negotiation-bridge-container">
          <div className="bridge-line"></div>
          <div className="bridge-icon-box" title="Negotiation Exchange Channel">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 16V4M7 4L3 8M7 4L11 8" />
              <path d="M17 8V20M17 20L21 16M17 20L13 16" />
            </svg>
          </div>
          <div className="bridge-line"></div>
        </div>

        {/* Agent 2 */}
        {agent2 && (
          <article className="negotiation-agent-card">
            <div className="negotiation-card-header">
              <div className="ready-agent-number">AGENT 02</div>

              <div className="ready-status">
                <span className="ready-status-dot"></span>
                Ready
              </div>
            </div>

            <div className="ready-agent-title">
              <div className="ready-agent-avatar">
                {agent2.role.charAt(0)}
              </div>

              <div>
                <h3>{agent2.name}</h3>
                <span>{agent2.role}</span>
              </div>
            </div>

            <div className="ready-agent-info">
              <div className="ready-info-block">
                <div className="ready-info-icon">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>

                <div className="ready-info-text">
                  <strong className="ready-info-label">GOAL:</strong>
                  <p>{agent2.goal}</p>
                </div>
              </div>

              <div className="ready-info-block">
                <div className="ready-info-icon">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                <div className="ready-info-text">
                  <strong className="ready-info-label">CONSTRAINT:</strong>
                  <p>{agent2.constraints}</p>
                </div>
              </div>
            </div>

            <div className="ready-personality">
              <span className="personality-label">PERSONALITY:</span>

              <div className="personality-display">
                <span className="personality-display-dot"></span>
                <strong>{agent2.personality}</strong>
              </div>
            </div>
          </article>
        )}
      </div>

      <div className="ready-confirmation">
        <div className="confirmation-icon">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <strong>Negotiation environment is ready</strong>
          <p>
            Scenario, agent roles, goals, constraints, and personalities have
            been configured successfully.
          </p>
        </div>
      </div>

      <div className="ready-actions">
        <button className="restart-button" onClick={onRestart}>
          ← Configure Another Scenario
        </button>

        <button
          className="start-negotiation-button"
          onClick={() =>
            alert(
              "Negotiation engine will be implemented in the next milestone."
            )
          }
        >
          <span>Start Negotiation</span>
          <span>→</span>
        </button>
      </div>

      <p className="milestone-note">
        AI/LLM-based offer generation and negotiation logic will be integrated
        in a future milestone.
      </p>
    </section>
  );
}

export default ReadyScreen;