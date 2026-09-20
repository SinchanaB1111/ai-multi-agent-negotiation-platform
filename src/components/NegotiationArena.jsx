import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createNegotiation,
} from "../logic/negotiationEngine";

import {
  runAutomaticNegotiation,
} from "../logic/orchestrator.js";

import {
  getPersonalityPolicy,
} from "../logic/personalityPolicy.js";

import "./NegotiationArena.css";

function NegotiationArena({
  scenario,
  agents,
  onExit,
  onComplete,
  onViewOutcome,
}) {
  const [
    state,
    setState,
  ] = useState(() =>
    createNegotiation(
      scenario,
      agents
    )
  );

  const [
    message,
    setMessage,
  ] = useState(
    "🤖 Negotiation is preparing..."
  );

  const [
    isNegotiating,
    setIsNegotiating,
  ] = useState(false);

 const negotiationStartedRef = useRef(null);

  const [
    negotiationRun,
    setNegotiationRun,
  ] = useState(0);

  const [
    isReplayOpen,
    setIsReplayOpen,
  ] = useState(false);

  const [
    replayIndex,
    setReplayIndex,
  ] = useState(0);

  // =====================================================
  // AGENTS
  // =====================================================

  const currentAgent =
    state.agents?.find(
      (agent) =>
        agent.id ===
        state.currentAgentTurn
    );

  const totalOffers =
    state.offers?.length || 0;

  const totalDecisions =
    state.decisions?.length || 0;

  const totalConcessions =
    state.concessions?.length || 0;

  const geminiCallsUsed =
    state.geminiCallsUsed || 0;

  const isUsingFallback =
    state.usingFallback === true;

  // =====================================================
  // MONEY
  // =====================================================

  const formatMoney = (
    value
  ) => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(
        Number(value)
      )
    ) {
      return "—";
    }

    return `₹${Number(
      value
    ).toLocaleString(
      "en-IN"
    )}`;
  };

  // =====================================================
  // AGENT OFFER COUNT
  // =====================================================

  const getAgentOfferCount = (
    agentId
  ) =>
    (
      state.offers || []
    ).filter(
      (offer) =>
        offer.agentId ===
        agentId
    ).length;

  // =====================================================
  // AGENT CONCESSION
  // =====================================================

  const getAgentConcessionAmount = (
    agentId
  ) =>
    (
      state.concessions || []
    )
      .filter(
        (concession) =>
          concession.agentId ===
          agentId
      )
      .reduce(
        (
          total,
          concession
        ) =>
          total +
          Number(
            concession.change ||
              0
          ),
        0
      );

  // =====================================================
  // GOAL ACHIEVEMENT
  // =====================================================

  const getGoalAchievement = (
    agent
  ) => {
    if (
      !state.agreement?.offer ||
      !agent?.negotiation
    ) {
      return null;
    }

    const value =
      state.agreement.offer
        .value;

    const target =
      agent.negotiation
        .targetValue;

    if (
      agent.decisionType ===
      "minimize"
    ) {
      if (
        value <= target
      ) {
        return 100;
      }

      const max =
        agent.negotiation
          .maximumAcceptable;

      return Math.max(
        0,
        Math.min(
          100,
          100 -
            (
              (
                value -
                target
              ) /
              Math.max(
                1,
                max -
                  target
              )
            ) *
              100
        )
      );
    }

    if (
      value >= target
    ) {
      return 100;
    }

    const min =
      agent.negotiation
        .minimumAcceptable;

    return Math.max(
      0,
      Math.min(
        100,
        100 -
          (
            (
              target -
              value
            ) /
            Math.max(
              1,
              target -
                min
            )
          ) *
            100
      )
    );
  };

  // =====================================================
  // NEGOTIATION SCORE
  // =====================================================

  const calculateNegotiationScore =
    () => {
      if (
        state.status ===
        "NOT_STARTED"
      ) {
        return 0;
      }

      const outcome =
        state.status ===
        "AGREEMENT"
          ? 40
          : state.status ===
            "DEADLOCK"
          ? 20
          : state.status ===
            "REJECTED"
          ? 10
          : 25;

      const goals =
        state.agreement?.offer
          ? state.agents
              .map(
                getGoalAchievement
              )
              .filter(
                (value) =>
                  value !== null
              )
          : [];

      const goalScore =
        goals.length
          ? Math.round(
              (
                goals.reduce(
                  (
                    a,
                    b
                  ) =>
                    a + b,
                  0
                ) /
                goals.length
              ) *
                0.3
            )
          : 0;

      const constraintScore =
        state.agreement?.offer
          ? 20
          : 10;

      const efficiencyScore =
        Math.max(
          0,
          10 -
            Math.max(
              0,
              totalOffers -
                4
            )
        );

      return Math.min(
        100,
        Math.round(
          outcome +
            goalScore +
            constraintScore +
            efficiencyScore
        )
      );
    };

  const negotiationScore =
    calculateNegotiationScore();

  // =====================================================
  // NEGOTIATION HEALTH
  // =====================================================

  const getHealth = () => {
    if (
      state.status ===
      "AGREEMENT"
    ) {
      return {
        label: "Excellent",
        score: 100,
      };
    }

    if (
      state.status ===
      "REJECTED"
    ) {
      return {
        label: "Ended",
        score: 25,
      };
    }

    if (
      state.status ===
      "DEADLOCK"
    ) {
      return {
        label: "Deadlocked",
        score: 10,
      };
    }

    if (
      totalOffers === 0
    ) {
      return {
        label: "Ready",
        score: 70,
      };
    }

    const concessionBonus =
      Math.min(
        20,
        totalConcessions *
          5
      );

    const roundPenalty =
      Math.max(
        0,
        (
          state.currentRound -
          3
        ) *
          5
      );

    return {
      label:
        concessionBonus >=
        10
          ? "Good progress"
          : "Negotiating",

      score: Math.max(
        20,
        Math.min(
          95,
          65 +
            concessionBonus -
            roundPenalty
        )
      ),
    };
  };

  const health =
    getHealth();

  // =====================================================
  // DECISION EXPLANATION
  // =====================================================

  const getDecisionExplanation =
    () => {
      if (
        !state.lastDecision ||
        !state.currentOffer
      ) {
        return "No decision has been recorded yet.";
      }

      const respondingAgent =
        state.agents.find(
          (agent) =>
            agent.id !==
            state.currentOffer
              .agentId
        );

      if (
        !respondingAgent
      ) {
        return "Decision context is unavailable.";
      }

      const value =
        state.currentOffer
          .value;

      const target =
        respondingAgent
          .negotiation
          ?.targetValue;

      if (
        state.lastDecision ===
        "ACCEPT"
      ) {
        return `${respondingAgent.name} accepted ${formatMoney(
          value
        )} because the offer satisfies the agent's preferred acceptance boundary.`;
      }

      if (
        state.lastDecision ===
        "REJECT"
      ) {
        const boundary =
          respondingAgent
            .decisionType ===
          "minimize"
            ? respondingAgent
                .negotiation
                ?.maximumAcceptable
            : respondingAgent
                .negotiation
                ?.minimumAcceptable;

        return `${respondingAgent.name} rejected the offer because ${formatMoney(
          value
        )} crossed the hard constraint boundary of ${formatMoney(
          boundary
        )}.`;
      }

      return `${respondingAgent.name} chose COUNTER because ${formatMoney(
        value
      )} is negotiable but does not yet satisfy the preferred target of ${formatMoney(
        target
      )}.`;
    };

  // =====================================================
  // AUTOMATIC NEGOTIATION
  // =====================================================

  useEffect(() => {
  let cancelled = false;

  const runKey = `${negotiationRun}-${scenario?.id || scenario?.name || "scenario"}-${agents
    ?.map((agent) => agent.id)
    .join("|") || "agents"}`;

  if (negotiationStartedRef.current === runKey) {
    return;
  }

  negotiationStartedRef.current = runKey;

  async function startAutomaticNegotiation() {
      if (
        !scenario ||
        !agents ||
        agents.length <
          2
      ) {
        setMessage(
          "At least two agents are required to start negotiation."
        );

        return;
      }

      try {
        setIsNegotiating(
          true
        );

        setMessage(
          "🤖 AI agents are preparing the negotiation..."
        );

        const initialState =
          createNegotiation(
            scenario,
            agents
          );

        // Render the initial state immediately so the arena visibly
        // starts before the first LLM request completes.
        setState(initialState);

        const finalState =
          await runAutomaticNegotiation(
            initialState,

            (step) => {
              if (
                cancelled
              ) {
                return;
              }

              // ---------------------------------------
              // OPENING
              // ---------------------------------------

              if (
                step.type ===
                "OPENING_OFFER"
              ) {
                const source =
                  step.response
                    ?.source ||
                  (
                    step.state
                      ?.usingFallback
                      ? "RULE_BASED"
                      : "GEMINI"
                  );

                if (
                  source ===
                  "RULE_BASED"
                ) {
                  setMessage(
                    `⚠️ Gemini unavailable. ${step.agent.name} made a rule-based opening offer of ${formatMoney(
                      step.offer
                        ?.value
                    )}.`
                  );
                } else {
                  setMessage(
                    `🤖 ${step.agent.name} made an opening offer of ${formatMoney(
                      step.offer
                        ?.value
                    )}.`
                  );
                }
              }

              // ---------------------------------------
              // COUNTER
              // ---------------------------------------

              if (
                step.type ===
                "COUNTER"
              ) {
                const source =
                  step.response
                    ?.source ||
                  (
                    step.state
                      ?.usingFallback
                      ? "RULE_BASED"
                      : "GEMINI"
                  );

                if (
                  source ===
                  "RULE_BASED"
                ) {
                  setMessage(
                    `⚙️ ${step.agent.name} made a rule-based counteroffer of ${formatMoney(
                      step.offer
                        ?.value
                    )}.`
                  );
                } else {
                  setMessage(
                    `🤖 ${step.agent.name} made a Gemini counteroffer of ${formatMoney(
                      step.offer
                        ?.value
                    )}.`
                  );
                }
              }

              // ---------------------------------------
              // FALLBACK
              // ---------------------------------------

              if (
                step.type ===
                "GEMINI_FALLBACK"
              ) {
                setMessage(
                  "⚠️ Gemini was temporarily unavailable. This turn used the rule-based engine and Gemini will be retried."
                );
              }

              // ---------------------------------------
              // ACCEPT
              // ---------------------------------------

              if (
                step.type ===
                "ACCEPT"
              ) {
                setMessage(
                  `🤝 ${step.agent.name} accepted the offer. Agreement reached.`
                );
              }

              // ---------------------------------------
              // REJECT
              // ---------------------------------------

              if (
                step.type ===
                "REJECT"
              ) {
                setMessage(
                  `❌ ${step.agent.name} rejected the offer.`
                );
              }

              // ---------------------------------------
              // DEADLOCK
              // ---------------------------------------

              if (
                step.type ===
                "DEADLOCK"
              ) {
                setMessage(
                  "⚠️ Negotiation reached a deadlock."
                );
              }

              // ---------------------------------------
              // MAX ROUNDS
              // ---------------------------------------

              if (
                step.type ===
                "MAX_ROUNDS"
              ) {
                setMessage(
                  "⚠️ Maximum negotiation rounds reached."
                );
              }

              // ---------------------------------------
              // COMPLETED
              // ---------------------------------------

              if (
                step.type ===
                "COMPLETED"
              ) {
                setMessage(
                  step.state
                    ?.usingFallback
                    ? "⚙️ Negotiation completed using the rule-based fallback engine."
                    : "🤖 Negotiation completed."
                );
              }

              setState(
                step.state
              );
            },

            
          );

        if (
          !cancelled
        ) {
          setState(
            finalState
          );

          if (typeof onComplete === "function") {
            onComplete(finalState);
          }

          // -----------------------------------------
          // FINAL STATUS
          // -----------------------------------------

          if (
            finalState.status ===
            "AGREEMENT"
          ) {
            setMessage(
              `🤝 Agreement reached at ${formatMoney(
                finalState
                  .agreement
                  ?.offer
                  ?.value
              )}.`
            );
          } else if (
            finalState.status ===
            "REJECTED"
          ) {
            setMessage(
              "❌ Negotiation was rejected."
            );
          } else if (
            finalState.status ===
            "DEADLOCK"
          ) {
            setMessage(
              finalState.usingFallback
                ? "⚠️ Negotiation ended in deadlock using the fallback rule-based engine."
                : "⚠️ Negotiation ended in deadlock."
            );
          } else if (
            finalState.status ===
            "COMPLETED"
          ) {
            setMessage(
              finalState.usingFallback
                ? "⚙️ Negotiation completed using the fallback rule-based engine."
                : "🤖 Negotiation completed."
            );
          }
        }
      } catch (error) {
        console.error(
          "Automatic negotiation error:",
          error
        );

        if (
          !cancelled
        ) {
          setMessage(
            error.message ||
              "Unable to start the negotiation."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsNegotiating(
            false
          );
        }
      }
    }

    startAutomaticNegotiation();

    // Do not cancel the async negotiation here.
    // React 18 StrictMode runs effects twice in development: the first
    // effect is cleaned up and the second setup reuses the same component.
    // Cancelling here would leave the UI stuck on the initial state even
    // though the orchestrator completes successfully in the console.
    return () => {};
  }, [
    scenario,
    agents,
    negotiationRun,
    onComplete,
  ]);

  // =====================================================
  // RESET
  // =====================================================

  function handleReset() {
    setState(
      createNegotiation(
        scenario,
        agents
      )
    );

    setReplayIndex(
      0
    );

    setIsReplayOpen(
      false
    );

    setMessage(
      "🤖 AI agents are restarting the negotiation..."
    );

    setNegotiationRun(
      (run) =>
        run + 1
    );
  }

  // =====================================================
  // AGENT PANEL
  // =====================================================

  const renderAgentPanel = (
    agent,
    type
  ) => {
    if (!agent) {
      return null;
    }

    const isCurrent =
      agent.id ===
      state.currentAgentTurn;

    return (
      <div
        className={`arena-agent-panel ${
          isCurrent
            ? "arena-agent-active"
            : ""
        }`}
      >
        <div className="arena-agent-badge">
          {type ===
          "primary"
            ? "AGENT 01"
            : "AGENT 02"}
        </div>

        <div className="arena-agent-heading">
          <div
            className={`arena-avatar ${
              type ===
              "primary"
                ? "arena-avatar-blue"
                : "arena-avatar-green"
            }`}
          >
            {agent.role?.charAt(
              0
            )}
          </div>

          <div>
            <h2>
              {agent.name}
            </h2>

            <p>
              {agent.role}
            </p>
          </div>
        </div>

        <div className="arena-divider"></div>

        {/* GOAL */}

        <div className="arena-detail">
          <div className="arena-detail-icon">
            ◎
          </div>

          <div>
            <span>
              GOAL
            </span>

            <p>
              {agent.goal}
            </p>
          </div>
        </div>

        {/* CONSTRAINT */}

        <div className="arena-detail">
          <div className="arena-detail-icon">
            ◇
          </div>

          <div>
            <span>
              CONSTRAINT
            </span>

            <p>
              {agent.constraints}
            </p>
          </div>
        </div>

        {/* PERSONALITY */}

        <div className="arena-detail">
          <div className="arena-detail-icon">
            ◉
          </div>

          <div>
            <span>
              PERSONALITY
            </span>

            <p className="arena-personality">
              {
                agent.personality
              }
            </p>
          </div>
        </div>

        {isCurrent && (
          <div className="arena-turn-badge">
            ● CURRENT TURN
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="arena-page">

      {/* HEADER */}

      <div className="arena-header">
        <div>
          <div className="arena-title-row">
            <h1>
              Negotiation Arena
            </h1>

            <span className="arena-scenario-badge">
              {
                scenario.name
              }
            </span>
          </div>

          <p>
            Multi-agent negotiation simulation
          </p>
        </div>

        <div>
          <button
            className="arena-exit-button"
            onClick={
              onExit
            }
          >
            ← Exit Negotiation
          </button>

          <button
            className="reset-negotiation-btn"
            onClick={
              handleReset
            }
          >
            ↻ Reset Negotiation
          </button>
        </div>
      </div>

      {/* STATUS BAR */}

      <div className="arena-status-bar">

        <div className="arena-stat">
          <span className="arena-stat-label">
            ROUND
          </span>

          <strong>
            {
              state.currentRound
            }
          </strong>
        </div>

        <div className="arena-stat">
          <span className="arena-stat-label">
            STATUS
          </span>

          <strong
            className={`arena-status-value ${
              state.status ===
              "AGREEMENT"
                ? "status-agreement"
                : state.status ===
                  "REJECTED"
                ? "status-rejected"
                : state.status ===
                  "DEADLOCK"
                ? "status-rejected"
                : "status-progress"
            }`}
          >
            {
              state.status
            }
          </strong>
        </div>

        <div className="arena-stat">
          <span className="arena-stat-label">
            CURRENT TURN
          </span>

          <strong>
            {
              currentAgent
                ?.name ||
              "-"
            }
          </strong>
        </div>

        <div className="arena-stat">
          <span className="arena-stat-label">
            OFFERS MADE
          </span>

          <strong>
            {
              totalOffers
            }
          </strong>
        </div>

        <div className="arena-stat">
          <span className="arena-stat-label">
            GEMINI CALLS
          </span>

          <strong>
            {geminiCallsUsed}/10
          </strong>
        </div>
      </div>

      {/* FALLBACK BANNER */}

      {isUsingFallback && (
        <div
          className="arena-message"
          style={{
            marginTop:
              "16px",
          }}
        >
          <div className="arena-message-icon">
            ⚙️
          </div>

          <p>
            <strong>
              Rule-Based Fallback Active
            </strong>
            <br />

            Gemini is currently unavailable
            {state.fallbackReason
              ? ` — ${state.fallbackReason}`
              : "."}

            The negotiation is continuing
            automatically using the decision
            engine.
          </p>
        </div>
      )}

      {/* MAIN AREA */}

      <div className="arena-main-grid">

        {/* LEFT AGENT */}

        {renderAgentPanel(
          state.agents?.[0],
          "primary"
        )}

        {/* CENTER */}

        <div className="arena-center-panel">

          <div className="arena-turn-heading">
            <div className="arena-turn-icon">
              ⇄
            </div>

            <div>
              <h2>
                {
                  currentAgent
                    ?.name ||
                  "Negotiation"
                }
                's Turn
              </h2>

              <p>
                {isUsingFallback
                  ? "Rule-based fallback engine is negotiating automatically."
                  : "Gemini agents are negotiating automatically."}
              </p>
            </div>
          </div>

          {/* CURRENT OFFER */}

          {state.currentOffer && (
            <div className="arena-current-offer">

              <div>
                <span>
                  LATEST OFFER
                </span>

                <strong>
                  {formatMoney(
                    state
                      .currentOffer
                      .value
                  )}
                </strong>
              </div>

              <div>
                <span>
                  ROUND
                </span>

                <strong>
                  {
                    state
                      .currentOffer
                      .round
                  }
                </strong>
              </div>

            </div>
          )}

          {/* STRATEGY */}

          {currentAgent && (
            <div className="arena-strategy-card">

              <div className="arena-strategy-heading">
                <span>
                  ACTIVE AGENT STRATEGY
                </span>

                <strong>
                  {
                    currentAgent.personality
                  }
                </strong>
              </div>

              <p>
                {
                  getPersonalityPolicy(
                    currentAgent.personality
                  ).label
                }
              </p>

            </div>
          )}

          {/* DECISION */}

          {state.lastDecision &&
            state.currentOffer && (
              <div className="arena-explain-card">

                <div className="arena-feature-heading">

                  <span>
                    DECISION EXPLANATION
                  </span>

                  <strong
                    className={`decision-chip decision-${state.lastDecision.toLowerCase()}`}
                  >
                    {
                      state.lastDecision
                    }
                  </strong>

                </div>

                <p>
                  {
                    getDecisionExplanation()
                  }
                </p>

              </div>
            )}

          {/* MESSAGE */}

          <div className="arena-message">

            <div className="arena-message-icon">
              i
            </div>

            <p>
              {
                message
              }
            </p>

          </div>

          {/* NEGOTIATING */}

          {isNegotiating && (
            <div className="arena-message">

              <div className="arena-message-icon">
                {isUsingFallback
                  ? "⚙️"
                  : "🤖"}
              </div>

              <p>
                {isUsingFallback
                  ? "Rule-based fallback engine is continuing the negotiation..."
                  : "Gemini agents are negotiating automatically..."}
              </p>

            </div>
          )}

          {/* END STATE */}

          {state.status !==
            "IN_PROGRESS" && (
            <div
              className={`arena-result ${
                state.status ===
                "AGREEMENT"
                  ? "arena-result-success"
                  : "arena-result-rejected"
              }`}
            >

              <strong>
                {state.status ===
                "AGREEMENT"
                  ? "Negotiation Agreement Reached"
                  : state.status ===
                    "DEADLOCK"
                  ? "Negotiation Deadlock"
                  : state.status ===
                    "COMPLETED"
                  ? "Negotiation Completed"
                  : "Negotiation Rejected"}
              </strong>

              <p>
                {state.status ===
                "AGREEMENT"
                  ? "Both agents have reached an acceptable agreement."
                  : state.status ===
                    "DEADLOCK"
                  ? state.terminationReason ||
                    "The negotiation ended without agreement."
                  : state.status ===
                    "COMPLETED"
                  ? state.terminationReason ||
                    "The negotiation was completed."
                  : "The negotiation ended because an offer was outside the acceptable boundary."}
              </p>

            </div>
          )}
        </div>

        {/* RIGHT AGENT */}

        {renderAgentPanel(
          state.agents?.[1],
          "secondary"
        )}

      </div>

      {/* HISTORY */}

      <section className="arena-section">

        <div className="arena-section-header">

          <div>
            <h2>
              Negotiation History
            </h2>

            <p>
              Complete record of offers,
              decisions and system events.
            </p>
          </div>

          <span className="arena-count-badge">
            {
              state.history?.length ||
              0
            } events
          </span>

        </div>

        {!state.history ||
        state.history.length ===
          0 ? (
          <div className="arena-empty-state">

            <div className="arena-empty-icon">
              ◌
            </div>

            <strong>
              No offers yet
            </strong>

            <p>
              Negotiation history will appear
              here once negotiation begins.
            </p>

          </div>
        ) : (
          <div className="arena-table-wrapper">

            <table className="arena-table">

              <thead>
                <tr>
                  <th>
                    Round
                  </th>

                  <th>
                    Event
                  </th>

                  <th>
                    Agent
                  </th>

                  <th>
                    Value / Decision
                  </th>

                  <th>
                    Source
                  </th>

                  <th>
                    Time
                  </th>

                  <th>
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>

                {state.history.map(
                  (
                    event,
                    index
                  ) => {
                    const agentId =
                      event.agentId ||
                      event.offer
                        ?.agentId;

                    const agent =
                      state.agents.find(
                        (a) =>
                          a.id ===
                          agentId
                      );

                    const displayValue =
                       event.type === "OFFER" ||
                       event.type === "COUNTEROFFER" ||
                       event.type === "COUNTER"
                          ? formatMoney(
                             event.value ??
                             event.offer?.value ??
                              event.counterOffer
                             )
                             : event.type === "DECISION"
                             ? event.decision
                              : "—";

                    return (
                      <tr
                        key={`${event.type}-${index}`}
                      >
                        <td>
                          <span className="round-badge">
                            R
                            {
                              event.round
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {event.type ===
                            "OFFER"
                              ? "OFFER"
                              : event.type ===
                                "COUNTEROFFER"
                              ? "COUNTER"
                              : event.type ===
                                "DECISION"
                              ? "DECISION"
                              : event.event ||
                                "SYSTEM"}
                          </strong>
                        </td>

                        <td>
                          {
                            agent
                              ?.name ||
                            event.agentName ||
                            "System"
                          }
                        </td>

                        <td className="money-cell">
                          {
                            displayValue
                          }
                        </td>

                        <td>
                          {event.source ===
                          "RULE_BASED"
                            ? "⚙️ Rule"
                            : event.source ===
                              "GEMINI"
                            ? "🤖 Gemini"
                            : "—"}
                        </td>

                        <td>
                          {event.timestamp
                            ? new Date(
                                event.timestamp
                              ).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )
                            : "—"}
                        </td>

                        <td>
                          {event.type ===
                          "DECISION"
                            ? event.reason ||
                              `Response to ${formatMoney(
                                event.offerValue
                              )}`
                            : event.reason ||
                              event.message ||
                              "Negotiation event"}
                        </td>
                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}
      </section>

      {/* CONCESSION TRACKING */}

      <section className="arena-section">

        <div className="arena-section-header">

          <div>
            <h2>
              Concession Tracking
            </h2>

            <p>
              Tracks how each agent changes
              its offer between rounds.
            </p>
          </div>

          <span className="arena-count-badge">
            {
              totalConcessions
            }{" "}
            concessions
          </span>

        </div>

        {totalConcessions ===
        0 ? (
          <div className="arena-empty-state">

            <div className="arena-empty-icon">
              ↕
            </div>

            <strong>
              No concessions yet
            </strong>

            <p>
              Concession data will appear when
              an agent changes its offer.
            </p>

          </div>
        ) : (
          <div className="arena-table-wrapper">

            <table className="arena-table concession-table">

              <thead>
                <tr>
                  <th>
                    From Round
                  </th>

                  <th>
                    To Round
                  </th>

                  <th>
                    Agent Name
                  </th>

                  <th>
                    Previous Offer
                  </th>

                  <th>
                    Current Offer
                  </th>

                  <th>
                    Direction
                  </th>

                  <th>
                    Change
                  </th>
                </tr>
              </thead>

              <tbody>

                {state.concessions.map(
                  (
                    concession,
                    index
                  ) => {
                    const agent =
                      state.agents.find(
                        (a) =>
                          a.id ===
                          concession.agentId
                      );

                    const isIncrease =
                      concession.direction ===
                      "INCREASE";

                    const isDecrease =
                      concession.direction ===
                      "DECREASE";

                    return (
                      <tr
                        key={index}
                      >
                        <td>
                          R
                          {
                            concession.fromRound
                          }
                        </td>

                        <td>
                          R
                          {
                            concession.toRound
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              agent?.name
                            }
                          </strong>
                        </td>

                        <td>
                          {formatMoney(
                            concession.previousOffer
                          )}
                        </td>

                        <td className="money-cell">
                          {formatMoney(
                            concession.currentOffer
                          )}
                        </td>

                        <td>
                          <span
                            className={`direction-badge ${
                              isIncrease
                                ? "direction-increase"
                                : isDecrease
                                ? "direction-decrease"
                                : "direction-neutral"
                            }`}
                          >
                            {isIncrease
                              ? "↑ Increase"
                              : isDecrease
                              ? "↓ Decrease"
                              : "— No Change"}
                          </span>
                        </td>

                        <td className="change-cell">
                          {formatMoney(
                            concession.change
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}
      </section>

      {/* ANALYTICS */}

      <section className="arena-section analytics-section">

        <div className="arena-section-header">

          <div>
            <h2>
              Negotiation Analytics
            </h2>

            <p>
              Live performance, efficiency,
              outcome and agent-level metrics.
            </p>
          </div>

          <span className="arena-count-badge">
            Milestone 2
          </span>

        </div>

        <div className="analytics-grid">

          <div className="analytics-card">
            <span>
              NEGOTIATION SCORE
            </span>

            <strong>
              {
                negotiationScore
              }
              /100
            </strong>

            <div className="analytics-progress">
              <div
                style={{
                  width: `${negotiationScore}%`,
                }}
              />
            </div>
          </div>

          <div className="analytics-card">

            <span>
              NEGOTIATION HEALTH
            </span>

            <strong>
              {
                health.score
              }%
            </strong>

            <p>
              {
                health.label
              }
            </p>

            <div className="analytics-progress">
              <div
                style={{
                  width: `${health.score}%`,
                }}
              />
            </div>

          </div>

          <div className="analytics-card">

            <span>
              TOTAL OFFERS
            </span>

            <strong>
              {
                totalOffers
              }
            </strong>

            <p>
              {
                totalDecisions
              }{" "}
              decisions recorded
            </p>

          </div>

          <div className="analytics-card">

            <span>
              GEMINI USAGE
            </span>

            <strong>
              {
                geminiCallsUsed
              }
              /10
            </strong>

            <p>
              {isUsingFallback
                ? "Fallback engine active"
                : "Gemini active"}
            </p>

          </div>

        </div>

        <div className="analytics-agent-grid">

          {state.agents.map(
            (agent) => {
              const goalScore =
                getGoalAchievement(
                  agent
                );

              return (
                <div
                  className="analytics-agent-card"
                  key={
                    agent.id
                  }
                >

                  <div className="analytics-agent-title">

                    <div>
                      <span>
                        {
                          agent.role
                        }
                      </span>

                      <strong>
                        {
                          agent.name
                        }
                      </strong>
                    </div>

                    <em>
                      {
                        agent.personality
                      }
                    </em>

                  </div>

                  <div className="analytics-agent-metrics">

                    <div>
                      <span>
                        Offers
                      </span>

                      <strong>
                        {
                          getAgentOfferCount(
                            agent.id
                          )
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Concession
                      </span>

                      <strong>
                        {formatMoney(
                          getAgentConcessionAmount(
                            agent.id
                          )
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Goal score
                      </span>

                      <strong>
                        {goalScore ===
                        null
                          ? "—"
                          : `${Math.round(
                              goalScore
                            )}%`}
                      </strong>
                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>

        {state.status !==
          "IN_PROGRESS" && (
          <div className="analytics-outcome">

            <div>
              <span>
                FINAL OUTCOME
              </span>

              <strong>
                {state.status ===
                "AGREEMENT"
                  ? "Agreement Reached"
                  : state.status}
              </strong>
            </div>

            <div>
              <span>
                FINAL VALUE
              </span>

              <strong>
                {formatMoney(
                  state.agreement
                    ?.offer
                    ?.value ||
                    state.currentOffer
                      ?.value
                )}
              </strong>
            </div>

            <div>
              <span>
                ROUNDS
              </span>

              <strong>
                {
                  state.currentRound
                }
              </strong>
            </div>

            <div>
              <span>
                ENGINE
              </span>

              <strong>
                {isUsingFallback
                  ? "Rule-Based"
                  : "Gemini"}
              </strong>
            </div>

          </div>
        )}

      </section>

      {/* REPLAY */}

      {state.history?.length >
        0 && (
        <section className="arena-section replay-section">

          <div className="arena-section-header">

            <div>
              <h2>
                Negotiation Replay
              </h2>

              <p>
                Step through the recorded
                negotiation events.
              </p>
            </div>

            <button
              className="replay-toggle-button"
              onClick={() => {
                setIsReplayOpen(
                  (
                    open
                  ) =>
                    !open
                );

                setReplayIndex(
                  0
                );
              }}
            >
              {isReplayOpen
                ? "Hide Replay"
                : "Open Replay"}
            </button>

          </div>

          {isReplayOpen && (
            <div className="replay-panel">

              {(() => {
                const event =
                  state.history[
                    replayIndex
                  ];

                if (!event) {
                  return null;
                }

                const eventAgentId =
                  event.agentId ||
                  event.offer
                    ?.agentId;

                const eventAgent =
                  state.agents.find(
                    (
                      agent
                    ) =>
                      agent.id ===
                      eventAgentId
                  );

                return (
                  <>
                    <div className="replay-step">

                      <span>
                        EVENT{" "}
                        {
                          replayIndex +
                          1
                        }{" "}
                        /{" "}
                        {
                          state
                            .history
                            .length
                        }
                      </span>

                      <strong>
                        {event.type ===
                        "OFFER"
                          ? "OFFER"
                          : event.type ===
                            "DECISION"
                          ? "DECISION"
                          : event.event ||
                            "SYSTEM"}
                      </strong>

                    </div>

                    <div className="replay-content">

                      <div>
                        <span>
                          ROUND
                        </span>

                        <strong>
                          R
                          {
                            event.round
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          AGENT
                        </span>

                        <strong>
                          {
                            eventAgent
                              ?.name ||
                            event.agentName ||
                            "System"
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          VALUE / DECISION
                        </span>

                        <strong>
                          {event.type ===
                          "OFFER"
                            ? formatMoney(
                                event.value ??
                                  event
                                    .offer
                                    ?.value
                              )
                            : event.type ===
                              "DECISION"
                            ? event.decision
                            : "—"}
                        </strong>
                      </div>

                    </div>

                    <p className="replay-message">

                      {event.type ===
                      "OFFER"
                        ? event.reason ||
                          "Offer submitted."
                        : event.type ===
                          "DECISION"
                        ? event.reason ||
                          `Decision: ${event.decision}`
                        : event.message ||
                          "Negotiation event recorded."}

                    </p>

                    <div className="replay-controls">

                      <button
                        disabled={
                          replayIndex ===
                          0
                        }
                        onClick={() =>
                          setReplayIndex(
                            (
                              index
                            ) =>
                              Math.max(
                                0,
                                index -
                                  1
                              )
                          )
                        }
                      >
                        ← Previous
                      </button>

                      <button
                        disabled={
                          replayIndex ===
                          state
                            .history
                            .length -
                            1
                        }
                        onClick={() =>
                          setReplayIndex(
                            (
                              index
                            ) =>
                              Math.min(
                                state
                                  .history
                                  .length -
                                  1,
                                index +
                                  1
                              )
                          )
                        }
                      >
                        Next →
                      </button>

                    </div>
                  </>
                );
              })()}

            </div>
          )}

        </section>
      )}

      {/* BOTTOM SUMMARY */}

      <div className="arena-bottom-grid">

        <div className="arena-summary-card">

          <span>
            SCENARIO
          </span>

          <strong>
            {
              scenario.name
            }
          </strong>

        </div>

        <div className="arena-summary-card">

          <span>
            AGENTS
          </span>

          <strong>
            {
              state.agents.length
            }
          </strong>

        </div>

        <div className="arena-summary-card">

          <span>
            ROUND
          </span>

          <strong>
            {
              state.currentRound
            }
          </strong>

        </div>

        <div className="arena-summary-card">

          <span>
            ENGINE
          </span>

          <strong>
            {isUsingFallback
              ? "RULE-BASED"
              : "GEMINI"}
          </strong>

        </div>

        <div className="arena-summary-card">

          <span>
            STATUS
          </span>

          <strong>
            {
              state.status
            }
          </strong>

        </div>

      </div>

      {state.status !== "IN_PROGRESS" && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "18px" }}>
          <button
            className="ready-button"
            onClick={() => onViewOutcome?.(state)}
          >
            View Outcome & Download Report →
          </button>
        </div>
      )}

    </div>
  );
}

export default NegotiationArena;