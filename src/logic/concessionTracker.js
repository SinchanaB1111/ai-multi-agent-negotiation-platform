// Enhanced concession tracker based on the stronger multi-round tracking approach
// in the reference implementation, while preserving this project's original API.

export function extractScalarPrice(input) {
  if (input == null) return null;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Number(input.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof input === "object") {
    for (const key of ["value", "price", "amount", "offerValue"]) {
      const n = Number(input[key]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function getAuthoritativeTarget(agentProfile = {}, limit = null) {
  const target = extractScalarPrice(agentProfile?.negotiation?.targetValue ?? agentProfile?.targetValue);
  if (target != null) return target;
  return limit != null ? Number(limit) : null;
}

export function getAgentInitialPosition(history = [], agentId) {
  const item = history.find((h) => h?.agentId === agentId || h?.agent_id === agentId);
  return extractScalarPrice(item?.value ?? item?.offer ?? item?.proposed_offer);
}

export function getAgentPreviousPosition(history = [], agentId) {
  const items = history.filter((h) => h?.agentId === agentId || h?.agent_id === agentId);
  const item = items.at(-1);
  return extractScalarPrice(item?.value ?? item?.offer ?? item?.proposed_offer);
}

export function calculateRateOfConcessionDecay(concessionSizes = []) {
  if (concessionSizes.length < 2) return 0;
  const values = concessionSizes.map(Number).filter(Number.isFinite);
  if (values.length < 2 || values[0] === 0) return 0;
  return Math.round((1 - values.at(-1) / values[0]) * 100);
}

export function calculateDetailedConcession(agentProfile = {}, previousOffer = null, currentOffer = null, negotiationState = {}, initialPosition = null) {
  const previous = extractScalarPrice(previousOffer);
  const current = extractScalarPrice(currentOffer);
  const initial = initialPosition ?? previous;
  if (previous == null || current == null) {
    return { amount: 0, change: 0, rate: 0, cumulativeConcession: 0, remainingConcessionCapacity: null, initialPosition: initial, targetPosition: getAuthoritativeTarget(agentProfile) };
  }
  const direction = agentProfile?.decisionType === "minimize" ? "minimize" : "maximize";
  const change = current - previous;
  const concession = direction === "minimize" ? Math.max(0, change) : Math.max(0, -change);
  const base = Math.abs(Number(initial ?? previous)) || 1;
  const rate = (concession / base) * 100;
  const prior = Number(negotiationState?.concessionTotal?.[agentProfile?.id] || 0);
  const cumulative = prior + concession;
  const target = getAuthoritativeTarget(agentProfile);
  const limit = direction === "minimize" ? extractScalarPrice(agentProfile?.negotiation?.maximumAcceptable) : extractScalarPrice(agentProfile?.negotiation?.minimumAcceptable);
  const capacity = target != null && limit != null ? Math.abs(limit - target) : null;
  return { amount: concession, change, rate, cumulativeConcession: cumulative, remainingConcessionCapacity: capacity == null ? null : Math.max(0, capacity - cumulative), initialPosition: initial, targetPosition: target, direction };
}

export function applyConcessionControl(agentProfile, proposedPrice, previousPrice, initialPosition) {
  let price = Number(proposedPrice);
  if (!Number.isFinite(price)) return [proposedPrice, false, "Invalid proposed price"];
  const direction = agentProfile?.decisionType === "minimize" ? "minimize" : "maximize";
  const min = extractScalarPrice(agentProfile?.negotiation?.minimumAcceptable);
  const max = extractScalarPrice(agentProfile?.negotiation?.maximumAcceptable);
  const maxStep = Math.abs(Number(initialPosition ?? previousPrice ?? price)) * 0.15;
  let clamped = price;
  if (previousPrice != null && Number.isFinite(Number(previousPrice))) {
    const prev = Number(previousPrice);
    if (direction === "minimize") clamped = Math.max(prev - maxStep, price);
    else clamped = Math.min(prev + maxStep, price);
  }
  if (direction === "minimize" && max != null) clamped = Math.min(clamped, max);
  if (direction === "minimize" && min != null) clamped = Math.max(clamped, min);
  if (direction === "maximize" && min != null) clamped = Math.max(clamped, min);
  if (direction === "maximize" && max != null) clamped = Math.min(clamped, max);
  clamped = Math.round(clamped * 100) / 100;
  return [clamped, clamped !== price, clamped !== price ? "Concession control kept the response within gradual movement and hard limits." : "Within concession controls"];
}

export function buildConcessionTimeline(history = []) {
  const grouped = {};
  for (const entry of history) {
    const id = entry?.agentId ?? entry?.agent_id ?? "unknown";
    const value = extractScalarPrice(entry?.value ?? entry?.offer ?? entry?.proposed_offer);
    if (value == null) continue;
    if (!grouped[id]) grouped[id] = [];
    const previous = grouped[id].at(-1)?.value ?? value;
    grouped[id].push({ round: entry?.round ?? grouped[id].length + 1, value, delta: value - previous, agentId: id });
  }
  return grouped;
}

export function totalConcessionByAgent(timeline = {}) {
  return Object.fromEntries(Object.entries(timeline).map(([id, items]) => [id, items.reduce((sum, item) => sum + Math.abs(Number(item.delta || 0)), 0)]));
}

export function calculateConcession(previousOffer, currentOffer) {
  if (!previousOffer || !currentOffer) return null;
  if (previousOffer.agentId !== currentOffer.agentId) return null;
  const previous = extractScalarPrice(previousOffer);
  const current = extractScalarPrice(currentOffer);
  if (previous == null || current == null) return null;
  const difference = current - previous;
  return {
    fromRound: previousOffer.round,
    toRound: currentOffer.round,
    agentId: currentOffer.agentId,
    agentName: currentOffer.agentName || null,
    previousOffer: previous,
    currentOffer: current,
    direction: difference > 0 ? "INCREASE" : difference < 0 ? "DECREASE" : "NO CHANGE",
    change: Math.abs(difference),
    signedChange: difference,
    percentage: previous === 0 ? 0 : (difference / previous) * 100,
    timestamp: currentOffer.timestamp || new Date().toISOString(),
  };
}

export function getConcessionSummary(concessions = [], agentId = null) {
  const relevant = concessions.filter((item) => !agentId || item?.agentId === agentId);
  return {
    count: relevant.length,
    totalChange: relevant.reduce((total, item) => total + (Number(item?.change) || 0), 0),
    lastChange: relevant.at(-1) || null,
  };
}

export function hasExcessiveConcession(previousOffer, currentOffer, maximumFraction = 0.35) {
  if (!previousOffer || !currentOffer) return false;
  if (previousOffer.agentId !== currentOffer.agentId) return false;
  const previous = extractScalarPrice(previousOffer);
  const current = extractScalarPrice(currentOffer);
  if (previous == null || previous === 0 || current == null) return false;
  return Math.abs(current - previous) / Math.abs(previous) > maximumFraction;
}
