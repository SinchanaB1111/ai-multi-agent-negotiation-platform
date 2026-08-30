export const NegotiationStatus = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  AGREEMENT: "Agreement",
  REJECTED: "Rejected",
  DEADLOCK: "Deadlock",
  COMPLETED: "Completed",
};

export function createNegotiationState(scenario, agents) {
  return {
    scenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
    },

    currentRound: 1,

    currentAgentTurn: agents?.[0]?.id || null,

    previousOffer: null,

    currentOffer: null,

    status: NegotiationStatus.NOT_STARTED,

    agentGoals: agents.map((agent) => ({
      agentId: agent.id,
      goal: agent.goal,
    })),

    agentConstraints: agents.map((agent) => ({
      agentId: agent.id,
      constraints: agent.constraints,
    })),

    agentPersonality: agents.map((agent) => ({
      agentId: agent.id,
      personality: agent.personality,
    })),

    negotiationHistory: [],
  };
}