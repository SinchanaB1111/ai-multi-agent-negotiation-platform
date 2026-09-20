// src/logic/negotiationState.js

export const NEGOTIATION_STATE_VERSION = 2;

export const NEGOTIATION_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  AGREEMENT: "AGREEMENT",
  REJECTED: "REJECTED",
  DEADLOCK: "DEADLOCK",
  COMPLETED: "COMPLETED",
};

export function createNegotiationState(scenario, agents, maxRounds = 5) {
  if (!scenario) throw new Error("Scenario is required.");
  if (!Array.isArray(agents) || agents.length !== 2) {
    throw new Error("Exactly two agents are required.");
  }

  return {
    sessionId: `NEG-${Date.now()}`,
    scenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      negotiationType: scenario.negotiationType,
    },

    stateVersion: NEGOTIATION_STATE_VERSION,

    turn: {
      round: 1,
      maxRounds,
      activeAgentId: agents[0].id,
    },

    // Backward-compatible aliases used by existing UI/report code.
    currentRound: 1,
    maxRounds,
    currentAgentTurn: agents[0].id,

    previousOffer: null,
    currentOffer: null,

    status: NEGOTIATION_STATUS.NOT_STARTED,

    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      goal: agent.goal,
      goals: [agent.goal],
      constraints: agent.constraints,
      personality: agent.personality,
      decisionType: agent.decisionType,
      negotiation: agent.negotiation,
    })),

    offers: [],
    counteroffers: [],
    decisions: [],
    history: [],
    concessions: [],

    metrics: {
      totalOffers: 0,
      totalCounteroffers: 0,
      totalDecisions: 0,
      totalConcessions: 0,
    },

    lastDecision: null,
    agreement: null,
    terminationReason: null,
  };
}

export function syncTurn(state) {
  const round = Number(state.turn?.round || state.currentRound || 1);
  const maxRounds = Number(state.turn?.maxRounds || state.maxRounds || 5);
  const activeAgentId = state.turn?.activeAgentId ?? state.currentAgentTurn ?? null;

  return {
    ...state,
    turn: { round, maxRounds, activeAgentId },
    currentRound: round,
    maxRounds,
    currentAgentTurn: activeAgentId,
  };
}

export function startNegotiation(state) {
  if (state.status !== NEGOTIATION_STATUS.NOT_STARTED) return state;

  return syncTurn({
    ...state,
    status: NEGOTIATION_STATUS.IN_PROGRESS,
    history: [
      ...state.history,
      {
        type: "SYSTEM",
        event: "NEGOTIATION_STARTED",
        round: state.currentRound,
        timestamp: new Date().toISOString(),
        message: "Negotiation started.",
      },
    ],
  });
}
