import assert from "node:assert/strict";
import { calculateSessionScore, getDashboardMetrics, getPerformanceBand, readDashboardStore, recordActivity } from "../src/logic/dashboardStore.js";

const empty = getDashboardMetrics({ sessions: [], activities: [], profile: {} });
assert.equal(empty.performance, "Not started");
assert.equal(empty.averageScore, 0);

const sample = (scores) => ({
  sessions: scores.map((score, index) => ({
    sessionId: `session-${index + 1}`,
    scenarioId: `scenario-${index + 1}`,
    score,
    mode: index % 2 ? "practice" : "simulation",
  })),
  activities: [],
  profile: {},
});

const developing = getDashboardMetrics(sample([60, 78]));
assert.equal(developing.averageScore, 69);
assert.equal(developing.performance, "Developing");
assert.equal(developing.performanceMeta.range, "50–69");
assert.match(developing.performanceMeta.description, /69%/);

const proficient = getDashboardMetrics(sample([70, 74]));
assert.equal(proficient.averageScore, 72);
assert.equal(proficient.performance, "Proficient");

const advanced = getDashboardMetrics(sample([86, 90]));
assert.equal(advanced.averageScore, 88);
assert.equal(advanced.performance, "Advanced");

assert.equal(getPerformanceBand(49, 1).label, "Needs Improvement");
assert.equal(getPerformanceBand(50, 1).label, "Developing");
assert.equal(getPerformanceBand(69, 1).label, "Developing");
assert.equal(getPerformanceBand(70, 1).label, "Proficient");
assert.equal(getPerformanceBand(84, 1).label, "Proficient");
assert.equal(getPerformanceBand(85, 1).label, "Advanced");


const noAgreementState = {
  status: "DEADLOCK",
  currentOffer: { value: 1300000 },
  offers: [{ value: 1300000 }],
  concessions: [{ from: 1200000, to: 1250000 }],
  agents: [
    { decisionType: "minimize", negotiation: { targetValue: 1100000, maximumAcceptable: 1300000 } },
    { decisionType: "maximize", negotiation: { targetValue: 1200000, minimumAcceptable: 1000000 } },
  ],
};
const noAgreementStore = { sessions: [{ sessionId: "deadlock-1", scenarioId: "job", score: 99, finalValue: 1300000, stateSnapshot: noAgreementState }], activities: [], profile: {} };
const deadlockMetrics = getDashboardMetrics(noAgreementStore);
assert.equal(noAgreementStore.sessions[0].finalValue, 1300000);
assert.equal(deadlockMetrics.scoredSessions, 1);
assert.ok(noAgreementStore.sessions[0].stateSnapshot.status === "DEADLOCK");
assert.ok(calculateSessionScore(noAgreementState) < 50);
assert.equal(calculateSessionScore({ ...noAgreementState, status: "AGREEMENT", agreement: { offer: { value: 1200000 } } }) > 50, true);

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  dispatchEvent: () => {},
};
globalThis.CustomEvent ||= class CustomEvent {};
window.localStorage.setItem("nego_user_info", JSON.stringify({ id: 101 }));
recordActivity({ type: "completed", title: "Account A session" });
window.localStorage.setItem("nego_user_info", JSON.stringify({ id: 202 }));
assert.equal(readDashboardStore().activities.length, 0);
window.localStorage.setItem("nego_user_info", JSON.stringify({ id: 101 }));
assert.equal(readDashboardStore().activities[0].title, "Account A session");

console.log("Dashboard performance verification passed.");
