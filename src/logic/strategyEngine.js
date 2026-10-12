// Deterministic strategic layer for realistic negotiation behavior.
// This layer does not expose hidden reasoning. It only uses observable
// scenario/state data: goals, limits, alternatives, leverage, offers and
// concession history.

export const STRATEGY = Object.freeze({
  ANCHOR: "ANCHOR",
  PROBE: "PROBE",
  RECIPROCAL_CONCESSION: "RECIPROCAL_CONCESSION",
  CONDITIONAL_TRADE: "CONDITIONAL_TRADE",
  HOLD: "HOLD",
});

const PERSONALITY = {
  Aggressive: { concession: 0.16, anchor: 0.82, trade: 0.18 },
  Collaborative: { concession: 0.30, anchor: 0.52, trade: 0.72 },
  "Risk-Averse": { concession: 0.20, anchor: 0.62, trade: 0.42 },
};

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function getNegotiationProfile(agent = {}) {
  const n = agent.negotiation || {};
  const target = finite(n.targetValue);
  const minimum = finite(n.minimumAcceptable);
  const maximum = finite(n.maximumAcceptable);
  const batna = finite(n.batnaValue ?? agent.batnaValue);
  const leverage = finite(n.leverage ?? agent.leverage);
  const personality = PERSONALITY[agent.personality] || PERSONALITY.Collaborative;

  let derivedLeverage = leverage;
  if (derivedLeverage == null && target != null) {
    const reservation = agent.decisionType === "minimize" ? maximum : minimum;
    const span = reservation == null ? Math.abs(target) : Math.abs(reservation - target);
    const tolerance = Math.max(1, Math.abs(target) * 0.20);
    derivedLeverage = clamp(0.5 + (span / tolerance - 0.5) * 0.35);
  }

  if (batna != null && target != null) {
    const reservation = agent.decisionType === "minimize" ? maximum : minimum;
    const batnaPressure = reservation == null ? 0 :
      agent.decisionType === "minimize"
        ? clamp((batna - target) / Math.max(1, Math.abs(reservation - target)))
        : clamp((target - batna) / Math.max(1, Math.abs(reservation - target)));
    derivedLeverage = clamp(((derivedLeverage ?? 0.5) * 0.65) + (batnaPressure * 0.35));
  }

  return {
    target,
    minimum,
    maximum,
    batna,
    leverage: clamp(derivedLeverage ?? 0.5),
    priorities: Array.isArray(agent.priorities) ? agent.priorities : [],
    interests: Array.isArray(agent.interests) ? agent.interests : [],
    alternatives: Array.isArray(agent.alternatives) ? agent.alternatives : [],
    negotiableTerms: Array.isArray(agent.negotiableTerms) ? agent.negotiableTerms : [],
    personality,
  };
}

export function chooseStrategy(agent, context = {}) {
  const profile = getNegotiationProfile(agent);
  const round = Number(context.currentRound || 1);
  const maxRounds = Math.max(1, Number(context.maxRounds || 5));
  const ownOffers = Array.isArray(context.ownOffers) ? context.ownOffers : [];
  const opponentOffer = finite(context.opponentOffer);
  const previousOwn = finite(context.previousOwnOffer);
  const gap = previousOwn == null || opponentOffer == null ? null : Math.abs(opponentOffer - previousOwn);
  const lastConcession = finite(context.lastConcession);

  if (ownOffers.length === 0) return STRATEGY.ANCHOR;
  if (gap === 0) return STRATEGY.PROBE;

  if (round >= maxRounds - 1 && gap != null) return STRATEGY.RECIPROCAL_CONCESSION;

  if (profile.personality.trade >= 0.6 && profile.negotiableTerms.length > 0 && round >= 2) {
    return STRATEGY.CONDITIONAL_TRADE;
  }

  if (profile.leverage >= 0.72 && (lastConcession == null || lastConcession < Math.abs(previousOwn || 0) * 0.01)) {
    return STRATEGY.HOLD;
  }

  return STRATEGY.RECIPROCAL_CONCESSION;
}

export function getStrategicConcessionFraction(agent, context = {}) {
  const profile = getNegotiationProfile(agent);
  const strategy = chooseStrategy(agent, context);
  const round = Number(context.currentRound || 1);
  const maxRounds = Math.max(1, Number(context.maxRounds || 5));
  const progress = clamp((round - 1) / Math.max(1, maxRounds - 1));

  let rate = profile.personality.concession;
  // Strong alternatives/leverage -> preserve position. Weak alternatives -> trade more.
  rate *= 1.15 - profile.leverage * 0.70;
  rate *= 0.92 + progress * 0.18;

  if (strategy === STRATEGY.ANCHOR) rate *= 0.45;
  if (strategy === STRATEGY.HOLD) rate *= 0.35;
  if (strategy === STRATEGY.PROBE) rate *= 0.55;
  if (strategy === STRATEGY.CONDITIONAL_TRADE) rate *= 0.78;
  if (strategy === STRATEGY.RECIPROCAL_CONCESSION) rate *= 1.0;

  // Avoid implausible one-turn jumps while still allowing meaningful movement.
  return clamp(rate, 0.04, 0.38);
}

export function buildConditionalTrade(agent, context = {}) {
  const profile = getNegotiationProfile(agent);
  const term = profile.negotiableTerms[Number(context.currentRound || 1) % Math.max(1, profile.negotiableTerms.length)]
    || profile.interests[0]
    || null;
  if (!term) return null;

  const name = typeof term === "string" ? term : term.name || term.label || "terms";
  const give = agent.decisionType === "minimize" ? "price movement" : "value/commitment";
  return `Conditional trade: movement on ${give} is offered in exchange for improved ${name}.`;
}

export function explainStrategy(agent, strategy, context = {}) {
  const profile = getNegotiationProfile(agent);
  const terms = buildConditionalTrade(agent, context);
  const leverageText = profile.leverage >= 0.7 ? "strong leverage" : profile.leverage <= 0.3 ? "limited leverage" : "balanced leverage";

  switch (strategy) {
    case STRATEGY.ANCHOR:
      return `Opening position uses an anchor around ${agent.negotiation?.targetValue ?? "the target"}, preserving room for later bargaining.`;
    case STRATEGY.HOLD:
      return `The agent is holding its position because observable alternatives/leverage support protecting its current boundary.`;
    case STRATEGY.PROBE:
      return `The agent is probing rather than repeatedly conceding because the opponent has not moved from the current position.`;
    case STRATEGY.CONDITIONAL_TRADE:
      return terms || `The agent is using a conditional trade to exchange movement across negotiable terms.`;
    default:
      return `The agent is making a measured reciprocal concession based on the opponent's observable movement and ${leverageText}.`;
  }
}

export function validateStrategicOffer(agent, value, previousValue = null) {
  const profile = getNegotiationProfile(agent);
  const numeric = finite(value);
  if (numeric == null || numeric <= 0) return { valid: false, reason: "Offer must be a positive finite number." };
  if (agent.decisionType === "minimize" && profile.maximum != null && numeric > profile.maximum) {
    return { valid: false, reason: "Offer exceeds the agent's hard maximum." };
  }
  if (agent.decisionType === "maximize" && profile.minimum != null && numeric < profile.minimum) {
    return { valid: false, reason: "Offer is below the agent's hard minimum." };
  }
  if (previousValue != null && numeric === previousValue) {
    return { valid: false, reason: "Repeated identical offer requires a different move or explicit hold strategy." };
  }
  return { valid: true, reason: "Offer is strategically valid." };
}
