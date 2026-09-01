import { useState } from "react";

import { NegotiationStatus } from "../models/negotiationState";
import { createOffer } from "../models/offer";
import { decideOffer } from "../logic/decisionEngine";
import { calculateConcession } from "../logic/concessionTracker";

function NegotiationArena({
  scenario,
  agents = [],
  negotiationState,
  onComplete,
  onBack,
}) {
  const [offerValue, setOfferValue] = useState("");
  const [decisionResult, setDecisionResult] = useState(null);

  const [state, setState] = useState(() => ({
    ...(negotiationState || {}),

    currentRound: negotiationState?.currentRound || 1,

    currentAgentTurn:
      negotiationState?.currentAgentTurn ||
      agents?.[0]?.id ||
      null,

    previousOffer:
      negotiationState?.previousOffer || null,

    currentOffer:
      negotiationState?.currentOffer || null,

    status:
      negotiationState?.status ||
      NegotiationStatus.NOT_STARTED,

    negotiationHistory:
      negotiationState?.negotiationHistory || [],

    concessions:
      negotiationState?.concessions || [],
  }));

  const currentAgent =
    agents.find(
      (agent) => agent.id === state.currentAgentTurn
    ) || agents[0];

  const isFinished =
    state.status === NegotiationStatus.AGREEMENT ||
    state.status === NegotiationStatus.REJECTED ||
    state.status === NegotiationStatus.DEADLOCK ||
    state.status === NegotiationStatus.COMPLETED;

  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return "None";
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
  };

  const updateNegotiationState = (newState) => {
    setState(newState);

    if (onComplete) {
      onComplete(newState);
    }
  };

  // =====================================
  // MAKE OFFER
  // =====================================

  const handleMakeOffer = () => {
    if (!offerValue || Number(offerValue) <= 0) {
      alert("Please enter a valid offer amount.");
      return;
    }

    if (!currentAgent) {
      alert("Current agent could not be identified.");
      return;
    }

    const amount = Number(offerValue);

    const newOffer = createOffer({
      value: amount,
      terms: {},
      agentId: currentAgent.id,
      round: state.currentRound,
      reason: `${currentAgent.name} made an offer`,
    });

    const receivingAgent = agents.find(
      (agent) => agent.id !== currentAgent.id
    );

    let decision = null;

    if (receivingAgent) {
      decision = decideOffer({
        agent: receivingAgent,
        offerValue: amount,
      });

      setDecisionResult({
        agentName: receivingAgent.name,
        decision: decision.decision,
        reason: decision.reason,
        counteroffer: decision.counteroffer,
      });
    }

    // =====================================
    // CONCESSION TRACKING
    // =====================================

    const previousOfferBySameAgent =
      [...state.negotiationHistory]
        .reverse()
        .find(
          (offer) =>
            offer.agentId === currentAgent.id
        );

    let newConcession = null;

    if (previousOfferBySameAgent) {
      const concession = calculateConcession(
        previousOfferBySameAgent.value,
        amount
      );

      newConcession = {
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        previousValue:
          previousOfferBySameAgent.value,
        currentValue: amount,
        amount: concession.amount,
        direction: concession.direction,
        round: state.currentRound,
      };
    }

    // =====================================
    // NEGOTIATION STATUS
    // =====================================

    let newStatus = NegotiationStatus.IN_PROGRESS;

    if (decision?.decision === "ACCEPT") {
      newStatus = NegotiationStatus.AGREEMENT;
    }

    if (decision?.decision === "REJECT") {
      newStatus = NegotiationStatus.REJECTED;
    }

    const updatedState = {
      ...state,

      status: newStatus,

      previousOffer: state.currentOffer,

      currentOffer: newOffer,

      currentAgentTurn:
        newStatus === NegotiationStatus.IN_PROGRESS
          ? receivingAgent?.id
          : currentAgent.id,

      currentRound:
        newStatus === NegotiationStatus.IN_PROGRESS
          ? state.currentRound + 1
          : state.currentRound,

      negotiationHistory: [
        ...state.negotiationHistory,
        newOffer,
      ],

      concessions: newConcession
        ? [
            ...state.concessions,
            newConcession,
          ]
        : state.concessions,
    };

    updateNegotiationState(updatedState);

    setOfferValue("");
  };

  // =====================================
  // ACCEPT OFFER
  // =====================================

  const handleAccept = () => {
    if (!state.currentOffer) {
      alert("There is no current offer to accept.");
      return;
    }

    const updatedState = {
      ...state,
      status: NegotiationStatus.AGREEMENT,
    };

    setDecisionResult({
      agentName: currentAgent?.name || "Agent",
      decision: "ACCEPT",
      reason:
        "The current offer was accepted and an agreement was reached.",
    });

    updateNegotiationState(updatedState);
  };

  // =====================================
  // REJECT NEGOTIATION
  // =====================================

  const handleReject = () => {
    const updatedState = {
      ...state,
      status: NegotiationStatus.REJECTED,
    };

    updateNegotiationState(updatedState);
  };

  // =====================================
  // DECLARE DEADLOCK
  // =====================================

  const handleDeadlock = () => {
    const updatedState = {
      ...state,
      status: NegotiationStatus.DEADLOCK,
    };

    updateNegotiationState(updatedState);
  };

  // =====================================
  // RESET NEGOTIATION
  // =====================================

  const handleReset = () => {
    const resetState = {
      ...state,

      currentRound: 1,

      currentAgentTurn:
        agents?.[0]?.id || null,

      previousOffer: null,

      currentOffer: null,

      status: NegotiationStatus.NOT_STARTED,

      negotiationHistory: [],

      concessions: [],
    };

    setOfferValue("");
    setDecisionResult(null);

    updateNegotiationState(resetState);
  };

  // =====================================
  // UI
  // =====================================

  return (
    <section className="page negotiation-arena-page">

      {/* HEADER */}

      <div className="ready-hero">

        <div className="ready-badge">
          <span className="ready-badge-dot"></span>
          NEGOTIATION ARENA
        </div>

        <h1>
          {scenario?.name ||
            "AI Negotiation Session"}
        </h1>

        <p>
          {scenario?.description ||
            "Agents negotiate by exchanging offers based on their goals and constraints."}
        </p>

      </div>


      {/* NEGOTIATION STATE */}

      <div className="section-label">
        NEGOTIATION STATE
      </div>

      <div className="ready-scenario-bar">

        <div>
          <span className="ready-scenario-label">
            STATUS
          </span>

          <h2>{state.status}</h2>
        </div>


        <div>
          <span className="ready-scenario-label">
            ROUND
          </span>

          <h2>{state.currentRound}</h2>
        </div>


        <div>
          <span className="ready-scenario-label">
            CURRENT TURN
          </span>

          <h2>
            {currentAgent?.name || "None"}
          </h2>
        </div>


        <div>
          <span className="ready-scenario-label">
            HISTORY
          </span>

          <h2>
            {state.negotiationHistory.length}
          </h2>
        </div>

      </div>


      {/* OFFERS */}

      <div
        className="section-label"
        style={{ marginTop: "35px" }}
      >
        OFFER STATUS
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "20px",
        }}
      >

        <div className="ready-scenario-bar">

          <span className="ready-scenario-label">
            PREVIOUS OFFER
          </span>

          <h2>
            {state.previousOffer
              ? formatCurrency(
                  state.previousOffer.value
                )
              : "None"}
          </h2>

          {state.previousOffer && (
            <p>
              Round {state.previousOffer.round}
            </p>
          )}

        </div>


        <div className="ready-scenario-bar">

          <span className="ready-scenario-label">
            CURRENT OFFER
          </span>

          <h2>
            {state.currentOffer
              ? formatCurrency(
                  state.currentOffer.value
                )
              : "Waiting for offer"}
          </h2>

          {state.currentOffer && (
            <p>
              Round {state.currentOffer.round}
            </p>
          )}

        </div>

      </div>


      {/* MAKE OFFER */}

      {!isFinished && (

        <div
          style={{
            marginTop: "35px",
          }}
        >

          <div className="section-label">
            MAKE OFFER
          </div>

          <div className="ready-scenario-bar">

            <div>

              <span className="ready-scenario-label">
                CURRENT AGENT
              </span>

              <h2>
                {currentAgent?.name}
              </h2>

              <p>
                {currentAgent?.role}
              </p>

            </div>


            <div
              style={{
                flex: 1,
                minWidth: "250px",
              }}
            >

              <input
                type="number"
                value={offerValue}
                placeholder="Enter offer amount"
                onChange={(event) =>
                  setOfferValue(
                    event.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />

            </div>


            <button
              type="button"
              className="start-negotiation-button"
              onClick={handleMakeOffer}
            >
              Make Offer →
            </button>

          </div>


          {/* RESET BUTTON BELOW MAKE OFFER */}

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >

            <button
              type="button"
              className="back-button"
              onClick={handleReset}
            >
              ↻ Reset Negotiation
            </button>

          </div>

        </div>

      )}


      {/* DECISION RESULT */}

      {decisionResult && (

        <div
          className="ready-scenario-bar"
          style={{
            marginTop: "30px",
          }}
        >

          <div>

            <span className="ready-scenario-label">
              RULE-BASED DECISION
            </span>

            <h2>
              {decisionResult.decision}
            </h2>

          </div>


          <div>

            <span className="ready-scenario-label">
              RESPONDING AGENT
            </span>

            <h3>
              {decisionResult.agentName}
            </h3>

          </div>


          <div>

            <span className="ready-scenario-label">
              REASON
            </span>

            <p>
              {decisionResult.reason}
            </p>

          </div>

        </div>

      )}


      {/* MANUAL CONTROLS */}

      {!isFinished && state.currentOffer && (

        <div
          style={{
            marginTop: "30px",
          }}
        >

          <div className="section-label">
            NEGOTIATION CONTROLS
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >

            <button
              type="button"
              className="start-negotiation-button"
              onClick={handleAccept}
            >
              ✓ Accept Current Offer
            </button>


            <button
              type="button"
              className="back-button"
              onClick={handleReject}
            >
              ✕ Reject Negotiation
            </button>


            <button
              type="button"
              className="back-button"
              onClick={handleDeadlock}
            >
              ⚠ Declare Deadlock
            </button>

          </div>

        </div>

      )}


      {/* FINISHED RESULT */}

      {isFinished && (

        <div
          className="ready-scenario-bar"
          style={{
            marginTop: "35px",
          }}
        >

          <div>

            <span className="ready-scenario-label">
              NEGOTIATION RESULT
            </span>

            <h2>
              {state.status}
            </h2>

            <p>
              The negotiation session has ended.
            </p>

          </div>


          <button
            type="button"
            className="start-negotiation-button"
            onClick={handleReset}
          >
            Start New Negotiation
          </button>

        </div>

      )}


      {/* NEGOTIATION HISTORY */}

      <div
        className="section-label"
        style={{ marginTop: "35px" }}
      >
        NEGOTIATION HISTORY
      </div>

      <h2>
        Offer History
      </h2>


      {state.negotiationHistory.length === 0 ? (

        <p>
          No offers have been made yet.
        </p>

      ) : (

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >

          {state.negotiationHistory.map(
            (offer, index) => {

              const agent = agents.find(
                (item) =>
                  item.id === offer.agentId
              );

              return (

                <div
                  className="ready-scenario-bar"
                  key={index}
                >

                  <div>

                    <span className="ready-scenario-label">
                      ROUND
                    </span>

                    <h3>
                      {offer.round}
                    </h3>

                  </div>


                  <div>

                    <span className="ready-scenario-label">
                      AGENT
                    </span>

                    <h3>
                      {agent?.name ||
                        offer.agentId}
                    </h3>

                  </div>


                  <div>

                    <span className="ready-scenario-label">
                      OFFER
                    </span>

                    <h3>
                      {formatCurrency(
                        offer.value
                      )}
                    </h3>

                  </div>


                  <div>

                    <span className="ready-scenario-label">
                      REASON
                    </span>

                    <p>
                      {offer.reason}
                    </p>

                  </div>

                </div>

              );

            }
          )}

        </div>

      )}


      {/* CONCESSION TRACKING */}

      <div
        className="section-label"
        style={{ marginTop: "35px" }}
      >
        CONCESSION TRACKING
      </div>

      <h2>
        Agent Offer Changes
      </h2>


      {state.concessions.length === 0 ? (

        <p>
          No concessions have been made yet.
        </p>

      ) : (

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >

          {state.concessions.map(
            (concession, index) => (

              <div
                className="ready-scenario-bar"
                key={index}
              >

                <div>

                  <span className="ready-scenario-label">
                    AGENT
                  </span>

                  <h3>
                    {concession.agentName}
                  </h3>

                </div>


                <div>

                  <span className="ready-scenario-label">
                    PREVIOUS
                  </span>

                  <h3>
                    {formatCurrency(
                      concession.previousValue
                    )}
                  </h3>

                </div>


                <div>

                  <span className="ready-scenario-label">
                    CURRENT
                  </span>

                  <h3>
                    {formatCurrency(
                      concession.currentValue
                    )}
                  </h3>

                </div>


                <div>

                  <span className="ready-scenario-label">
                    CHANGE
                  </span>

                  <h3>
                    {concession.direction}:{" "}
                    {formatCurrency(
                      concession.amount
                    )}
                  </h3>

                </div>

              </div>

            )
          )}

        </div>

      )}


      {/* BOTTOM ACTION */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "40px",
          marginBottom: "30px",
        }}
      >

        {onBack && (

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>

        )}

      </div>

    </section>
  );
}

export default NegotiationArena;