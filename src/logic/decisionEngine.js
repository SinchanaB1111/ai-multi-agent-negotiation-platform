// src/logic/decisionEngine.js

import {
  getAcceptanceThreshold,
  getPersonalityPolicy,
} from "./personalityPolicy.js";

export const DECISION = {
  ACCEPT: "ACCEPT",
  REJECT: "REJECT",
  COUNTER: "COUNTER",
  MAKE_OFFER: "MAKE_OFFER",
};

// =====================================================
// VALIDATION
// =====================================================

function validateAgent(agent) {
  if (!agent?.negotiation) {
    throw new Error(
      "Agent negotiation constraints are required."
    );
  }

  if (
    typeof agent.negotiation.targetValue !==
      "number" ||
    !Number.isFinite(
      agent.negotiation.targetValue
    )
  ) {
    throw new Error(
      "Agent targetValue must be a valid number."
    );
  }
}

// =====================================================
// OFFER EVALUATION
// =====================================================

/**
 * Detailed offer evaluation used by both the rule-based engine and tests.
 * The returned object keeps the decision plus the factors that caused it.
 */
export function evaluateOfferDetails(
  agent,
  offerValue,
  context = {}
) {
  validateAgent(agent);

  if (
    typeof offerValue !== "number" ||
    !Number.isFinite(offerValue)
  ) {
    throw new Error("Offer value must be a valid number.");
  }

  const {
    targetValue,
    maximumAcceptable,
    minimumAcceptable,
  } = agent.negotiation;

  const acceptanceThreshold = getAcceptanceThreshold(agent);
  const previousOffers = Array.isArray(context.previousOffers)
    ? context.previousOffers
    : [];
  const previousOwnOffer =
    context.previousOwnOffer ||
    previousOffers
      .filter((offer) => offer?.agentId === agent.id)
      .slice(-1)[0] ||
    null;

  const round = Number(context.currentRound || 1);

  const result = {
    decision: DECISION.COUNTER,
    offerValue,
    targetValue,
    acceptanceThreshold,
    minimumAcceptable: minimumAcceptable ?? null,
    maximumAcceptable: maximumAcceptable ?? null,
    currentRound: round,
    previousOwnOffer: previousOwnOffer?.value ?? null,
    withinHardConstraints: true,
    reason: "Offer is negotiable but does not yet meet the preferred acceptance boundary.",
  };

  // MINIMIZE: lower values are better for the agent.
  if (agent.decisionType === "minimize") {
    if (
      typeof maximumAcceptable === "number" &&
      offerValue > maximumAcceptable
    ) {
      return {
        ...result,
        decision: DECISION.REJECT,
        withinHardConstraints: false,
        reason: `Offer exceeds the hard maximum of ${maximumAcceptable}.`,
      };
    }

    if (offerValue <= acceptanceThreshold) {
      return {
        ...result,
        decision: DECISION.ACCEPT,
        reason: "Offer is at or better than the agent's current acceptance boundary.",
      };
    }

    return result;
  }

  // MAXIMIZE: higher values are better for the agent.
  if (agent.decisionType === "maximize") {
    if (
      typeof minimumAcceptable === "number" &&
      offerValue < minimumAcceptable
    ) {
      return {
        ...result,
        decision: DECISION.REJECT,
        withinHardConstraints: false,
        reason: `Offer is below the hard minimum of ${minimumAcceptable}.`,
      };
    }

    if (offerValue >= acceptanceThreshold) {
      return {
        ...result,
        decision: DECISION.ACCEPT,
        reason: "Offer is at or better than the agent's current acceptance boundary.",
      };
    }

    return result;
  }

  throw new Error(`Unknown decision type: ${agent.decisionType}`);
}

/**
 * Backward-compatible decision-only API.
 */
export function evaluateOffer(agent, offerValue, context = {}) {
  return evaluateOfferDetails(agent, offerValue, context).decision;
}

// =====================================================
// COUNTER OFFER GENERATION
//
// Used when Gemini is unavailable.
// =====================================================

function getConcessionFraction(agent) {
  const label = getPersonalityPolicy(agent.personality)?.label?.toLowerCase() || "";

  if (label.includes("aggressive")) return 0.25;
  if (label.includes("risk")) return 0.20;
  return 0.35;
}

export function generateCounterOffer(
  agent,
  opponentOfferValue,
  previousOwnOffer = null
) {
  validateAgent(agent);

  if (
    typeof opponentOfferValue !==
      "number" ||
    !Number.isFinite(
      opponentOfferValue
    )
  ) {
    throw new Error(
      "Opponent offer must be a valid number."
    );
  }

  const {
    targetValue,
    maximumAcceptable,
    minimumAcceptable,
  } = agent.negotiation;

  const policy =
    getPersonalityPolicy(
      agent.personality
    );

  // ===================================================
  // MINIMIZE AGENT
  //
  // Lower is better.
  // ===================================================

  if (
    agent.decisionType === "minimize"
  ) {
    let counter;

    // If this is our first counter, move
    // between opponent offer and target.
    if (
      typeof previousOwnOffer !==
        "number"
    ) {
      counter =
        Math.round(
          (
            opponentOfferValue +
            targetValue
          ) / 2
        );
    } else {
      // Gradually move our previous offer
      // toward the opponent's offer.
      counter =
        Math.round(
          (
            previousOwnOffer +
            opponentOfferValue
          ) / 2
        );
    }

    // Aggressive agents concede less.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("aggressive")
    ) {
      counter =
        Math.round(
          previousOwnOffer !== null
            ? previousOwnOffer -
                (
                  previousOwnOffer -
                  opponentOfferValue
                ) *
                  0.25
            : (
                targetValue +
                opponentOfferValue
              ) /
                2
        );
    }

    // Collaborative agents move more
    // toward the middle.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("collaborative")
    ) {
      counter =
        Math.round(
          (
            targetValue +
            opponentOfferValue
          ) / 2
        );
    }

    // Risk-averse agents protect target.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("risk")
    ) {
      counter =
        Math.round(
          (
            targetValue * 0.7 +
            opponentOfferValue * 0.3
          )
        );
    }

    if (typeof previousOwnOffer === "number") {
      const gapToOpponent =
        Math.abs(previousOwnOffer - opponentOfferValue);

      // If both sides repeated the exact same value, do not freeze the
      // negotiation. Move a small step toward the agent's target.
      if (gapToOpponent === 0) {
        const targetGap = targetValue - previousOwnOffer;
        if (targetGap !== 0) {
          counter = Math.round(
            previousOwnOffer +
              targetGap *
                getConcessionFraction(agent)
          );
        } else {
          counter = previousOwnOffer;
        }
      } else {
        const maxMovement =
          gapToOpponent *
          getConcessionFraction(agent);

        const direction =
          opponentOfferValue < previousOwnOffer ? -1 : 1;

        const limitedCounter =
          previousOwnOffer + direction * maxMovement;

        // Never move farther toward the opponent than the allowed concession.
        counter =
          direction < 0
            ? Math.max(counter, limitedCounter)
            : Math.min(counter, limitedCounter);
      }
    }

    if (typeof maximumAcceptable === "number") {
      counter = Math.min(counter, maximumAcceptable);
    }

    counter = Math.max(1, Math.round(counter));

    return counter;
  }

  // ===================================================
  // MAXIMIZE AGENT
  //
  // Higher is better.
  // ===================================================

  if (
    agent.decisionType === "maximize"
  ) {
    let counter;

    if (
      typeof previousOwnOffer !==
        "number"
    ) {
      counter =
        Math.round(
          (
            opponentOfferValue +
            targetValue
          ) / 2
        );
    } else {
      counter =
        Math.round(
          (
            previousOwnOffer +
            opponentOfferValue
          ) / 2
        );
    }

    // Aggressive agents concede less.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("aggressive")
    ) {
      counter =
        Math.round(
          previousOwnOffer !== null
            ? previousOwnOffer +
                (
                  opponentOfferValue -
                  previousOwnOffer
                ) *
                  0.25
            : (
                targetValue +
                opponentOfferValue
              ) /
                2
        );
    }

    // Collaborative agents move toward middle.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("collaborative")
    ) {
      counter =
        Math.round(
          (
            targetValue +
            opponentOfferValue
          ) / 2
        );
    }

    // Risk-averse agents protect target.
    if (
      policy?.label
        ?.toLowerCase()
        .includes("risk")
    ) {
      counter =
        Math.round(
          (
            targetValue * 0.7 +
            opponentOfferValue * 0.3
          )
        );
    }

    if (typeof previousOwnOffer === "number") {
      const gapToOpponent =
        Math.abs(previousOwnOffer - opponentOfferValue);

      // If both sides repeated the exact same value, move toward the
      // agent's target instead of producing another identical offer.
      if (gapToOpponent === 0) {
        const targetGap = targetValue - previousOwnOffer;
        if (targetGap !== 0) {
          counter = Math.round(
            previousOwnOffer +
              targetGap *
                getConcessionFraction(agent)
          );
        } else {
          counter = previousOwnOffer;
        }
      } else {
        const maxMovement =
          gapToOpponent *
          getConcessionFraction(agent);

        const direction =
          opponentOfferValue > previousOwnOffer ? 1 : -1;

        const limitedCounter =
          previousOwnOffer + direction * maxMovement;

        counter =
          direction > 0
            ? Math.min(counter, limitedCounter)
            : Math.max(counter, limitedCounter);
      }
    }

    if (typeof minimumAcceptable === "number") {
      counter = Math.max(counter, minimumAcceptable);
    }

    counter = Math.max(1, Math.round(counter));

    return counter;
  }

  throw new Error(
    `Unknown decision type: ${agent.decisionType}`
  );
}

// =====================================================
// OPENING OFFER
//
// Used when Gemini is unavailable before
// the first Gemini call can be completed.
// =====================================================

export function generateOpeningOffer(
  agent
) {
  validateAgent(agent);

  const {
    targetValue,
    maximumAcceptable,
    minimumAcceptable,
  } = agent.negotiation;

  // ===================================================
  // MINIMIZE
  // ===================================================

  if (
    agent.decisionType === "minimize"
  ) {
    let opening;

    if (
      typeof maximumAcceptable ===
        "number"
    ) {
      opening =
        Math.round(
          (
            targetValue +
            maximumAcceptable
          ) / 2
        );
    } else {
      opening =
        Math.round(
          targetValue * 1.1
        );
    }

    return Math.max(
      1,
      opening
    );
  }

  // ===================================================
  // MAXIMIZE
  // ===================================================

  if (
    agent.decisionType === "maximize"
  ) {
    let opening;

    if (
      typeof minimumAcceptable ===
        "number"
    ) {
      opening =
        Math.round(
          (
            targetValue +
            minimumAcceptable
          ) / 2
        );
    } else {
      opening =
        Math.round(
          targetValue * 0.9
        );
    }

    return Math.max(
      1,
      opening
    );
  }

  throw new Error(
    `Unknown decision type: ${agent.decisionType}`
  );
}

// =====================================================
// EXPLAIN DECISION
// =====================================================

export function explainDecision(
  agent,
  offerValue,
  decision
) {
  validateAgent(agent);

  const policy =
    getPersonalityPolicy(
      agent?.personality
    );

  const {
    targetValue,
    maximumAcceptable,
    minimumAcceptable,
  } = agent.negotiation;

  const threshold =
    getAcceptanceThreshold(agent);

  if (
    decision === DECISION.ACCEPT
  ) {
    return `${agent.name} accepted because ${formatBoundaryReason(
      agent,
      offerValue,
      threshold,
      targetValue
    )}.`;
  }

  if (
    decision === DECISION.REJECT
  ) {
    if (
      agent.decisionType ===
      "minimize"
    ) {
      return `${agent.name} rejected because ${formatMoney(
        offerValue
      )} exceeds the hard maximum of ${formatMoney(
        maximumAcceptable
      )}.`;
    }

    return `${agent.name} rejected because ${formatMoney(
      offerValue
    )} is below the hard minimum of ${formatMoney(
      minimumAcceptable
    )}.`;
  }

  return `${agent.name} made a counteroffer because the offer is negotiable but does not yet meet the preferred acceptance boundary. ${policy?.label || ""}`;
}

// =====================================================
// BOUNDARY REASON
// =====================================================

function formatBoundaryReason(
  agent,
  offerValue,
  threshold,
  targetValue
) {
  if (
    agent.decisionType ===
    "minimize"
  ) {
    if (
      offerValue <= targetValue
    ) {
      return `${formatMoney(
        offerValue
      )} meets or improves the target of ${formatMoney(
        targetValue
      )}`;
    }

    return `${formatMoney(
      offerValue
    )} is within the ${formatMoney(
      threshold
    )} acceptance boundary`;
  }

  if (
    offerValue >= targetValue
  ) {
    return `${formatMoney(
      offerValue
    )} meets or exceeds the target of ${formatMoney(
      targetValue
    )}`;
  }

  return `${formatMoney(
    offerValue
  )} is within the ${formatMoney(
    threshold
  )} acceptance boundary`;
}

// =====================================================
// MONEY FORMAT
// =====================================================

function formatMoney(value) {
  return `₹${Number(
    value
  ).toLocaleString("en-IN")}`;
}

// =====================================================
// DECISION TABLE
// =====================================================

export function getDecisionTable(
  agent
) {
  if (!agent?.negotiation) {
    return [];
  }

  const {
    maximumAcceptable,
    minimumAcceptable,
  } = agent.negotiation;

  const threshold =
    getAcceptanceThreshold(agent);

  if (
    agent.decisionType ===
    "minimize"
  ) {
    return [
      {
        condition: `Offer ≤ ${formatMoney(
          threshold
        )}`,
        decision: DECISION.ACCEPT,
        meaning:
          "Offer meets the preferred acceptance boundary.",
      },

      {
        condition: `${formatMoney(
          threshold
        )} < Offer ≤ ${formatMoney(
          maximumAcceptable
        )}`,
        decision: DECISION.COUNTER,
        meaning:
          "Offer is negotiable but above the preferred target.",
      },

      {
        condition: `Offer > ${formatMoney(
          maximumAcceptable
        )}`,
        decision: DECISION.REJECT,
        meaning:
          "Offer violates the hard maximum constraint.",
      },
    ];
  }

  return [
    {
      condition: `Offer ≥ ${formatMoney(
        threshold
      )}`,
      decision: DECISION.ACCEPT,
      meaning:
        "Offer meets the preferred acceptance boundary.",
    },

    {
      condition: `${formatMoney(
        minimumAcceptable
      )} ≤ Offer < ${formatMoney(
        threshold
      )}`,
      decision: DECISION.COUNTER,
      meaning:
        "Offer is negotiable but below the preferred target.",
    },

    {
      condition: `Offer < ${formatMoney(
        minimumAcceptable
      )}`,
      decision: DECISION.REJECT,
      meaning:
        "Offer violates the hard minimum constraint.",
    },
  ];
}