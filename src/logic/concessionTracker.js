// src/logic/concessionTracker.js

export function calculateConcession(previousOffer, currentOffer) {
  if (!previousOffer || !currentOffer) return null;
  if (previousOffer.agentId !== currentOffer.agentId) return null;

  const difference = currentOffer.value - previousOffer.value;

  return {
    fromRound: previousOffer.round,
    toRound: currentOffer.round,
    agentId: currentOffer.agentId,
    agentName: currentOffer.agentName || null,
    previousOffer: previousOffer.value,
    currentOffer: currentOffer.value,
    direction:
      difference > 0
        ? "INCREASE"
        : difference < 0
          ? "DECREASE"
          : "NO CHANGE",
    change: Math.abs(difference),
    signedChange: difference,
    percentage:
      previousOffer.value === 0
        ? 0
        : (difference / previousOffer.value) * 100,
    timestamp: currentOffer.timestamp || new Date().toISOString(),
  };
}

export function getConcessionSummary(concessions = [], agentId = null) {
  const relevant = concessions.filter(
    (item) => !agentId || item?.agentId === agentId
  );

  return {
    count: relevant.length,
    totalChange: relevant.reduce(
      (total, item) => total + (Number(item?.change) || 0),
      0
    ),
    lastChange:
      relevant.length > 0
        ? relevant[relevant.length - 1]
        : null,
  };
}

export function hasExcessiveConcession(
  previousOffer,
  currentOffer,
  maximumFraction = 0.35
) {
  if (!previousOffer || !currentOffer) return false;
  if (previousOffer.agentId !== currentOffer.agentId) return false;
  if (!Number.isFinite(previousOffer.value) || previousOffer.value === 0) {
    return false;
  }

  const movement = Math.abs(currentOffer.value - previousOffer.value);
  return movement / Math.abs(previousOffer.value) > maximumFraction;
}
