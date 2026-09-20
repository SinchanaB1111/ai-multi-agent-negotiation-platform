// src/logic/agentInput.js

export function createAgentInput(
  agentProfile,
  negotiationState,
  history = negotiationState?.history || [],
  opponentOffer = negotiationState?.currentOffer || null
) {
  if (!agentProfile) throw new Error("Agent profile is required.");
  if (!negotiationState) throw new Error("Negotiation state is required.");

  return {
    agentPersona: {
      id: agentProfile.id,
      name: agentProfile.name,
      personality: agentProfile.personality,
    },
    role: agentProfile.role,
    goals: agentProfile.goals || [agentProfile.goal],
    constraints: agentProfile.constraints,
    decisionType: agentProfile.decisionType,
    negotiation: agentProfile.negotiation,

    currentNegotiationState: {
      scenario: negotiationState.scenario,
      currentRound: negotiationState.currentRound,
      currentAgentTurn: negotiationState.currentAgentTurn,
      previousOffer: negotiationState.previousOffer,
      currentOffer: negotiationState.currentOffer,
      status: negotiationState.status,
      lastDecision: negotiationState.lastDecision,
    },

    previousConversation: history,

    opponentOffer: opponentOffer
  ? {
      id: opponentOffer.id,
      value: opponentOffer.value,
      terms: opponentOffer.terms,
      agentId: opponentOffer.agentId,
      round: opponentOffer.round,
      reason: opponentOffer.reason,
      timestamp: opponentOffer.timestamp,
    }
  : null,

    currentOpponentOffer: opponentOffer
      ? {
          id: opponentOffer.id,
          value: opponentOffer.value,
          terms: opponentOffer.terms,
          agentId: opponentOffer.agentId,
          round: opponentOffer.round,
          reason: opponentOffer.reason,
          timestamp: opponentOffer.timestamp,
        }
      : null,
  };
}
