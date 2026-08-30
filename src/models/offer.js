export function createOffer({
  value,
  terms = {},
  agentId,
  round,
  reason = "",
}) {
  return {
    value,
    terms,
    agentId,
    round,
    reason,
    timestamp: new Date().toISOString(),
  };
}