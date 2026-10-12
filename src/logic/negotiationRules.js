// Shared deterministic negotiation rules.
// The LLM proposes strategy; these rules define the feasible negotiation space
// and the behavior of the safety/fallback engine.

export const PERSONALITY_CONCESSION = {
  Aggressive: 0.28,
  Collaborative: 0.42,
  "Risk-Averse": 0.32,
};

export const PERSONALITY_OPENING_STANCE = {
  Aggressive: 0.72,
  Collaborative: 0.45,
  "Risk-Averse": 0.60,
};

export function calculateZOPA(agents = []) {
  const minimizeAgents = agents.filter((agent) => agent?.decisionType === "minimize");
  const maximizeAgents = agents.filter((agent) => agent?.decisionType === "maximize");

  if (!minimizeAgents.length || !maximizeAgents.length) {
    return {
      exists: false,
      lowerBound: null,
      upperBound: null,
      width: 0,
      reason: "A two-sided minimize/maximize negotiation is required to calculate a monetary ZOPA.",
    };
  }

  const lowerBound = Math.max(
    ...maximizeAgents.map((agent) => Number(agent.negotiation?.minimumAcceptable)).filter(Number.isFinite)
  );
  const upperBound = Math.min(
    ...minimizeAgents.map((agent) => Number(agent.negotiation?.maximumAcceptable)).filter(Number.isFinite)
  );

  if (!Number.isFinite(lowerBound) || !Number.isFinite(upperBound)) {
    return {
      exists: false,
      lowerBound: null,
      upperBound: null,
      width: 0,
      reason: "One or more agents are missing a hard reservation boundary.",
    };
  }

  const width = Math.max(0, upperBound - lowerBound);
  return {
    exists: lowerBound <= upperBound,
    lowerBound,
    upperBound,
    width,
    reason: lowerBound <= upperBound
      ? `A feasible agreement zone exists between ${lowerBound} and ${upperBound}.`
      : `No feasible agreement exists because the required minimum exceeds the opposing maximum.`,
  };
}

export function getRoundPressure(currentRound = 1, maxRounds = 5) {
  const round = Math.max(1, Number(currentRound) || 1);
  const max = Math.max(round, Number(maxRounds) || 5);
  const progress = max <= 1 ? 1 : Math.min(1, (round - 1) / (max - 1));
  // Pressure is deliberately gradual: negotiations become more flexible as
  // the deadline approaches, without making early rounds unrealistically soft.
  return 0.25 + progress * 0.75;
}

export function getPersonalityConcessionRate(personality, currentRound = 1, maxRounds = 5) {
  const base = PERSONALITY_CONCESSION[personality] ?? PERSONALITY_CONCESSION.Collaborative;
  return Math.min(0.65, base * (0.85 + getRoundPressure(currentRound, maxRounds) * 0.60));
}

export function getOpeningStance(personality) {
  return PERSONALITY_OPENING_STANCE[personality] ?? PERSONALITY_OPENING_STANCE.Collaborative;
}

export function getAcceptanceFlexibility(personality) {
  switch (personality) {
    case "Aggressive": return 0.55;
    case "Risk-Averse": return 0.60;
    case "Collaborative": return 0.55;
    default: return 0.22;
  }
}

export function isClearlyUnreasonableOffer(agent, offerValue) {
  const value = Number(offerValue);
  if (!Number.isFinite(value) || value <= 0 || !agent?.negotiation) return true;

  const target = Number(agent.negotiation.targetValue);
  const minimum = Number(agent.negotiation.minimumAcceptable);
  const maximum = Number(agent.negotiation.maximumAcceptable);

  // A normal hard-boundary miss can still be answered with a counteroffer.
  // An extreme outlier is rejected immediately in EITHER direction. This is
  // important because a mathematically favourable offer is not automatically
  // a realistic negotiation proposal: ₹1 against a ₹11,00,000 salary target
  // should not be accepted simply because the employer prefers a lower salary.
  //
  // Use the target as the realism anchor and keep the threshold deliberately
  // broad (50% / 150%) so legitimate aggressive openings can still negotiate.
  if (agent.decisionType === "maximize" && Number.isFinite(target)) {
    return value > target * 1.50;
  }

  if (agent.decisionType === "minimize" && Number.isFinite(target)) {
    return value < target * 0.50;
  }

  // Fallback for malformed/legacy agents that have no target.
  if (agent.decisionType === "maximize" && Number.isFinite(minimum)) {
    return value < minimum * 0.50;
  }

  if (agent.decisionType === "minimize" && Number.isFinite(maximum)) {
    return value > maximum * 1.50;
  }

  return false;
}

export function getMeaningfulMovementThreshold(agent, referenceValue) {
  const reference = Math.max(1, Math.abs(Number(referenceValue) || Number(agent?.negotiation?.targetValue) || 1));
  // 0.25% is enough to distinguish real progress from tiny oscillations while
  // remaining useful for large and small monetary scenarios.
  return Math.max(1, reference * 0.0025);
}
