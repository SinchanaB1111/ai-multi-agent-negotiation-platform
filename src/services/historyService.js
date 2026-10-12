const KEY = "ai-negotiation-session-history-v2";
const MAX_NEGOTIATION_REPORTS = 250;
const API = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

import { mergeRemoteReportSessions } from "../logic/dashboardStore.js";

function storageKey(userId) {
  return `${KEY}:${userId || "guest"}`;
}

function read(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function compactState(state, mode) {
  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    scenario: state?.scenario || null,
    agents: state?.agents || [],
    mode: mode || "simulation",
    status: state?.status || "UNKNOWN",
    currentRound: state?.currentRound || 0,
    maxRounds: state?.maxRounds || 5,
    currentOffer: state?.currentOffer || null,
    previousOffer: state?.previousOffer || null,
    agreement: state?.agreement || null,
    terminationReason: state?.terminationReason || "",
    offers: state?.offers || [],
    decisions: state?.decisions || [],
    concessions: state?.concessions || [],
    history: state?.history || [],
  };
}

export function saveNegotiationSession(userId, state, mode, options = {}) {
  if (!state) return null;
  const item = compactState(state, mode);
  if (options.createdAt) item.createdAt = options.createdAt;
  if (options.sourceSessionId) item.sourceSessionId = options.sourceSessionId;
  const previous = read(userId);
  const sourceId = item.sourceSessionId || state.sessionId;
  const filtered = sourceId
    ? previous.filter((entry) => (entry.sourceSessionId || entry.stateSnapshot?.sessionId || entry.sessionId) !== sourceId)
    : previous;
  const next = [item, ...filtered].slice(0, MAX_NEGOTIATION_REPORTS);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return item;
}

export function getNegotiationSessions(userId) {
  return read(userId);
}

export async function syncNegotiationSessions(userId, token, dashboardSessions = []) {
  if (!userId || userId === "guest" || !token) return getNegotiationSessions(userId);

  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`${API}/session-history`, { headers });
  if (!response.ok) {
    const error = new Error(`Unable to load saved sessions (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  const remoteSessions = await response.json();
  const remoteById = new Map(remoteSessions.map((item) => [item.session_id, item]));

  // Push local completed reports to the backend when they are new or their
  // snapshot changed. This keeps a re-completed session from becoming stale.
  for (const item of dashboardSessions) {
    const state = item?.stateSnapshot;
    if (!state?.sessionId) continue;
    const remote = remoteById.get(state.sessionId);
    const localSnapshot = JSON.stringify(state);
    const remoteSnapshot = JSON.stringify(remote?.state || null);
    if (remote && localSnapshot === remoteSnapshot) continue;

    const saved = await fetch(`${API}/session-history`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: state.sessionId,
        mode: item.mode || "simulation",
        state,
      }),
    });
    if (!saved.ok) {
      const error = new Error(`Unable to save negotiation session (${saved.status}).`);
      error.status = saved.status;
      throw error;
    }
    const updated = await saved.json();
    const index = remoteSessions.findIndex((entry) => entry.session_id === updated.session_id);
    if (index >= 0) remoteSessions[index] = updated;
    else remoteSessions.push(updated);
    remoteById.set(updated.session_id, updated);
  }

  const normalizedReports = remoteSessions
    .filter((item) => item?.state?.sessionId)
    .map((item) => ({
      sessionId: item.session_id,
      scenarioId: item.state.scenario?.id,
      scenarioName: item.state.scenario?.name,
      mode: item.mode || "simulation",
      status: item.state.status,
      completedAt: item.updated_at || item.created_at || item.state.completedAt || item.state.createdAt || new Date().toISOString(),
      stateSnapshot: item.state,
    }));

  // Merge the complete server-side report history into the dashboard store so
  // Reports & Analytics can reconstruct older sessions after a fresh login.
  mergeRemoteReportSessions(normalizedReports);

  for (const item of remoteSessions) {
    if (!item.state?.sessionId) continue;
    saveNegotiationSession(userId, item.state, item.mode, {
      sourceSessionId: item.session_id,
      createdAt: item.created_at,
    });
  }
  return getNegotiationSessions(userId);
}

export async function deleteRemoteNegotiationSession(sessionId, token) {
  const response = await fetch(`${API}/session-history/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to delete saved session (${response.status}).`);
  }
}

export async function clearRemoteNegotiationSessions(token) {
  const response = await fetch(`${API}/session-history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to clear saved sessions (${response.status}).`);
}

export function deleteNegotiationSession(userId, id) {
  localStorage.setItem(storageKey(userId), JSON.stringify(read(userId).filter((item) => item.id !== id)));
}

export function clearNegotiationSessions(userId) {
  localStorage.removeItem(storageKey(userId));
}

export function getSessionStats(sessions = []) {
  const total = sessions.length;
  const agreements = sessions.filter((s) => ["AGREEMENT", "accepted", "agreement", "completed"].includes(s.status)).length;
  const deadlocks = sessions.filter((s) => ["DEADLOCK", "deadlock", "breakdown"].includes(s.status)).length;
  const rounds = sessions.reduce((sum, s) => sum + Number(s.currentRound || 0), 0);
  const offers = sessions.reduce((sum, s) => sum + Number(s.offers?.length || 0), 0);
  const concessions = sessions.reduce((sum, s) => sum + Number(s.concessions?.length || 0), 0);
  return {
    total,
    agreements,
    deadlocks,
    agreementRate: total ? Math.round((agreements / total) * 100) : 0,
    avgRounds: total ? (rounds / total).toFixed(1) : "0.0",
    totalOffers: offers,
    totalConcessions: concessions,
  };
}
