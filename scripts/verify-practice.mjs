import assert from "node:assert/strict";
import { scenarios } from "../src/data/scenarios.js";
import { evaluateOfferDetails } from "../src/logic/decisionEngine.js";
import { getSafeCounterOffer } from "../src/logic/practiceNegotiation.js";

for (const scenario of scenarios) {
  const human = scenario.agents[0];
  const ai = scenario.agents[1];
  const offers = [];
  let humanValue = human.decisionType === "minimize"
    ? human.negotiation.targetValue * 1.15
    : human.negotiation.targetValue * 0.85;
  let agreement = false;

  for (let round = 1; round <= 6; round += 1) {
    offers.push({ agentId: human.id, value: Math.round(humanValue), round });

    const evaluation = evaluateOfferDetails(ai, Math.round(humanValue), {
      currentRound: round,
      previousOffers: offers,
      previousOwnOffer: offers.filter((offer) => offer.agentId === ai.id).slice(-1)[0] || null,
    });

    if (evaluation.decision === "ACCEPT" && offers.length >= 2) {
      agreement = true;
      break;
    }

    const previousAiOffer = offers.filter((offer) => offer.agentId === ai.id).slice(-1)[0] || null;
    const counter = getSafeCounterOffer(ai, Math.round(humanValue), previousAiOffer, NaN);
    assert.ok(Number.isFinite(counter) && counter > 0);
    offers.push({ agentId: ai.id, value: counter, round });

    const nextEvaluation = evaluateOfferDetails(ai, counter, {
      currentRound: round,
      previousOffers: offers,
      previousOwnOffer: offers.filter((offer) => offer.agentId === ai.id).slice(-1)[0],
    });

    if (nextEvaluation.decision === "ACCEPT" && offers.length >= 2) {
      agreement = true;
      break;
    }

    // A human practice participant can respond to the AI counter by moving
    // halfway toward it. This verifies that the AI's concession path converges
    // rather than repeatedly generating the same counter.
    const aiValue = counter;
    humanValue = Math.round((humanValue + aiValue) / 2);
  }

  assert.ok(agreement, `${scenario.name} did not reach an agreement in the practice convergence test.`);
  console.log(`✓ ${scenario.name}: practice negotiation converged in ${Math.ceil(offers.length / 2)} human turns.`);
}

console.log("✓ Practice Mode negotiation convergence verification passed.");
