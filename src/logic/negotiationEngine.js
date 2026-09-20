// src/logic/negotiationEngine.js
// Compatibility layer for the UI.

import {
  createNegotiationState,
  startNegotiation,
} from "./negotiationState.js";
import {
  recordOffer,
  evaluateCurrentOffer,
  applyDecision,
  processOffer,
} from "./orchestrator.js";

export function createNegotiation(scenario, agents = scenario?.agents || []) {
  return startNegotiation(createNegotiationState(scenario, agents));
}

export {
  recordOffer,
  evaluateCurrentOffer,
  applyDecision,
  processOffer,
};
