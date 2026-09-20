// src/logic/offer.js

export function createOffer({
  value,
  terms = null,
  agentId,
  agentName = null,
  round,
  reason = "",
}) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error("Offer value must be a positive number.");
  }

  return {
    id: `OFFER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "OFFER",
    value,
    terms,
    agentId,
    agentName,
    round,
    reason,
    timestamp: new Date().toISOString(),
  };
}
