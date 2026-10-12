import assert from "node:assert/strict";
import { scenarios } from "../src/data/scenarios.js";
import {
  chooseStrategy,
  getNegotiationProfile,
  getStrategicConcessionFraction,
  buildConditionalTrade,
} from "../src/logic/strategyEngine.js";
import { generateCounterOffer, DECISION, evaluateOfferDetails } from "../src/logic/decisionEngine.js";

assert.ok(scenarios.length >= 8);
for (const scenario of scenarios) {
  for (const agent of scenario.agents) {
    const profile = getNegotiationProfile(agent);
    assert.ok(profile.leverage >= 0 && profile.leverage <= 1, `${scenario.name}: leverage out of range`);
    assert.ok(profile.batna != null, `${scenario.name}: BATNA missing for ${agent.name}`);
    assert.ok(profile.negotiableTerms.length > 0, `${scenario.name}: negotiable terms missing`);
    const rate = getStrategicConcessionFraction(agent, { currentRound: 3, maxRounds: 5, ownOffers: [1], opponentOffer: agent.negotiation.targetValue });
    assert.ok(rate >= 0.04 && rate <= 0.38);
    const counter = generateCounterOffer(agent, agent.decisionType === "minimize" ? agent.negotiation.maximumAcceptable : agent.negotiation.minimumAcceptable, agent.negotiation.targetValue, { currentRound: 3, maxRounds: 5, ownOffers: [{ agentId: agent.id, value: agent.negotiation.targetValue }] });
    assert.ok(Number.isFinite(counter) && counter > 0);
    if (agent.decisionType === "minimize") assert.ok(counter <= agent.negotiation.maximumAcceptable);
    if (agent.decisionType === "maximize") assert.ok(counter >= agent.negotiation.minimumAcceptable);
    const strategy = chooseStrategy(agent, { currentRound: 3, maxRounds: 5, ownOffers: [{ value: agent.negotiation.targetValue }], previousOwnOffer: agent.negotiation.targetValue, opponentOffer: agent.negotiation.targetValue });
    assert.ok(strategy);
    assert.ok(buildConditionalTrade(agent, { currentRound: 2 }));
  }
}

const buyer = scenarios[0].agents[0];
assert.equal(evaluateOfferDetails(buyer, 1, { currentRound: 1 }).decision, DECISION.REJECT);
assert.equal(evaluateOfferDetails(buyer, 111000, { currentRound: 1 }).decision, DECISION.REJECT);
console.log("PASS: strategic negotiation layer, BATNA/leverage metadata, conditional trade support, hard-boundary safety, and counteroffer constraints.");
