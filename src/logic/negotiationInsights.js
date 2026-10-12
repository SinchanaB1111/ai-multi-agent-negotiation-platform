export function calculateZopa(agentA, agentB) {
  if (!agentA?.negotiation || !agentB?.negotiation) return null;

  const buyerMax = agentA.decisionType === "minimize"
    ? Number(agentA.negotiation.maximumAcceptable ?? agentA.negotiation.targetValue)
    : Number(agentA.negotiation.targetValue);

  const sellerMin = agentB.decisionType === "maximize"
    ? Number(agentB.negotiation.minimumAcceptable ?? agentB.negotiation.targetValue)
    : Number(agentB.negotiation.targetValue);

  if (!Number.isFinite(buyerMax) || !Number.isFinite(sellerMin)) return null;
  if (buyerMax < sellerMin) return null;

  return {
    min: sellerMin,
    max: buyerMax,
    range: `₹${Number(sellerMin).toLocaleString("en-IN")} – ₹${Number(buyerMax).toLocaleString("en-IN")}`,
    zone: `₹${Number(sellerMin).toLocaleString("en-IN")} to ₹${Number(buyerMax).toLocaleString("en-IN")}`,
  };
}

export function calculatePerformanceScore(state) {
  const agents = Array.isArray(state?.agents) ? state.agents : [];
  const finalValue = Number(state?.agreement?.offer?.value ?? state?.currentOffer?.value ?? 0);
  const totalRounds = Number(state?.currentRound || 0);
  const totalOffers = Number(state?.offers?.length || 0);

  const goalScore = agents.length
    ? Math.round(
        agents.reduce((total, agent) => {
          const target = Number(agent?.negotiation?.targetValue || 0);
          const minimum = Number(agent?.negotiation?.minimumAcceptable ?? target);
          const maximum = Number(agent?.negotiation?.maximumAcceptable ?? target);

          if (!Number.isFinite(target) || target <= 0) return total;

          const value = Number(finalValue || target);
          const distance = agent.decisionType === "minimize"
            ? Math.max(0, value - target)
            : Math.max(0, target - value);

          const maximumDistance = agent.decisionType === "minimize"
            ? Math.max(1, maximum - target)
            : Math.max(1, target - minimum);

          const score = Math.max(0, 100 - (distance / maximumDistance) * 100);
          return total + score;
        }, 0) / agents.length
      )
    : 0;

  const constraintScore = agents.length
    ? Math.round(
        agents.reduce((total, agent) => {
          const minimum = Number(agent?.negotiation?.minimumAcceptable ?? 0);
          const maximum = Number(agent?.negotiation?.maximumAcceptable ?? 0);
          const target = Number(agent?.negotiation?.targetValue ?? 0);
          if (!target) return total;

          if (agent.decisionType === "minimize") {
            return total + (finalValue <= maximum && finalValue >= target ? 100 : 80);
          }

          return total + (finalValue >= minimum && finalValue <= target ? 100 : 80);
        }, 0) / agents.length
      )
    : 0;

  const concessionScore = Math.max(0, 100 - Math.max(0, totalOffers - 4) * 10);
  const efficiencyScore = Math.max(0, 100 - Math.max(0, totalRounds - 3) * 12);
  const outcomeScore = state?.status === "AGREEMENT" ? 100 : state?.status === "REJECTED" ? 35 : state?.status === "DEADLOCK" ? 50 : 70;
  const strategyConsistency = Math.max(0, 100 - Math.max(0, (state?.concessions?.length || 0) - 3) * 7);

  return {
    goalAchievement: goalScore,
    constraintHandling: constraintScore,
    concessionManagement: concessionScore,
    negotiationEfficiency: efficiencyScore,
    finalOutcome: outcomeScore,
    strategyConsistency,
    strengths: [
      goalScore >= 70 ? "Maintained a realistic target path throughout the negotiation." : "Improved the outcome by staying close to the target range.",
      constraintScore >= 80 ? "Respected critical hard constraints and acceptable boundaries." : "The final outcome was near the boundary and could be tightened further.",
    ],
    improvements: [
      totalOffers <= 3 ? "Consider exploring additional issues or adding a stronger anchor offer." : "More value could have been unlocked by discussing non-price issues.",
      totalRounds >= 5 ? "A clearer early ask could have reduced the number of late-stage concessions." : "The negotiation could benefit from closer alignment on priorities early.",
    ],
  };
}

export function getNegotiationCoachFeedback(state) {
  const offers = state?.offers || [];
  const lastOffer = offers[offers.length - 1];
  const previousOffer = offers.length > 1 ? offers[offers.length - 2] : null;
  const concessionDelta = previousOffer && lastOffer
    ? Math.abs(Number(lastOffer.value) - Number(previousOffer.value))
    : 0;

  const finalValue = Number(state?.agreement?.offer?.value ?? state?.currentOffer?.value ?? 0);
  const status = state?.status;

  let whatHappened = "The negotiation is progressing with a clear exchange of offers.";
  if (status === "AGREEMENT") {
    whatHappened = `An agreement was reached at ₹${Number(finalValue).toLocaleString("en-IN")}.`;
  } else if (status === "DEADLOCK") {
    whatHappened = "The negotiation stalled before a mutually acceptable position was reached.";
  } else if (status === "REJECTED") {
    whatHappened = "The current proposal was rejected, so the negotiation ended without agreement.";
  }

  const whyText = previousOffer && lastOffer
    ? `The latest move changed from ₹${Number(previousOffer.value).toLocaleString("en-IN")} to ₹${Number(lastOffer.value).toLocaleString("en-IN")}, which indicates a concession pattern that shaped the negotiation.`
    : "The structure of the exchange suggests the parties were evaluating each other’s hard limits and value priorities.";

  const doneWell = concessionDelta <= 10
    ? "The changes remained measured and within acceptable negotiation bounds."
    : "The parties kept the exchange grounded in realistic progress rather than abrupt reversals.";

  const improve = lastOffer && previousOffer && concessionDelta > 15
    ? "Your concession was larger than the prior move. Consider holding your position and using value-based trade-offs such as payment terms, delivery timelines, or scope." 
    : "Consider exploring more issue-level trade-offs to unlock value without overcommitting on the lead issue.";

  const nextStrategy = status === "AGREEMENT"
    ? "Lock the agreement in writing and confirm the exact guardrails before moving forward."
    : "Make a final calibrated offer anchored to the strongest value argument and ask for a small reciprocal concession in a different issue area.";

  return {
    whatHappened,
    why: whyText,
    doneWell,
    improve,
    nextStrategy,
  };
}

export function createDefaultSettings() {
  return {
    appearance: "dark",
    layout: "comfortable",
    animation: "subtle",
    defaultMode: "simulation",
    defaultRounds: 5,
    automaticNegotiation: true,
    concessionLimit: 15,
    negotiationTimeout: 60,
    providerMode: "auto",
    provider: "gemini",
    fallbackEnabled: true,
    coachingEnabled: true,
    finalReportEnabled: true,
    strategySuggestions: true,
    demoMode: false,
  };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem("negotiation-settings");
    if (!raw) return createDefaultSettings();
    return { ...createDefaultSettings(), ...JSON.parse(raw) };
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings) {
  window.localStorage.setItem("negotiation-settings", JSON.stringify(settings));
}
