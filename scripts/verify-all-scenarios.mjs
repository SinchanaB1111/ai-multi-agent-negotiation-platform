import assert from "node:assert/strict";

import { scenarios } from "../src/data/scenarios.js";
import {
  createNegotiationState,
  startNegotiation,
} from "../src/logic/negotiationState.js";
import { runAutomaticNegotiation } from "../src/logic/orchestrator.js";

assert.ok(scenarios.length >= 8, "The scenario library should contain at least 8 built-in scenarios.");

for (const scenario of scenarios) {
  assert.equal(scenario.agents.length, 2, `${scenario.name} must have exactly 2 agents.`);

  const state = startNegotiation(
    createNegotiationState(scenario, scenario.agents, 5)
  );

  const finalState = await runAutomaticNegotiation(
    {
      ...state,
      // Test the guaranteed local fallback path so this verification never
      // depends on external API keys, quotas, or network availability.
      usingFallback: true,
    },
    null,
    { maxGeminiCalls: 10, stepDelayMs: 0 }
  );

  assert.ok(
    ["AGREEMENT", "REJECTED", "DEADLOCK", "COMPLETED"].includes(finalState.status),
    `${scenario.name} ended with an invalid status.`
  );
  assert.ok(finalState.offers.length >= 2, `${scenario.name} must create multiple offers.`);
  assert.ok(finalState.history.length >= finalState.offers.length, `${scenario.name} history is incomplete.`);
  assert.ok(finalState.currentAgentTurn === null, `${scenario.name} must end with no active turn.`);

  console.log(
    `✅ ${scenario.name}: ${finalState.status} | rounds=${finalState.currentRound} | offers=${finalState.offers.length} | concessions=${finalState.concessions.length}`
  );
}

console.log(`✅ All ${scenarios.length} negotiation scenarios passed end-to-end fallback verification.`);
