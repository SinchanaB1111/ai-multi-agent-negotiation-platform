// src/logic/personalityPolicy.js

/**
 * Personality affects the agent's acceptance preference, but never changes
 * its hard constraint. The agent still decides only ACCEPT / REJECT / COUNTER.
 * It does NOT generate a counteroffer amount.
 */
export const PERSONALITY_POLICY = {
  Aggressive: {
    acceptanceTolerance: 0,
    label: "Protects its target strongly and accepts only at or very near the target.",
  },
  Collaborative: {
    acceptanceTolerance: 0.03,
    label: "Allows a reasonable compromise when the offer remains within the acceptable boundary.",
  },
  "Risk-Averse": {
    acceptanceTolerance: 0.01,
    label: "Uses a stricter acceptance boundary and prefers offers close to its target.",
  },
};

export function getPersonalityPolicy(personality) {
  return PERSONALITY_POLICY[personality] || PERSONALITY_POLICY.Collaborative;
}

export function getAcceptanceThreshold(agent) {
  if (!agent?.negotiation) {
    throw new Error("Agent negotiation constraints are required.");
  }

  const policy = getPersonalityPolicy(agent.personality);
  const { targetValue, maximumAcceptable, minimumAcceptable } = agent.negotiation;

  if (agent.decisionType === "minimize") {
    return Math.min(
      maximumAcceptable,
      targetValue * (1 + policy.acceptanceTolerance)
    );
  }

  if (agent.decisionType === "maximize") {
    return Math.max(
      minimumAcceptable,
      targetValue * (1 - policy.acceptanceTolerance)
    );
  }

  throw new Error(`Unknown decision type: ${agent.decisionType}`);
}
