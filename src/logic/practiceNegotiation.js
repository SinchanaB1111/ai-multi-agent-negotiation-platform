import { generateCounterOffer } from "./decisionEngine.js";

export function getSafeCounterOffer(agent, opponentValue, previousOwnOffer, llmValue, context = {}) {

  const deterministic = generateCounterOffer(
    agent,
    opponentValue,
    previousOwnOffer?.value ?? null,
    context
  );

  const candidate = Number(llmValue);
  const minimum = agent.negotiation?.minimumAcceptable;
  const maximum = agent.negotiation?.maximumAcceptable;
  const target = agent.negotiation?.targetValue;

  let safe = Number.isFinite(candidate) && candidate > 0 ? candidate : deterministic;

  // The LLM can suggest strategy, but it cannot escape the feasible joint
  // bargaining zone when one exists. This keeps Practice Mode realistic and
  // prevents an otherwise valid-looking LLM counter from being immediately
  // rejected by the other party's hard boundary.
  const opponentAgent = context?.opponentAgent;
  if (opponentAgent?.negotiation) {
    if (agent.decisionType === "minimize") {
      const lower = Number(opponentAgent.negotiation.minimumAcceptable);
      if (Number.isFinite(lower) && Number.isFinite(maximum) && lower <= maximum) safe = Math.max(lower, Math.min(maximum, safe));
    } else {
      const upper = Number(opponentAgent.negotiation.maximumAcceptable);
      if (Number.isFinite(upper) && Number.isFinite(minimum) && minimum <= upper) safe = Math.min(upper, Math.max(minimum, safe));
    }
  }

  if (agent.decisionType === "minimize") {
    if (typeof maximum === "number") safe = Math.min(safe, maximum);
    if (typeof previousOwnOffer?.value === "number") {
      // A minimizing agent should never move away from a lower opponent
      // offer, and should not repeat the same value when a feasible move exists.
      if (opponentValue < previousOwnOffer.value) {
        safe = Math.min(safe, previousOwnOffer.value);
      } else if (opponentValue > previousOwnOffer.value) {
        safe = Math.max(safe, previousOwnOffer.value);
      }
    }
    if (typeof target === "number" && opponentValue < previousOwnOffer?.value && safe >= previousOwnOffer.value) {
      safe = deterministic;
    }
  } else {
    if (typeof minimum === "number") safe = Math.max(safe, minimum);
    if (typeof previousOwnOffer?.value === "number") {
      // A maximizing agent should move upward toward a higher opponent
      // offer, and downward toward a lower opponent offer.
      if (opponentValue > previousOwnOffer.value) {
        safe = Math.max(safe, previousOwnOffer.value);
      } else if (opponentValue < previousOwnOffer.value) {
        safe = Math.min(safe, previousOwnOffer.value);
      }
    }
    if (typeof target === "number" && opponentValue > previousOwnOffer?.value && safe <= previousOwnOffer.value) {
      safe = deterministic;
    }
  }

  // If the LLM proposes no meaningful movement, use the deterministic
  // concession step. This keeps the negotiation converging instead of
  // producing the same counter repeatedly.
  if (
    previousOwnOffer &&
    safe === previousOwnOffer.value &&
    deterministic !== previousOwnOffer.value
  ) {
    safe = deterministic;
  }

  return Math.max(1, Math.round(safe));

}
