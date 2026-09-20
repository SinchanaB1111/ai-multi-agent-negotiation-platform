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

  state = await processPracticeOffer(state, { value: 110000, reason: "Human opening offer" });
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.currentRound, 2);
  assert.equal(state.currentAgentTurn, agents[0].id);
  assert.equal(state.currentOffer.agentId, agents[1].id);

  state = await processPracticeOffer(state, { value: 105000, reason: "Human concession" });
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.currentRound, 3);
  assert.ok(Number.isFinite(state.currentOffer.value) && state.currentOffer.value > 0);
  assert.equal(state.offers.length, 4);
  assert.ok(state.history.some((item) => item.event === "ROUND_ADVANCED"));
  assert.ok(state.concessions.some((item) => item.agentId === agents[0].id && item.change === 5000));
  assert.ok(state.concessions.some((item) => item.agentId === agents[1].id && item.change === 1750));
  assert.equal(state.metrics.totalConcessions, state.concessions.length);

  const historyBeforeAccept = state.history.length;
  state = processPracticeDecision(state, "ACCEPT", "Human accepted the AI's good counteroffer.");
  assert.equal(state.status, "AGREEMENT");
  assert.equal(state.agreement.offer.value, state.currentOffer.value);
  assert.equal(state.agreement.agentId, agents[0].id);
  assert.ok(state.history.length > historyBeforeAccept);
  assert.ok(state.history.some((item) => item.type === "DECISION" && item.decision === "ACCEPT" && item.source === "HUMAN"));
  assert.equal(state.metrics.totalOffers, 4);
  assert.equal(state.metrics.totalCounteroffers, 2);
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
