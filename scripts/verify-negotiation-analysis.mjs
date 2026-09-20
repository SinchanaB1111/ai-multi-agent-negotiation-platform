import assert from "node:assert/strict";
import { scenarios } from "../src/data/scenarios.js";
import { createNegotiationState, startNegotiation } from "../src/logic/negotiationState.js";
import { recordOffer } from "../src/logic/orchestrator.js";
import { buildNegotiationAnalysis } from "../src/logic/negotiationAnalysis.js";

let state = startNegotiation(createNegotiationState(scenarios[0], scenarios[0].agents, 6));
state = recordOffer(state, { agentId: "buyer", value: 110000, reason: "Opening", source: "HUMAN" });
state = recordOffer(state, { agentId: "vendor", value: 105000, reason: "Counter", source: "RULE_BASED", eventType: "COUNTEROFFER" });
state = recordOffer(state, { agentId: "buyer", value: 106000, reason: "Concession", source: "HUMAN" });

const analysis = buildNegotiationAnalysis(state);
assert.equal(analysis.offers, 3);
assert.equal(analysis.concessions, 1);
assert.equal(analysis.counteroffers, 0);
assert.equal(analysis.agentAnalysis.find((a) => a.agentId === "buyer").concessionCount, 1);
assert.equal(analysis.agentAnalysis.find((a) => a.agentId === "buyer").behavior, "CONCEDED");
assert.ok(analysis.notes.length >= 1);

console.log("✓ Negotiation analysis verification passed.");
console.log(`  Offers: ${analysis.offers}`);
console.log(`  Concessions: ${analysis.concessions}`);
console.log(`  Rounds: ${analysis.rounds}`);
