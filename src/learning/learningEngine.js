import { detectTactics } from "./tacticDetector.js";
import { detectTurningPoints } from "./turningPointDetector.js";
import { buildTakeaways } from "./takeawayGenerator.js";
import { buildLearningChallenges } from "./learningChallenges.js";

export function analyzeNegotiationLearning(state) {
  const history = Array.isArray(state?.history) ? state.history : [];
  const tactics = detectTactics(state);
  const turningPoints = detectTurningPoints(state, tactics);
  const takeaways = buildTakeaways(state, tactics, turningPoints);
  const challenges = buildLearningChallenges(state, tactics, turningPoints);

  const skillObservations = buildSkillObservations(state, tactics, turningPoints);

  return {
    tactics,
    turningPoints,
    takeaways,
    skillObservations,
    challenges,
    analyzedEvents: history.length,
  };
}

function buildSkillObservations(state, tactics, turningPoints) {
  const count = (types) => tactics.filter((item) => types.includes(item.type)).length;
  const observed = [
    {
      skill: "Strategic Concessions",
      types: ["STRATEGIC_CONCESSION", "CONDITIONAL_CONCESSION"],
      evidence: "A concession was detected from the agent's recorded offer history.",
    },
    {
      skill: "Value Creation",
      types: ["TRADE_OFF", "VALUE_CREATION", "BUNDLING"],
      evidence: "The negotiation introduced or exchanged value beyond a simple price movement.",
    },
    {
      skill: "Information Discovery",
      types: ["INFORMATION_DISCOVERY"],
      evidence: "An agent used the recorded dialogue to surface or respond to priorities.",
    },
    {
      skill: "Pressure Handling",
      types: ["PRESSURE_TACTIC", "REFRAMING"],
      evidence: "The negotiation included pressure or a reframing move.",
    },
    {
      skill: "Conditional Offers",
      types: ["CONDITIONAL_CONCESSION"],
      evidence: "A concession was tied to a condition or reciprocal commitment.",
    },
    {
      skill: "Deadlock Handling",
      types: ["DEADLOCK_HANDLING"],
      evidence: "The negotiation recorded a deadlock or a recovery from stalled movement.",
    },
  ];

  return observed.map((item) => {
    const hits = count(item.types);
    const level = hits >= 2 ? "Strongly Demonstrated" : hits === 1 ? "Observed" : "Not Evidenced";
    const tp = turningPoints.find((point) => item.types.includes(point.tacticType));
    return {
      skill: item.skill,
      level,
      evidence: hits ? `${item.evidence}${tp ? ` Most notably in Round ${tp.round}.` : ""}` : "No recorded event provides enough evidence yet.",
    };
  });
}
