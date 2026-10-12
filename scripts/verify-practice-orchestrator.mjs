import assert from "node:assert/strict";
import { scenarios } from "../src/data/scenarios.js";
import { createNegotiationState, startNegotiation } from "../src/logic/negotiationState.js";
import { processPracticeOffer, processPracticeDecision } from "../src/logic/orchestrator.js";

const originalFetch = globalThis.fetch;
let llmCall = 0;
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    llmCall += 1;
    return {
      success: true,
      provider: "GEMINI",
      source: "GEMINI",
      result: {
        decision: "COUNTER",
        counterOffer: llmCall === 1 ? 100000 : 98000,
        reason: `LLM counteroffer ${llmCall}`,
      },
    };
  },
});

try {
  const scenario = scenarios[0];
  const agents = scenario.agents;
  let state = startNegotiation(createNegotiationState(scenario, agents, 6));

  // A realistic low opening should produce a counteroffer rather than an
  // immediate agreement. The human can then submit the exact AI counter,
  // which must be accepted as an explicit matching offer.
  state = await processPracticeOffer(state, { value: 90000, reason: "Human opening offer" });
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.currentRound, 2);
  assert.equal(state.currentAgentTurn, agents[0].id);
  assert.equal(state.currentOffer.agentId, agents[1].id);
  const aiCounter = state.currentOffer.value;
  assert.ok(aiCounter > 90000);

  const historyBeforeAccept = state.history.length;
  state = await processPracticeOffer(state, { value: aiCounter, reason: "Human matches the AI counteroffer" });
  assert.equal(state.status, "AGREEMENT");
  assert.equal(state.agreement.offer.value, aiCounter);
  assert.ok(state.history.length > historyBeforeAccept);
  assert.ok(state.history.some((item) => item.type === "DECISION" && item.decision === "ACCEPT"));
  assert.equal(state.status, "AGREEMENT");
  assert.equal(state.agreement.offer.value, state.currentOffer.value);
  assert.equal(state.agreement.agentId, agents[1].id);
  assert.equal(state.metrics.totalOffers, 3);
  assert.equal(state.metrics.totalCounteroffers, 1);
  assert.equal(state.metrics.totalDecisions, 1);

  console.log("✓ Practice orchestrator verification passed.");
  console.log(`  Rounds: ${state.currentRound}`);
  console.log(`  Offers: ${state.offers.length}`);
  console.log(`  Counteroffers: ${state.counteroffers.length}`);
  console.log(`  Concessions: ${state.concessions.length}`);
  console.log(`  History events: ${state.history.length}`);
  console.log("  Human ACCEPT: recorded by orchestrator");
} finally {
  globalThis.fetch = originalFetch;
}
