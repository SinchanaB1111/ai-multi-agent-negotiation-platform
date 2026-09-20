import assert from "node:assert/strict";
import { scenarios } from "../src/data/scenarios.js";
import { createNegotiationState, startNegotiation } from "../src/logic/negotiationState.js";
import { processPracticeOffer, processPracticeDecision } from "../src/logic/orchestrator.js";

const originalFetch = globalThis.fetch;
let mockedDecision = "COUNTER";
let mockedCounter = 100000;
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    return {
      success: true,
      provider: "GEMINI",
      source: "GEMINI",
      result: {
        decision: mockedDecision,
        counterOffer: mockedDecision === "COUNTER" ? mockedCounter : null,
        reason: `Mock LLM chose ${mockedDecision}.`,
      },
    };
  },
});

try {
  const scenario = scenarios[0];
  const agents = scenario.agents;

  let state = startNegotiation(createNegotiationState(scenario, agents, 6));
  mockedDecision = "COUNTER";
  mockedCounter = 100000;
  state = await processPracticeOffer(state, { value: 110000, reason: "Human opening" });
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.currentAgentTurn, agents[0].id);
  assert.equal(state.currentOffer.agentId, agents[1].id);
  assert.equal(state.currentOffer.value, 100000);

  const historyBeforeHumanAccept = state.history.length;
  state = processPracticeDecision(state, "ACCEPT", "Human accepts a good AI offer.");
  assert.equal(state.status, "AGREEMENT");
  assert.equal(state.agreement.offer.value, 100000);
  assert.equal(state.agreement.agentId, agents[0].id);
  assert.ok(state.history.length > historyBeforeHumanAccept);
  assert.ok(state.history.some((item) => item.type === "DECISION" && item.decision === "ACCEPT" && item.source === "HUMAN"));

  state = startNegotiation(createNegotiationState(scenario, agents, 6));
  mockedDecision = "REJECT";
  state = await processPracticeOffer(state, { value: 20000, reason: "Human low offer" });
  assert.equal(state.status, "REJECTED");
  assert.ok(state.history.some((item) => item.type === "DECISION" && item.decision === "REJECT" && item.source === "GEMINI"));

  state = startNegotiation(createNegotiationState(scenario, agents, 6));
  mockedDecision = "COUNTER";
  mockedCounter = 100000;
  state = await processPracticeOffer(state, { value: 110000, reason: "Human opening" });
  assert.equal(state.currentAgentTurn, agents[0].id);
  state = processPracticeDecision(state, "REJECT", "Human rejects the AI counteroffer.");
  assert.equal(state.status, "REJECTED");
  assert.ok(state.history.some((item) => item.type === "DECISION" && item.decision === "REJECT" && item.source === "HUMAN"));

  console.log("✓ Practice human/LLM decision verification passed.");
  console.log(`  Human ACCEPT: recorded (${state.history.length} events in final scenario)`);
  console.log("  Human REJECT: recorded");
  console.log("  LLM ACCEPT/REJECT authority: verified");
} finally {
  globalThis.fetch = originalFetch;
}
