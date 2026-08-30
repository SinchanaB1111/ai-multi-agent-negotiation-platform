import { useState } from "react";
import { createOffer } from "../models/offer.js";
import { decideOffer } from "../logic/decisionEngine.js";
import { calculateConcession } from "../logic/concessionTracker.js";
import { NegotiationStatus } from "../models/negotiationState.js";

function NegotiationArena({ scenario, agents, negotiationState, onComplete }) {
  const [state, setState] = useState(negotiationState);
  const [offerValue, setOfferValue] = useState("");
  const [decision, setDecision] = useState(null);
  const [concession, setConcession] = useState(null);

  const currentAgent = agents.find(
    (agent) => agent.id === state.currentAgentTurn
  );

  const otherAgent = agents.find(
    (agent) => agent.id !== state.currentAgentTurn
  );

  const makeOffer = () => {
    if (!offerValue || Number(offerValue) <= 0) return;

    const value = Number(offerValue);

    const offer = createOffer({
      value,
      agentId: currentAgent.id,
      round: state.currentRound,
      reason: "Rule-based negotiation offer",
    });

    const updatedState = {
      ...state,
      previousOffer: state.currentOffer,
      currentOffer: offer,
      status: NegotiationStatus.IN_PROGRESS,
      negotiationHistory: [
        ...state.negotiationHistory,
        offer,
      ],
    };

    setState(updatedState);
    setOfferValue("");

    if (otherAgent) {
      const result = decideOffer({
        agent: otherAgent,
        offerValue: value,
      });

      setDecision(result);

      if (state.currentOffer) {
        setConcession(
          calculateConcession(
            state.currentOffer.value,
            value
          )
        );
      }

      if (result.decision === "ACCEPT") {
        setState({
          ...updatedState,
          status: NegotiationStatus.AGREEMENT,
        });
      }
    }
  };

  const nextRound = () => {
    setDecision(null);
    setConcession(null);

    setState((previous) => ({
      ...previous,
      currentRound: previous.currentRound + 1,
      currentAgentTurn: otherAgent?.id || previous.currentAgentTurn,
    }));
  };

  const finishNegotiation = () => {
    const completedState = {
      ...state,
      status: NegotiationStatus.COMPLETED,
    };

    setState(completedState);

    if (onComplete) {
      onComplete(completedState);
    }
  };

  return (
    <section className="page negotiation-arena-page">
      <div className="ready-hero">
        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          NEGOTIATION IN PROGRESS
        </div>

        <h1>{scenario.name}</h1>

        <p>{scenario.description}</p>
      </div>

      <div className="negotiation-state-panel">
        <div className="ready-scenario-label">
          NEGOTIATION STATE
        </div>

        <div className="state-grid">
          <div>
            <span>STATUS</span>
            <strong>{state.status}</strong>
          </div>

          <div>
            <span>ROUND</span>
            <strong>{state.currentRound}</strong>
          </div>

          <div>
            <span>CURRENT TURN</span>
            <strong>{currentAgent?.name}</strong>
          </div>

          <div>
            <span>PREVIOUS OFFER</span>
            <strong>
              {state.previousOffer
                ? `₹${state.previousOffer.value.toLocaleString()}`
                : "None"}
            </strong>
          </div>

          <div>
            <span>CURRENT OFFER</span>
            <strong>
              {state.currentOffer
                ? `₹${state.currentOffer.value.toLocaleString()}`
                : "None"}
            </strong>
          </div>

          <div>
            <span>HISTORY</span>
            <strong>
              {state.negotiationHistory.length} Offers
            </strong>
          </div>
        </div>
      </div>

      <div className="negotiation-arena">
        {agents.map((agent) => (
          <article
            className="negotiation-agent-card"
            key={agent.id}
          >
            <div className="negotiation-card-header">
              <div className="ready-agent-number">
                {agent.id === currentAgent?.id
                  ? "CURRENT AGENT"
                  : "OTHER AGENT"}
              </div>

              <div className="ready-status">
                <span className="ready-status-dot"></span>
                {agent.role}
              </div>
            </div>

            <div className="ready-agent-title">
              <div className="ready-agent-avatar">
                {agent.role.charAt(0)}
              </div>

              <div>
                <h3>{agent.name}</h3>
                <span>{agent.role}</span>
              </div>
            </div>

            <div className="ready-agent-info">
              <div className="ready-info-block">
                <div className="ready-info-text">
                  <strong className="ready-info-label">
                    GOAL:
                  </strong>
                  <p>{agent.goal}</p>
                </div>
              </div>

              <div className="ready-info-block">
                <div className="ready-info-text">
                  <strong className="ready-info-label">
                    CONSTRAINT:
                  </strong>
                  <p>
                    {typeof agent.constraints === "object"
                      ? Object.entries(agent.constraints)
                          .map(
                            ([key, value]) =>
                              `${key}: ₹${value.toLocaleString()}`
                          )
                          .join(", ")
                      : agent.constraints}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {state.status !== NegotiationStatus.AGREEMENT &&
        state.status !== NegotiationStatus.COMPLETED && (
          <div className="negotiation-state-panel">
            <div className="ready-scenario-label">
              MAKE AN OFFER
            </div>

            <div style={{ marginTop: "16px" }}>
              <p>
                <strong>{currentAgent?.name}</strong>'s turn
              </p>

              <input
                type="number"
                placeholder="Enter offer amount"
                value={offerValue}
                onChange={(e) =>
                  setOfferValue(e.target.value)
                }
              />

              <button
                className="back-button"
                onClick={makeOffer}
              >
                Make Offer
              </button>
            </div>
          </div>
        )}

      {decision && (
        <div className="negotiation-state-panel">
          <div className="ready-scenario-label">
            DECISION
          </div>

          <h2>{decision.decision}</h2>

          <p>{decision.reason}</p>

          {decision.counteroffer && (
            <p>
              Counteroffer: ₹
              {decision.counteroffer.toLocaleString()}
            </p>
          )}

          {concession && (
            <p>
              Concession: ₹
              {concession.amount.toLocaleString()} (
              {concession.direction})
            </p>
          )}

          {decision.decision === "ACCEPT" ? (
            <button
              className="back-button"
              onClick={finishNegotiation}
            >
              Complete Negotiation
            </button>
          ) : (
            <button
              className="back-button"
              onClick={nextRound}
            >
              Next Round
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default NegotiationArena;