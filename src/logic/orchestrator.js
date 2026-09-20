// src/logic/orchestrator.js

import { createOffer } from "./offer.js";
import { getSafeCounterOffer } from "./practiceNegotiation.js";

import {
  generateGeminiAgentResponse,
} from "./geminiAgent.js";

import {
  calculateConcession,
  getConcessionSummary,
} from "./concessionTracker.js";

import {
  NEGOTIATION_STATUS,
  syncTurn,
} from "./negotiationState.js";

import {
  DECISION,
  evaluateOfferDetails,
  explainDecision,
  generateCounterOffer,
  generateOpeningOffer,
} from "./decisionEngine.js";

export { NEGOTIATION_STATUS };

// =====================================================
// CONFIGURATION
// =====================================================

// Allow Gemini to handle a complete 5-round, 2-agent negotiation.
// 5 rounds × 2 agents = up to 10 Gemini turns.
// Fallback is activated only when Gemini actually fails.
const MAX_GEMINI_CALLS = 10;

const DEFAULT_MAX_ROUNDS = 5;

// Simulation Mode pacing remains unchanged: the autonomous engine may only
// reach agreement after a meaningful exchange. Practice Mode does not use
// this pacing rule because the human participant controls acceptance/rejection.
const MIN_OFFERS_BEFORE_ACCEPT = 2;
const MIN_ROUNDS_BEFORE_ACCEPT = 3;

// =====================================================
// HELPERS
// =====================================================

function getActiveAgent(state) {
  return (
    state.agents?.find(
      (agent) =>
        agent.id ===
        state.currentAgentTurn
    ) || null
  );
}

function getOpponentAgent(
  state,
  agentId
) {
  return (
    state.agents?.find(
      (agent) =>
        agent.id !== agentId
    ) || null
  );
}

function getNextAgent(
  state,
  currentAgentId
) {
  return (
    getOpponentAgent(
      state,
      currentAgentId
    )?.id || null
  );
}

function getMaxRounds(state) {
  return (
    state.maxRounds ||
    DEFAULT_MAX_ROUNDS
  );
}

// =====================================================
// GET PREVIOUS OFFER BY SAME AGENT
// =====================================================

function getPreviousOfferByAgent(
  state,
  agentId
) {
  const offers =
    state.offers || [];

  for (
    let i = offers.length - 1;
    i >= 0;
    i--
  ) {
    if (
      offers[i]?.agentId ===
      agentId
    ) {
      return offers[i];
    }
  }

  return null;
}

// =====================================================
// COUNT OFFERS BY AGENT
// =====================================================

function getAgentOfferCount(
  state,
  agentId
) {
  return (
    state.offers || []
  ).filter(
    (offer) =>
      offer.agentId === agentId
  ).length;
}

// =====================================================
// SNAPSHOT
// =====================================================

export function getOrchestratorSnapshot(
  state
) {
  return {
    scenario:
      state.scenario,

    currentRound:
      state.currentRound,

    currentAgentTurn:
      state.currentAgentTurn,

    turn: state.turn || {
      round: state.currentRound,
      maxRounds: state.maxRounds,
      activeAgentId: state.currentAgentTurn,
    },

    metrics: state.metrics || null,

    previousOffer:
      state.previousOffer,

    currentOffer:
      state.currentOffer,

    status:
      state.status,

    lastDecision:
      state.lastDecision,

    terminationReason:
      state.terminationReason,

    history:
      state.history || [],

    decisions:
      state.decisions || [],

    offers:
      state.offers || [],

    concessions:
      state.concessions || [],

    concessionSummary:
      getConcessionSummary(state.concessions || []),

    geminiCallsUsed:
      state.geminiCallsUsed || 0,

    usingFallback:
      state.usingFallback || false,

    fallbackReason:
      state.fallbackReason || null,
  };
}

// =====================================================
// HISTORY
// =====================================================

function addHistory(
  state,
  event
) {
  return {
    ...state,

    history: [
      ...(state.history || []),

      {
        ...event,

        timestamp:
          event.timestamp ||
          new Date().toISOString(),
      },
    ],
  };
}

// =====================================================
// DEADLOCK CHECK
// =====================================================

function hasNoProgressDeadlock(
  state
) {
  const offers = (
    state.history || []
  )
    .filter(
      (item) =>
        item.type === "OFFER" ||
        item.type ===
          "COUNTEROFFER"
    )
    .slice(-4);

  // Two identical opening offers are not a deadlock. Require four
  // consecutive recent offers with no movement before declaring deadlock.
  if (offers.length < 4) {
    return false;
  }

  const values = offers
    .map(
      (offer) =>
        offer.value ??
        offer.offer?.value
    )
    .filter(
      (value) =>
        typeof value ===
          "number" &&
        Number.isFinite(value)
    );

  if (values.length < 2) {
    return false;
  }

  // Only treat as deadlock when recent offers
  // are exactly the same.
  return values.every(
    (value) =>
      value === values[0]
  );
}

// =====================================================
// RECORD OFFER
// =====================================================

export function recordOffer(
  state,
  {
    value,
    terms = null,
    agentId,
    reason = "",
    source = "UNKNOWN",
    eventType = "OFFER",
  }
) {
  const activeAgent =
    state.agents?.find(
      (agent) =>
        agent.id === agentId
    ) || null;

  // ===================================================
  // VALIDATE OFFER
  // ===================================================

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    throw new Error(
      "Offer value must be a positive number."
    );
  }

  // ===================================================
  // CREATE OFFER
  // ===================================================

  const offer =
    createOffer({
      value:
        numericValue,

      terms,

      agentId,

      agentName:
        activeAgent?.name,

      round:
        state.currentRound,

      reason,
    });

  // ===================================================
  // IMPORTANT CONCESSION FIX
  //
  // Find the previous offer made by
  // THIS SAME AGENT.
  // ===================================================

  const previousAgentOffer =
    getPreviousOfferByAgent(
      state,
      agentId
    );

  // ===================================================
  // CREATE NEXT STATE
  // ===================================================

  let nextState = {
    ...state,

    previousOffer:
      state.currentOffer ||
      null,

    currentOffer:
      offer,

    offers: [
      ...(state.offers || []),
      offer,
    ],

    history: [
      ...(state.history || []),

      {
        type: eventType,

        source,

        offerId:
          offer.id,

        value:
          offer.value,

        terms:
          offer.terms,

        agentId:
          offer.agentId,

        agentName:
          offer.agentName,

        round:
          offer.round,

        reason:
          offer.reason,

        timestamp:
          offer.timestamp,
      },
    ],

    lastDecision:
      null,

    status:
      NEGOTIATION_STATUS.IN_PROGRESS,

    metrics: {
      ...(state.metrics || {}),
      totalOffers: (state.metrics?.totalOffers || 0) + 1,
      totalCounteroffers:
        (state.metrics?.totalCounteroffers || 0) +
        (eventType === "COUNTEROFFER" ? 1 : 0),
      totalConcessions: (state.metrics?.totalConcessions || 0),
      totalDecisions: (state.metrics?.totalDecisions || 0),
    },
  };

  // ===================================================
  // CALCULATE CONCESSION
  // ===================================================

  try {
    const concession =
      calculateConcession(
        previousAgentOffer,
        offer
      );

    if (concession) {
      nextState = {
        ...nextState,

        concessions: [
          ...(nextState.concessions ||
            []),

          concession,
        ],

        metrics: {
          ...(nextState.metrics || {}),
          totalConcessions:
            (nextState.metrics?.totalConcessions || 0) + 1,
        },
      };

      console.log(
        "======================================"
      );

      console.log(
        "📉 CONCESSION TRACKED"
      );

      console.log(
        concession
      );

      console.log(
        "======================================"
      );
    } else {
      console.log(
        "ℹ️ No concession for this offer."
      );
    }
  } catch (error) {
    console.warn(
      "Concession calculation skipped:",
      error.message
    );
  }

  return syncTurn(nextState);
}

// =====================================================
// EVALUATE CURRENT OFFER
// =====================================================

export function evaluateCurrentOffer(
  state
) {
  if (!state) {
    return {
      decision:
        "NO_STATE",

      accepted:
        false,

      offer:
        null,

      respondingAgent:
        null,
    };
  }

  if (!state.currentOffer) {
    return {
      decision:
        "NO_OFFER",

      accepted:
        false,

      offer:
        null,

      respondingAgent:
        getActiveAgent(state),
    };
  }

  const respondingAgent =
    getOpponentAgent(
      state,
      state.currentOffer.agentId
    );

  if (!respondingAgent) {
    return {
      decision:
        "NO_RESPONDING_AGENT",

      accepted:
        false,

      offer:
        state.currentOffer,

      respondingAgent:
        null,
    };
  }

  return {
    decision:
      "PENDING",

    accepted:
      false,

    offer:
      state.currentOffer,

    respondingAgent,
  };
}

// =====================================================
// APPLY DECISION
// =====================================================

export function applyDecision(
  state,
  decision,
  details = {}
) {
  const respondingAgent =
    details.respondingAgent ||
    getOpponentAgent(
      state,
      state.currentOffer
        ?.agentId
    );

  const decisionEvent = {
    type:
      "DECISION",

    decision,

    source:
      details.source ||
      "UNKNOWN",

    agentId:
      respondingAgent?.id ||
      null,

    agentName:
      respondingAgent?.name ||
      null,

    offerId:
      state.currentOffer?.id ||
      null,

    offerValue:
      state.currentOffer?.value ??
      null,

    reason:
      details.reason ||
      `${respondingAgent?.name || "Agent"} chose ${decision}.`,

    round:
      state.currentRound,

    timestamp:
      new Date().toISOString(),
  };

  let nextState = {
    ...state,

    decisions: [
      ...(state.decisions || []),
      decisionEvent,
    ],

    history: [
      ...(state.history || []),
      decisionEvent,
    ],

    lastDecision:
      decision,

    metrics: {
      ...(state.metrics || {}),
      totalOffers: state.metrics?.totalOffers || 0,
      totalCounteroffers: state.metrics?.totalCounteroffers || 0,
      totalConcessions: state.metrics?.totalConcessions || 0,
      totalDecisions: (state.metrics?.totalDecisions || 0) + 1,
    },
  };

  // ===================================================
  // ACCEPT
  // ===================================================

  if (
    decision ===
    DECISION.ACCEPT
  ) {
    nextState = {
      ...nextState,

      status:
        NEGOTIATION_STATUS.AGREEMENT,

      currentAgentTurn:
        null,

      turn: {
        round: state.currentRound,
        maxRounds: getMaxRounds(state),
        activeAgentId: null,
      },

      agreement: {
        offer:
          state.currentOffer ||
          null,

        agentId:
          respondingAgent?.id ||
          null,

        agentName:
          respondingAgent?.name ||
          null,

        round:
          state.currentRound,

        timestamp:
          new Date().toISOString(),
      },

      terminationReason:
        details.reason ||
        "Both agents reached an agreement.",
    };
  }

  // ===================================================
  // REJECT
  // ===================================================

  if (
    decision ===
    DECISION.REJECT
  ) {
    nextState = {
      ...nextState,

      status:
        NEGOTIATION_STATUS.REJECTED,

      currentAgentTurn:
        null,

      turn: {
        round: state.currentRound,
        maxRounds: getMaxRounds(state),
        activeAgentId: null,
      },

      terminationReason:
        details.reason ||
        "The negotiation was rejected.",
    };
  }

  return syncTurn(nextState);
}

// =====================================================
// SAVE OFFER
// =====================================================

function saveOffer(
  state,
  agent,
  value,
  reason,
  type,
  source = "GEMINI"
) {
  let nextState =
    recordOffer(
      state,
      {
        value,

        reason,

        terms:
          null,

        agentId:
          agent.id,

        source,

        eventType: type,
      }
    );

  const index =
    nextState.history.length -
    1;

  if (
    index >= 0 &&
    nextState.history[index]
  ) {
    nextState.history[index] = {
      ...nextState.history[index],

      type,

      source:
        source,

      agentId:
        agent.id,

      agentName:
        agent.name,
    };
  }

  if (type === "COUNTEROFFER") {
    nextState.counteroffers = [
      ...(nextState.counteroffers || []),
      nextState.currentOffer,
    ];
  }

  return nextState;
}

// =====================================================
// COMPATIBILITY FUNCTION
// =====================================================

export async function processOffer(
  state,
  offer,
  onStep = null
) {
  const nextState =
    recordOffer(
      state,
      offer
    );

  if (
    typeof onStep ===
    "function"
  ) {
    onStep({
      type:
        "OFFER",

      agent:
        state.agents?.find(
          (agent) =>
            agent.id ===
            offer.agentId
        ) || null,

      offer:
        nextState.currentOffer,

      state:
        nextState,
    });
  }

  return nextState;
}

// =====================================================
// PRACTICE MODE TURN PROCESSOR
// =====================================================
// The UI submits only the human offer. The orchestrator owns the complete
// human -> AI exchange: recording, concession tracking, AI decision,
// counteroffer recording, history, and round advancement.
// =====================================================

export async function processPracticeOffer(state, humanOffer, onStep = null) {
  if (!state || state.status !== NEGOTIATION_STATUS.IN_PROGRESS) {
    throw new Error("Practice negotiation is not in progress.");
  }

  const human = state.agents?.[0];
  const ai = state.agents?.[1];
  if (!human || !ai) throw new Error("Practice mode requires exactly two agents.");
  if (state.currentAgentTurn !== human.id) throw new Error("It is not the human participant's turn.");

  const value = Number(humanOffer?.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Offer value must be a positive number.");
  }

  let next = recordOffer(state, {
    value: Math.round(value),
    terms: humanOffer?.terms || null,
    agentId: human.id,
    reason: humanOffer?.reason || `${human.name} proposed ${Math.round(value)}.`,
    source: "HUMAN",
    eventType: "OFFER",
  });

  if (typeof onStep === "function") onStep({ type: "OFFER", agent: human, offer: next.currentOffer, state: next });

  const opponentOffer = next.currentOffer;
  let response;
  let source = "RULE_BASED";

  try {
    response = await generateGeminiAgentResponse(ai, next, next.history, opponentOffer);
    source = response?.source || response?.provider || "GEMINI";
  } catch (error) {
    source = "RULE_BASED";
    next = activateFallback(next, "Practice Mode LLM request failed; the rule-based negotiation engine handled this turn.");
    response = runRuleBasedDecision(next, ai, opponentOffer);
  }

  // In Practice Mode the AI's ACCEPT / REJECT / COUNTER decision is authoritative.
  // The orchestrator only validates the response and safely normalizes an invalid
  // counter amount. It does not override a valid LLM decision with local rules.
  if (!response?.decision) throw new Error("AI returned no negotiation decision.");

  if (response.decision === DECISION.ACCEPT || response.decision === DECISION.REJECT) {
    next = applyDecision(next, response.decision, {
      respondingAgent: ai,
      source,
      reason: response.reason || explainDecision(ai, value, response.decision),
    });

    if (typeof onStep === "function") onStep({ type: response.decision, agent: ai, offer: next.currentOffer, response, state: next });
    return next;
  }

  const previousAiOffer = getPreviousOfferByAgent(next, ai.id);
  const counter = getSafeCounterOffer(
    ai,
    value,
    previousAiOffer,
    response.counterOffer
  );

  next = saveOffer(
    next,
    ai,
    counter,
    response.reason || `${ai.name} made a counteroffer.`,
    "COUNTEROFFER",
    source
  );

  if (typeof onStep === "function") onStep({ type: "COUNTER", agent: ai, offer: next.currentOffer, response, state: next });

  const nextRound = next.currentRound + 1;
  if (nextRound > getMaxRounds(next)) {
    next = {
      ...next,
      status: NEGOTIATION_STATUS.DEADLOCK,
      currentAgentTurn: null,
      turn: { round: next.currentRound, maxRounds: getMaxRounds(next), activeAgentId: null },
      terminationReason: `Maximum of ${getMaxRounds(next)} practice rounds reached without agreement.`,
    };
    next = addHistory(next, {
      type: "SYSTEM",
      event: "DEADLOCK",
      round: next.currentRound,
      message: next.terminationReason,
      source: "ORCHESTRATOR",
    });
    return next;
  }

  next = syncTurn({
    ...next,
    turn: { round: nextRound, maxRounds: getMaxRounds(next), activeAgentId: human.id },
    currentRound: nextRound,
    currentAgentTurn: human.id,
    status: NEGOTIATION_STATUS.IN_PROGRESS,
    lastDecision: DECISION.COUNTER,
  });

  next = addHistory(next, {
    type: "SYSTEM",
    event: "ROUND_ADVANCED",
    round: next.currentRound,
    activeAgentId: human.id,
    message: `Round ${next.currentRound} started. Human participant's turn.`,
    source: "ORCHESTRATOR",
  });

  if (typeof onStep === "function") onStep({ type: "ROUND_ADVANCED", agent: human, offer: next.currentOffer, state: next });
  return next;
}

// =====================================================
// PRACTICE HUMAN DECISION
// =====================================================
// The human can explicitly ACCEPT or REJECT the AI's latest offer at any time.
// These actions are recorded through the same decision/history pipeline used by
// AI decisions, and the orchestrator terminates the negotiation accordingly.
// =====================================================
export function processPracticeDecision(state, decision, reason = "") {
  if (!state || state.status !== NEGOTIATION_STATUS.IN_PROGRESS) {
    throw new Error("Practice negotiation is not in progress.");
  }

  const human = state.agents?.[0];
  const currentOffer = state.currentOffer;
  if (!human || !currentOffer || currentOffer.agentId === human.id) {
    throw new Error("The human can accept or reject only the AI's current offer.");
  }
  if (decision !== DECISION.ACCEPT && decision !== DECISION.REJECT) {
    throw new Error("Human decision must be ACCEPT or REJECT.");
  }

  return applyDecision(state, decision, {
    respondingAgent: human,
    source: "HUMAN",
    reason: reason || (decision === DECISION.ACCEPT
      ? `${human.name} accepted the AI offer.`
      : `${human.name} rejected the AI offer.`),
  });
}

// =====================================================
// GEMINI ERROR DETECTION
// =====================================================

function isGeminiQuotaError(error) {
  const message =
    String(error?.message || "").toLowerCase();

  return (
    error?.status === 429 ||
    error?.code === 429 ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
}

function isGeminiUnavailableError(error) {
  const message =
    String(error?.message || "").toLowerCase();

  return (
    error?.status === 503 ||
    error?.code === 503 ||
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("currently experiencing high demand")
  );
}

// =====================================================
// FALLBACK DECISION
// =====================================================

function runRuleBasedDecision(
  state,
  agent,
  opponentOffer
) {
  // ===================================================
  // OPENING OFFER
  // ===================================================

  if (!opponentOffer) {
    const openingAmount =
      generateOpeningOffer(
        agent
      );

    return {
      decision:
        DECISION.MAKE_OFFER,

      reason:
        `${agent.name} generated an opening offer using the rule-based negotiation engine.`,

      counterOffer:
        openingAmount,

      source:
        "RULE_BASED",
    };
  }

  // ===================================================
  // EVALUATE OPPONENT OFFER
  // ===================================================

  const evaluation =
    evaluateOfferDetails(
      agent,
      opponentOffer.value,
      {
        currentRound: state.currentRound,
        previousOffers: state.offers || [],
        previousOwnOffer: getPreviousOfferByAgent(
          state,
          agent.id
        ),
      }
    );

  const decision = evaluation.decision;

  // ===================================================
  // ACCEPT
  // ===================================================

  if (
    decision ===
    DECISION.ACCEPT
  ) {
    return {
      decision:
        DECISION.ACCEPT,

      reason:
        explainDecision(
          agent,
          opponentOffer.value,
          decision
        ),

      counterOffer:
        null,

      source:
        "RULE_BASED",
    };
  }

  // ===================================================
  // REJECT
  // ===================================================

  if (
    decision ===
    DECISION.REJECT
  ) {
    return {
      decision:
        DECISION.REJECT,

      reason:
        explainDecision(
          agent,
          opponentOffer.value,
          decision
        ),

      counterOffer:
        null,

      source:
        "RULE_BASED",
    };
  }

  // ===================================================
  // COUNTER
  // ===================================================

  const previousOwnOffer =
    (
      state.offers || []
    )
      .filter(
        (offer) =>
          offer.agentId ===
          agent.id
      )
      .slice(-1)[0]
      ?.value || null;

  const counterOffer =
    generateCounterOffer(
      agent,
      opponentOffer.value,
      previousOwnOffer
    );

  return {
    decision:
      DECISION.COUNTER,

    reason:
      explainDecision(
        agent,
        opponentOffer.value,
        decision
      ),

    counterOffer,

    source:
      "RULE_BASED",
  };
}

// =====================================================
// FORCE CONCESSION COUNTER
// =====================================================
//
// If Gemini says ACCEPT too early and the agent
// has only made one offer, generate a local counter
// instead. This gives the agent a second offer,
// allowing concession tracking to work.
// =====================================================

// =====================================================
// SIMULATION PACING COUNTER
// =====================================================
function createRequiredConcessionCounter(state, agent, opponentOffer, originalResponse) {
  const previousOwnOffer = getPreviousOfferByAgent(state, agent.id);
  const counter = generateCounterOffer(
    agent,
    opponentOffer.value,
    previousOwnOffer?.value ?? null
  );

  return {
    decision: DECISION.COUNTER,
    reason: `${agent.name} continued negotiating instead of accepting immediately, making a revised offer to reach a mutually acceptable agreement.`,
    counterOffer: counter,
    source: originalResponse?.source || "RULE_BASED",
  };
}

// =====================================================
// APPLY RESPONSE
// =====================================================

function applyAgentResponse(
  state,
  agent,
  response
) {
  // ===================================================
  // ACCEPT
  // ===================================================

  if (
    response.decision ===
    DECISION.ACCEPT
  ) {
    return applyDecision(
      state,
      DECISION.ACCEPT,
      {
        ...response,

        respondingAgent:
          agent,

        source:
          response.source,
      }
    );
  }

  // ===================================================
  // REJECT
  // ===================================================

  if (
    response.decision ===
    DECISION.REJECT
  ) {
    return applyDecision(
      state,
      DECISION.REJECT,
      {
        ...response,

        respondingAgent:
          agent,

        source:
          response.source,
      }
    );
  }

  // ===================================================
  // OFFER / COUNTER
  // ===================================================

  if (
    response.decision ===
      DECISION.MAKE_OFFER ||
    response.decision ===
      DECISION.COUNTER
  ) {
    if (
      typeof response.counterOffer !==
        "number" ||
      !Number.isFinite(
        response.counterOffer
      ) ||
      response.counterOffer <= 0
    ) {
      throw new Error(
        "Agent generated an invalid offer amount."
      );
    }

    return saveOffer(
      state,
      agent,
      response.counterOffer,
      response.reason ||
        `${agent.name} made an offer.`,
      response.decision ===
        DECISION.MAKE_OFFER
        ? "OFFER"
        : "COUNTEROFFER",
      response.source
    );
  }

  throw new Error(
    `Unsupported agent decision: ${response.decision}`
  );
}

// =====================================================
// NEXT TURN
// =====================================================

export function moveToNextTurn(state, currentAgent) {
  const nextAgentId = getNextAgent(state, currentAgent.id);
  if (!nextAgentId) return state;

  const firstAgentId = state.agents?.[0]?.id;
  const returningToFirst = nextAgentId === firstAgentId;
  const nextRound = returningToFirst
    ? Math.min((state.currentRound || 1) + 1, getMaxRounds(state))
    : state.currentRound;

  return syncTurn({
    ...state,
    turn: {
      round: nextRound,
      maxRounds: getMaxRounds(state),
      activeAgentId: nextAgentId,
    },
    currentRound: nextRound,
    currentAgentTurn: nextAgentId,
    status: NEGOTIATION_STATUS.IN_PROGRESS,
  });
}

// =====================================================
// FALLBACK MODE ACTIVATION
// =====================================================

function activateFallback(
  state,
  reason
) {
  let nextState = {
    ...state,

    usingFallback:
      true,

    fallbackReason:
      reason,

    status:
      NEGOTIATION_STATUS.IN_PROGRESS,
  };

  nextState =
    addHistory(
      nextState,
      {
        type:
          "SYSTEM",
        event:
          "GEMINI_FALLBACK",

        round:
          nextState.currentRound,

        message:
          "LLM providers were unavailable. The rule-based engine is now active for the rest of this negotiation.",

        source:
          "RULE_BASED",
      }
    );

  return nextState;
}

// =====================================================
// AUTOMATIC NEGOTIATION
// =====================================================

export async function runAutomaticNegotiation(
  initialState,
  onStep = null,
  options = {}
) {
  // Gemini should be used for as many negotiation turns as needed.
  // Keep a safety budget of 10 calls for the normal
  // 5-round / 2-agent demonstration.
  //
  // A legacy value such as maxGeminiCalls: 3 must NOT
  // force the system to switch to fallback.

  const requestedMaxGeminiCalls =
    Number(options.maxGeminiCalls);

  const maxGeminiCalls =
    Number.isFinite(
      requestedMaxGeminiCalls
    ) &&
    requestedMaxGeminiCalls >
      MAX_GEMINI_CALLS
      ? Math.floor(
          requestedMaxGeminiCalls
        )
      : MAX_GEMINI_CALLS;

  let state = {
    ...initialState,

    status:
      NEGOTIATION_STATUS.IN_PROGRESS,

    history: [
      ...(initialState.history ||
        []),
    ],

    decisions: [
      ...(initialState.decisions ||
        []),
    ],

    offers: [
      ...(initialState.offers ||
        []),
    ],

    concessions: [
      ...(initialState.concessions ||
        []),
    ],

    geminiCallsUsed:
      initialState.geminiCallsUsed ||
      0,

    usingFallback:
      initialState.usingFallback ||
      false,

    fallbackReason:
      initialState.fallbackReason ||
      null,

    maxRounds:
      initialState.maxRounds ||
      DEFAULT_MAX_ROUNDS,
  };

  // ===================================================
  // SAFETY
  // ===================================================

  if (
    !state.agents ||
    state.agents.length <
      2
  ) {
    throw new Error(
      "At least two agents are required."
    );
  }

  // ===================================================
  // UI NOTIFICATION
  // ===================================================

  function notify(event) {
    if (
      typeof onStep ===
      "function"
    ) {
      onStep({
        ...event,

        geminiCallCount:
          state.geminiCallsUsed,

        usingFallback:
          state.usingFallback,

        state,
      });
    }
  }

  // ===================================================
  // GEMINI CALL
  // ===================================================

  async function askGemini(
    agent,
    opponentOffer
  ) {
    if (
      state.geminiCallsUsed >=
      maxGeminiCalls
    ) {
      throw new Error(
        `Gemini safety budget of ${maxGeminiCalls} calls reached.`
      );
    }

    state = {
      ...state,

      geminiCallsUsed:
        state.geminiCallsUsed +
        1,
    };

    console.log(
      `🤖 LLM call ${state.geminiCallsUsed}/${maxGeminiCalls} (Gemini → Groq → OpenAI)`
    );

    notify({
      type: "LLM_CALL_STARTED",
      agent,
      offer: opponentOffer,
      response: null,
    });

    return generateGeminiAgentResponse(
      agent,
      state,
      state.history,
      opponentOffer
    );
  }

  // ===================================================
  // MAIN NEGOTIATION LOOP
  // ===================================================

  while (
    state.status ===
      NEGOTIATION_STATUS.IN_PROGRESS
  ) {
    // =================================================
    // MAX ROUND CHECK
    // =================================================

    if (
      state.currentRound >
      getMaxRounds(state)
    ) {
      state = {
        ...state,

        status:
          NEGOTIATION_STATUS.DEADLOCK,

        currentAgentTurn:
          null,

        terminationReason:
          `Maximum of ${getMaxRounds(
            state
          )} rounds reached without agreement.`,
      };

      state =
        addHistory(
          state,
          {
            type:
              "SYSTEM",

            event:
              "DEADLOCK",

            round:
              state.currentRound,

            message:
              state.terminationReason,
          }
        );

      notify({
        type:
          "MAX_ROUNDS",

        agent:
          null,

        offer:
          state.currentOffer,
      });

      break;
    }

    // =================================================
    // ACTIVE AGENT
    // =================================================

    const activeAgent =
      getActiveAgent(state);

    if (!activeAgent) {
      throw new Error(
        "Active negotiation agent not found."
      );
    }

    // =================================================
    // OPPONENT OFFER
    // =================================================

    const opponentOffer =
      state.currentOffer &&
      state.currentOffer.agentId !==
        activeAgent.id
        ? state.currentOffer
        : null;

    let response;

    // =================================================
    // FALLBACK MODE
    // =================================================

    if (state.usingFallback) {
      response =
        runRuleBasedDecision(
          state,
          activeAgent,
          opponentOffer
        );
    }

    // =================================================
    // GEMINI MODE
    // =================================================

    if (!state.usingFallback) {
      try {
        response =
          await askGemini(
            activeAgent,
            opponentOffer
          );

        response = {
          ...response,

          source:
            response.source ||
            response.provider ||
            "GEMINI",
        };

        // The backend can safely return a local rule-based response with HTTP 200.
        // Mark the negotiation as fallback mode so the UI reports the actual engine.
        if (response.source === "RULE_BASED" || response.fallback === true) {
          state = activateFallback(
            state,
            "LLM providers were unavailable; the local rule-based engine is active."
          );
        }

      } catch (error) {
        console.warn(
          "⚠️ Gemini request failed for this turn. Using a temporary fallback response:",
          error.message
        );

        const fallbackReason =
          error?.provider === "ALL"
            ? "Gemini, Groq, and OpenAI were unavailable."
            : isGeminiQuotaError(error)
              ? "Primary Gemini request failed after backup providers were unavailable."
              : isGeminiUnavailableError(error)
                ? "Primary Gemini was unavailable and backup providers could not respond."
                : "LLM provider request failed.";

        state = activateFallback(
          state,
          fallbackReason
        );

        notify({
          type:
            "GEMINI_FALLBACK",

          agent:
            activeAgent,

          offer:
            state.currentOffer,

          response:
            null,
        });

        response =
          runRuleBasedDecision(
            state,
            activeAgent,
            opponentOffer
          );
      }
    }

    // Simulation Mode keeps its existing pacing rule. This is intentionally
    // separate from Practice Mode, where the human may accept/reject at any time.
    const ownOfferCount = getAgentOfferCount(state, activeAgent.id);
    if (
      response.decision === DECISION.ACCEPT &&
      opponentOffer &&
      (state.currentRound < MIN_ROUNDS_BEFORE_ACCEPT ||
        ownOfferCount < MIN_OFFERS_BEFORE_ACCEPT)
    ) {
      response = createRequiredConcessionCounter(
        state,
        activeAgent,
        opponentOffer,
        response
      );
    }

    // =================================================
    // APPLY RESPONSE
    // =================================================

    const previousOffer =
      state.currentOffer;

    state =
      applyAgentResponse(
        state,
        activeAgent,
        response
      );

    // =================================================
    // ACCEPT
    // =================================================

    if (
      response.decision ===
      DECISION.ACCEPT
    ) {
      notify({
        type:
          "ACCEPT",

        agent:
          activeAgent,

        offer:
          state.currentOffer,

        response,
      });

      break;
    }

    // =================================================
    // REJECT
    // =================================================

    if (
      response.decision ===
      DECISION.REJECT
    ) {
      notify({
        type:
          "REJECT",

        agent:
          activeAgent,

        offer:
          previousOffer,

        response,
      });

      break;
    }

    // =================================================
    // OFFER / COUNTER
    // =================================================

    if (
      response.decision ===
        DECISION.MAKE_OFFER ||
      response.decision ===
        DECISION.COUNTER
    ) {
      notify({
        type:
          response.decision ===
          DECISION.MAKE_OFFER
            ? "OPENING_OFFER"
            : "COUNTER",

        agent:
          activeAgent,

        offer:
          state.currentOffer,

        response,
      });
    }

    // =================================================
    // NO-PROGRESS DEADLOCK
    // =================================================

    if (
      hasNoProgressDeadlock(
        state
      )
    ) {
      state = {
        ...state,

        status:
          NEGOTIATION_STATUS.DEADLOCK,

        currentAgentTurn:
          null,

        terminationReason:
          "No meaningful movement in recent offers.",
      };

      state =
        addHistory(
          state,
          {
            type:
              "SYSTEM",

            event:
              "DEADLOCK",

            round:
              state.currentRound,

            message:
              state.terminationReason,
          }
        );

      notify({
        type:
          "DEADLOCK",

        agent:
          activeAgent,

        offer:
          state.currentOffer,
      });

      break;
    }

    // =================================================
    // MOVE TO NEXT AGENT
    // =================================================

    state =
      moveToNextTurn(
        state,
        activeAgent
      );
  }

  // =====================================================
  // FINAL SAFETY
  // =====================================================

  if (
    state.status ===
      NEGOTIATION_STATUS.IN_PROGRESS
  ) {
    state = {
      ...state,

      status:
        NEGOTIATION_STATUS.COMPLETED,

      currentAgentTurn:
        null,

      terminationReason:
        state.usingFallback
          ? "Negotiation completed using the rule-based fallback engine."
          : "Negotiation completed.",
    };

    state =
      addHistory(
        state,
        {
          type:
            "SYSTEM",

          event:
            "COMPLETED",

          round:
            state.currentRound,

          message:
            state.terminationReason,
        }
      );

    notify({
      type:
        "COMPLETED",

      agent:
        null,

      offer:
        state.currentOffer,
    });
  }

  // =====================================================
  // FINAL DEBUG
  // =====================================================

  console.log(
    "======================================"
  );

  console.log(
    "🏁 NEGOTIATION FINISHED"
  );

  console.log(
    "======================================"
  );

  console.log(
    "Status:",
    state.status
  );

  console.log(
    "Rounds:",
    state.currentRound
  );

  console.log(
    "Gemini calls:",
    state.geminiCallsUsed
  );

  console.log(
    "Offers:",
    state.offers?.length ||
      0
  );

  console.log(
    "Concessions:",
    state.concessions?.length ||
      0
  );

  console.log(
    "Concession data:",
    state.concessions
  );

  return state;
}