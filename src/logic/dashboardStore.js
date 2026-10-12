const STORAGE_KEY = "negosphere-dashboard-v2";
const USER_KEY = "nego_user_info";
const MAX_ACTIVITY = 20;
export const MAX_SESSIONS = 250;

const DEFAULT_STORE = {
  sessions: [],
  activities: [],
  profile: { name: "Negotiator" },
};

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : DEFAULT_STORE;
  } catch {
    return DEFAULT_STORE;
  }
}

function getUserStorageKey() {
  try {
    const user = JSON.parse(window.localStorage.getItem(USER_KEY) || "null");
    const userId = user?.id || "guest";
    return `${STORAGE_KEY}:${encodeURIComponent(String(userId))}`;
  } catch {
    return `${STORAGE_KEY}:guest`;
  }
}

function normalizeStore(value) {
  const parsed = value && typeof value === "object" ? value : DEFAULT_STORE;
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions.map((session) => {
        const snapshot = session?.stateSnapshot;
        const correctedScore = snapshot ? calculateSessionScore(snapshot) : session.score;
        const correctedFinalValue = snapshot?.status === "AGREEMENT"
          ? snapshot.agreement?.offer?.value ?? null
          : null;
        return {
          ...session,
          score: Number.isFinite(Number(correctedScore)) ? correctedScore : null,
          finalValue: snapshot ? correctedFinalValue : (session.status === "AGREEMENT" ? session.finalValue ?? null : null),
        };
      })
    : [];

  const profile = {
    ...DEFAULT_STORE.profile,
    ...(parsed.profile && typeof parsed.profile === "object" ? parsed.profile : {}),
  };
  if (!profile.name || profile.name === "Negotiator") profile.name = DEFAULT_STORE.profile.name;

  return {
    sessions,
    activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    profile,
  };
}

export function readDashboardStore() {
  if (typeof window === "undefined") return DEFAULT_STORE;
  const current = window.localStorage.getItem(getUserStorageKey());
  if (current) return normalizeStore(safeParse(current));
  return DEFAULT_STORE;
}

export function writeDashboardStore(store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getUserStorageKey(), JSON.stringify(normalizeStore(store)));
  window.dispatchEvent(new CustomEvent("negosphere-dashboard-updated"));
}

export function updateDashboardStore(updater) {
  const current = readDashboardStore();
  const next = normalizeStore(updater(current));
  writeDashboardStore(next);
  return next;
}

function activityId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordActivity({ type, title, mode, scenarioName, sessionId }) {
  return updateDashboardStore((store) => {
    const duplicate = sessionId
      ? store.activities.some((item) => item.sessionId === sessionId && item.type === type)
      : false;

    if (duplicate) return store;

    return {
      ...store,
      activities: [
        {
          id: activityId(),
          type,
          title,
          mode: mode || null,
          scenarioName: scenarioName || null,
          sessionId: sessionId || null,
          timestamp: new Date().toISOString(),
        },
        ...store.activities,
      ].slice(0, MAX_ACTIVITY),
    };
  });
}

function calculateGoalScore(agent, finalValue) {
  if (!agent?.negotiation || finalValue == null) return null;
  const target = Number(agent.negotiation.targetValue);
  if (!Number.isFinite(target)) return null;

  if (agent.decisionType === "minimize") {
    if (finalValue <= target) return 100;
    const max = Number(agent.negotiation.maximumAcceptable);
    if (!Number.isFinite(max) || max <= target) return 0;
    return Math.max(0, Math.min(100, 100 - ((finalValue - target) / (max - target)) * 100));
  }

  if (finalValue >= target) return 100;
  const min = Number(agent.negotiation.minimumAcceptable);
  if (!Number.isFinite(min) || target <= min) return 0;
  return Math.max(0, Math.min(100, 100 - ((target - finalValue) / (target - min)) * 100));
}

export function calculateSessionScore(state) {
  if (!state || !state.status || state.status === "NOT_STARTED" || state.status === "IN_PROGRESS") return null;

  // A negotiation score should measure the actual outcome. A last outstanding
  // offer is NOT an agreement and must never be treated as the final value.
  const isAgreement = state.status === "AGREEMENT" && state.agreement?.offer?.value != null;
  const outcomeScore = isAgreement ? 50 : state.status === "DEADLOCK" ? 15 : state.status === "REJECTED" ? 5 : 0;
  const finalValue = isAgreement ? Number(state.agreement.offer.value) : null;

  const goals = isAgreement
    ? (state.agents || [])
        .map((agent) => calculateGoalScore(agent, finalValue))
        .filter((value) => value != null)
    : [];
  const goalScore = goals.length
    ? Math.round((goals.reduce((sum, value) => sum + value, 0) / goals.length) * 0.3)
    : 0;

  const constraintScore = isAgreement ? 20 : 0;
  const offerCount = state.offers?.length || 0;
  const efficiencyScore = Math.max(0, 10 - Math.max(0, offerCount - 4));
  const concessionScore = Math.min(20, (state.concessions?.length || 0) * 4);

  return Math.min(100, Math.max(0, Math.round(
    outcomeScore + goalScore + constraintScore + efficiencyScore + concessionScore,
  )));
}


export function mergeRemoteReportSessions(remoteSessions = []) {
  if (typeof window === "undefined" || !Array.isArray(remoteSessions) || !remoteSessions.length) return readDashboardStore();

  const current = readDashboardStore();
  const byId = new Map((current.sessions || []).map((session) => [session.sessionId, session]));

  for (const remote of remoteSessions) {
    if (!remote?.sessionId || !remote?.stateSnapshot) continue;
    const state = remote.stateSnapshot;
    if (["NOT_STARTED", "IN_PROGRESS"].includes(String(state.status || "").toUpperCase())) continue;
    const score = calculateSessionScore(state);
    byId.set(remote.sessionId, {
      ...(byId.get(remote.sessionId) || {}),
      sessionId: remote.sessionId,
      scenarioId: remote.scenarioId || state.scenario?.id,
      scenarioName: remote.scenarioName || state.scenario?.name,
      mode: remote.mode || "simulation",
      status: state.status,
      score: Number.isFinite(Number(score)) ? score : null,
      rounds: Number(state.currentRound || 0),
      offers: state.offers?.length || 0,
      concessions: state.concessions?.length || 0,
      finalValue: state.status === "AGREEMENT" ? state.agreement?.offer?.value ?? null : null,
      completedAt: remote.completedAt || remote.createdAt || state.completedAt || state.createdAt || new Date().toISOString(),
      stateSnapshot: state,
    });
  }

  const sessions = Array.from(byId.values())
    .filter((session) => session?.stateSnapshot)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, MAX_SESSIONS);

  const next = { ...current, sessions };
  // Merge remote history without emitting the normal dashboard-updated event;
  // PlatformGate is already performing the sync and will notify the app once.
  window.localStorage.setItem(getUserStorageKey(), JSON.stringify(normalizeStore(next)));
  return next;
}

export function recordCompletedSession(state, mode) {
  if (!state?.sessionId || !state?.scenario) return readDashboardStore();
  if (["NOT_STARTED", "IN_PROGRESS"].includes(state.status)) return readDashboardStore();

  return updateDashboardStore((store) => {
    const existingIndex = store.sessions.findIndex((session) => session.sessionId === state.sessionId);
    const score = calculateSessionScore(state);
    const session = {
      sessionId: state.sessionId,
      scenarioId: state.scenario.id,
      scenarioName: state.scenario.name,
      mode: mode || "simulation",
      status: state.status,
      score,
      rounds: Number(state.currentRound || 0),
      offers: state.offers?.length || 0,
      concessions: state.concessions?.length || 0,
      finalValue: state.status === "AGREEMENT" ? state.agreement?.offer?.value ?? null : null,
      completedAt: new Date().toISOString(),
      stateSnapshot: state,
    };

    const sessions = existingIndex >= 0
      ? store.sessions.map((item, index) => index === existingIndex ? { ...item, ...session } : item)
      : [session, ...store.sessions].slice(0, MAX_SESSIONS);

    return {
      ...store,
      sessions,
      activities: [
        {
          id: activityId(),
          type: "completed",
          title: `Completed ${state.scenario.name}`,
          mode: mode || "simulation",
          scenarioName: state.scenario.name,
          sessionId: state.sessionId,
          timestamp: new Date().toISOString(),
        },
        ...store.activities.filter((item) => !(item.sessionId === state.sessionId && item.type === "started")),
      ].slice(0, MAX_ACTIVITY),
    };
  });
}

export function getPerformanceBand(score, sessionCount = 0) {
  if (!sessionCount || !Number.isFinite(Number(score))) {
    return {
      label: "Not started",
      range: "",
      description: "Complete a negotiation to establish your first performance level.",
    };
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(Number(score))));
  if (normalizedScore >= 85) {
    return {
      label: "Advanced",
      range: "85–100",
      description: `Your ${normalizedScore}% average is in the Advanced range (85–100%).`,
    };
  }
  if (normalizedScore >= 70) {
    return {
      label: "Proficient",
      range: "70–84",
      description: `Your ${normalizedScore}% average is in the Proficient range (70–84%).`,
    };
  }
  if (normalizedScore >= 50) {
    return {
      label: "Developing",
      range: "50–69",
      description: `Your ${normalizedScore}% average is in the Developing range (50–69%).`,
    };
  }
  return {
    label: "Needs Improvement",
    range: "0–49",
    description: `Your ${normalizedScore}% average is currently in the Needs Improvement range (0–49%).`,
  };
}

export function getDashboardMetrics(store = readDashboardStore()) {
  const sessions = store.sessions || [];
  const completedScenarioIds = new Set(sessions.map((session) => session.scenarioId));
  const practiceSessions = sessions.filter((session) => session.mode === "practice").length;
  const scoredSessions = sessions.filter((session) => Number.isFinite(Number(session.score)));
  const averageScore = scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, session) => sum + Number(session.score), 0) / scoredSessions.length)
    : 0;
  const performanceMeta = getPerformanceBand(averageScore, scoredSessions.length);

  return {
    scenariosCompleted: completedScenarioIds.size,
    practiceSessions,
    averageScore,
    performance: performanceMeta.label,
    performanceMeta,
    scoredSessions: scoredSessions.length,
    totalSessions: sessions.length,
  };
}

export function formatRelativeTime(timestamp) {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return "Recently";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
