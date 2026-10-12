// src/logic/decisionEngine.js

import {
  getAcceptanceThreshold,
  getPersonalityPolicy,
} from "./personalityPolicy.js";
import {
  chooseStrategy,
  explainStrategy,
  getStrategicConcessionFraction,
  buildConditionalTrade,
} from "./strategyEngine.js";
import { isClearlyUnreasonableOffer } from "./negotiationRules.js";

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

  const round = Number(context.currentRound || 1);
  const maxRounds = Math.max(1, Number(context.maxRounds) || 5);
  const roundProgress = Math.min(1, Math.max(0, (round - 1) / (maxRounds - 1 || 1)));
  const concessionProgress = roundProgress ** 2;
  const preferredThreshold = getAcceptanceThreshold(agent);
  let acceptanceThreshold = preferredThreshold;
  if (agent.decisionType === "minimize" && Number.isFinite(maximumAcceptable)) {
    acceptanceThreshold += (maximumAcceptable - preferredThreshold) * concessionProgress;
  } else if (agent.decisionType === "maximize" && Number.isFinite(minimumAcceptable)) {
    acceptanceThreshold -= (preferredThreshold - minimumAcceptable) * concessionProgress;
  }
  const previousOffers = Array.isArray(context.previousOffers)
    ? context.previousOffers
    : [];
  const previousOwnOffer =
    context.previousOwnOffer ||
    previousOffers
      .filter((offer) => offer?.agentId === agent.id)
      .slice(-1)[0] ||
    null;

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

  // Realistic negotiation guard: an extreme outlier is rejected even when
  // it is mathematically favorable. This prevents absurd offers such as ₹1
  // from being accepted simply because the agent wants a lower price.
  if (isClearlyUnreasonableOffer(agent, offerValue)) {
    return {
      ...result,
      decision: DECISION.REJECT,
      withinHardConstraints: false,
      reason: "Offer is outside the agent's realistic negotiation range and is treated as non-credible."
    };
  }

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

function getConcessionFraction(agent, currentRound = 1, maxRounds = 5, context = {}) {
  return getStrategicConcessionFraction(agent, {
    ...context,
    currentRound,
    maxRounds,
  });
}

function clampToNegotiationBoundary(agent, value) {
  let next = Math.max(1, Math.round(value));
  if (agent.decisionType === "minimize" && Number.isFinite(agent.negotiation.maximumAcceptable)) {
    next = Math.min(next, agent.negotiation.maximumAcceptable);
  }
  if (agent.decisionType === "maximize" && Number.isFinite(agent.negotiation.minimumAcceptable)) {
    next = Math.max(next, agent.negotiation.minimumAcceptable);
  }
  return next;
}

function clampToJointFeasibleRange(agent, value, opponentAgent = null) {
  let next = clampToNegotiationBoundary(agent, value);
  if (!opponentAgent?.negotiation) return next;

  if (agent.decisionType === "minimize") {
    const lower = Number(opponentAgent.negotiation.minimumAcceptable);
    const upper = Number(agent.negotiation.maximumAcceptable);
    if (Number.isFinite(lower) && Number.isFinite(upper) && lower <= upper) {
      next = Math.min(upper, Math.max(lower, next));
    }
  } else if (agent.decisionType === "maximize") {
    const lower = Number(agent.negotiation.minimumAcceptable);
    const upper = Number(opponentAgent.negotiation.maximumAcceptable);
    if (Number.isFinite(lower) && Number.isFinite(upper) && lower <= upper) {
      next = Math.min(upper, Math.max(lower, next));
    }
  }
  return next;
}

export function generateCounterOffer(
  agent,
  opponentOfferValue,
  previousOwnOffer = null,
  context = {}
) {
  validateAgent(agent);

  if (typeof opponentOfferValue !== "number" || !Number.isFinite(opponentOfferValue)) {
    throw new Error("Opponent offer must be a valid number.");
  }

  const { targetValue } = agent.negotiation;
  const previous = typeof previousOwnOffer === "number" ? previousOwnOffer : null;
  const round = Number(context.currentRound || 1);
  const maxRounds = Number(context.maxRounds || 5);
  const ownOffers = Array.isArray(context.ownOffers) ? context.ownOffers : [];
  const strategy = chooseStrategy(agent, {
    ...context,
    currentRound: round,
    maxRounds,
    ownOffers,
    opponentOffer: opponentOfferValue,
    previousOwnOffer: previous,
  });

  if (previous == null) {
    // With no prior own offer, respond from the agent's target toward the
    // opponent's observable position. Do not create a new counter outside
    // the target/opponent interval; that produces artificial rejection.
    const responseShare = strategy === "ANCHOR" ? 0.35 : 0.30;
    return clampToJointFeasibleRange(
      agent,
      targetValue + (opponentOfferValue - targetValue) * responseShare,
      context.opponentAgent || null
    );
  }

  const gap = opponentOfferValue - previous;
  const targetGap = targetValue - previous;
  const rate = getConcessionFraction(agent, round, maxRounds, {
    ...context,
    ownOffers,
    opponentOffer: opponentOfferValue,
    previousOwnOffer: previous,
  });

  let counter;
  if (gap === 0) {
    // Do not loop on identical offers. Probe toward the target, but keep the move small.
    counter = previous + targetGap * rate * 0.70;
  } else {
    counter = previous + gap * rate;
  }

  // Never overshoot the agent's preferred target in a single concession.
  if (agent.decisionType === "minimize" && previous < targetValue && counter > targetValue) counter = targetValue;
  if (agent.decisionType === "minimize" && previous > targetValue && counter < targetValue) counter = targetValue;
  if (agent.decisionType === "maximize" && previous > targetValue && counter < targetValue) counter = targetValue;
  if (agent.decisionType === "maximize" && previous < targetValue && counter > targetValue) counter = targetValue;

  return clampToJointFeasibleRange(agent, counter, context.opponentAgent || null);
}

export function getCounterOfferStrategy(agent, context = {}) {
  const strategy = chooseStrategy(agent, context);
  return {
    strategy,
    explanation: explainStrategy(agent, strategy, context),
    conditionalTrade: buildConditionalTrade(agent, context),
  };
}

// =====================================================
// OPENING OFFER
//
// Used when Gemini is unavailable before
// the first Gemini call can be completed.
// =====================================================

export function generateOpeningOffer(agent) {
  validateAgent(agent);

  const { targetValue, maximumAcceptable, minimumAcceptable } = agent.negotiation;
  let opening;

  if (agent.decisionType === "minimize") {
    const room = Number.isFinite(maximumAcceptable)
      ? Math.max(0, maximumAcceptable - targetValue)
      : Math.abs(targetValue) * 0.10;
    // Start below target, but leave credible room to trade upward toward it.
    opening = targetValue - room * 0.50;
    if (Number.isFinite(maximumAcceptable)) opening = Math.min(opening, maximumAcceptable);
  } else if (agent.decisionType === "maximize") {
    const room = Number.isFinite(minimumAcceptable)
      ? Math.max(0, targetValue - minimumAcceptable)
      : Math.abs(targetValue) * 0.10;
    // Start above target, leaving credible room to trade downward toward it.
    opening = targetValue + room * 0.50;
    if (Number.isFinite(minimumAcceptable)) opening = Math.max(opening, minimumAcceptable);
  } else {
    throw new Error(`Unknown decision type: ${agent.decisionType}`);
  }

  return clampToNegotiationBoundary(agent, opening);
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
    if (isClearlyUnreasonableOffer(agent, offerValue)) {
      return `${agent.name} rejected because the offer is outside a credible negotiation range for the scenario.`;
    }
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

  return `${agent.name} countered because ${formatMoney(offerValue)} is still ${agent.decisionType === "minimize" ? "above" : "below"} the preferred target of ${formatMoney(targetValue)} while remaining inside the hard boundary. The agent is protecting its target and preserving room for another exchange. ${policy?.label || ""}`;
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