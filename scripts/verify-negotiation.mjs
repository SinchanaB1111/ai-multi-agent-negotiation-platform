import assert from "node:assert/strict";

import { scenarios } from "../src/data/scenarios.js";
import {
  DECISION,
  evaluateOfferDetails,
  generateCounterOffer,
} from "../src/logic/decisionEngine.js";
import {
  calculateConcession,
  getConcessionSummary,
  hasExcessiveConcession,
} from "../src/logic/concessionTracker.js";
import {
  createNegotiationState,
  startNegotiation,
} from "../src/logic/negotiationState.js";

const scenario = scenarios.find(
  (item) => item.name === "Vendor Pricing Negotiation"
);

assert.ok(scenario, "Vendor Pricing Negotiation scenario must exist.");

const buyer = scenario.agents[0];
const vendor = scenario.agents[1];

// 1. Very favorable / acceptable offers.
const buyerFavorable = evaluateOfferDetails(buyer, 99000, {
  currentRound: 3,
  previousOffers: [],
});
assert.equal(buyerFavorable.decision, DECISION.ACCEPT);

const vendorFavorable = evaluateOfferDetails(vendor, 101000, {
  currentRound: 3,
  previousOffers: [],
});
assert.equal(vendorFavorable.decision, DECISION.ACCEPT);

// 2. Partially acceptable offers should normally be counters.
const buyerNegotiable = evaluateOfferDetails(buyer, 106000, {
  currentRound: 2,
  previousOffers: [],
});
assert.equal(buyerNegotiable.decision, DECISION.COUNTER);

const vendorNegotiable = evaluateOfferDetails(vendor, 95000, {
  currentRound: 2,
  previousOffers: [],
});
assert.equal(vendorNegotiable.decision, DECISION.COUNTER);

// 3. Offers outside hard constraints must be rejected.
const buyerBad = evaluateOfferDetails(buyer, 111000, {
  currentRound: 2,
  previousOffers: [],
});
assert.equal(buyerBad.decision, DECISION.REJECT);

const vendorBad = evaluateOfferDetails(vendor, 79000, {
  currentRound: 2,
  previousOffers: [],
});
assert.equal(vendorBad.decision, DECISION.REJECT);

// 4. Counteroffers remain inside constraints.
const buyerCounter = generateCounterOffer(buyer, 105000, 108000);
assert.ok(buyerCounter <= buyer.negotiation.maximumAcceptable);

const vendorCounter = generateCounterOffer(vendor, 90000, 88000);
assert.ok(vendorCounter >= vendor.negotiation.minimumAcceptable);

// 5. Concession tracking across 5 rounds.
let buyerOffers = [
  { id: "b1", agentId: "buyer", value: 105000, round: 1 },
  { id: "b2", agentId: "buyer", value: 104000, round: 2 },
  { id: "b3", agentId: "buyer", value: 103000, round: 3 },
  { id: "b4", agentId: "buyer", value: 102000, round: 4 },
  { id: "b5", agentId: "buyer", value: 101000, round: 5 },
];

const concessions = [];
for (let i = 1; i < buyerOffers.length; i += 1) {
  const concession = calculateConcession(
    buyerOffers[i - 1],
    buyerOffers[i]
  );
  assert.ok(concession);
  concessions.push(concession);
}

const summary = getConcessionSummary(concessions, "buyer");
assert.equal(summary.count, 4);
assert.equal(summary.totalChange, 4000);
assert.equal(hasExcessiveConcession(buyerOffers[3], buyerOffers[4]), false);

// 6. Negotiation state supports a 5-round Vendor Pricing session.
const state = startNegotiation(
  createNegotiationState(scenario, scenario.agents, 5)
);
assert.equal(state.maxRounds, 5);
assert.equal(state.status, "IN_PROGRESS");
assert.equal(state.currentRound, 1);

console.log("✅ Negotiation decision verification passed.");
console.log("   Vendor Pricing: Accept / Counter / Reject tested.");
console.log("   Counteroffer constraints: passed.");
console.log("   Concession tracking: 5-round sequence passed.");
console.log("   Max rounds: 5.");
