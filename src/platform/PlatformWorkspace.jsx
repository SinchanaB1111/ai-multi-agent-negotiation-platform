import { useEffect, useMemo, useState } from "react";
import SessionsPage from "../pages/SessionsPage.jsx";
import AnalyticsPage from "../pages/AnalyticsPage.jsx";
import ReportsPage from "../pages/ReportsPage.jsx";
import ScenarioLibraryPage from "../pages/ScenarioLibraryPage.jsx";
import SettingsPage from "../components/SettingsPage.jsx";
import { scenarios } from "../data/scenarios.js";
import { clearNegotiationSessions, clearRemoteNegotiationSessions, deleteNegotiationSession, deleteRemoteNegotiationSession, getNegotiationSessions, getSessionStats } from "../services/historyService.js";

const tabs = [
  ["sessions", "Sessions"],
  ["analytics", "Analytics"],
  ["reports", "Reports"],
  ["scenarios", "Scenario Library"],
  ["settings", "Settings"],
];

export default function PlatformWorkspace({ user, token, settings, updateSettings, onClose, onSignOut, initialTab = "sessions" }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const [sessions, setSessions] = useState(() => getNegotiationSessions(user?.id || "guest"));
  const [selected, setSelected] = useState(null);
  const userId = user?.id || "guest";

  const refresh = () => setSessions(getNegotiationSessions(userId));

  useEffect(() => {
    const updateSessions = () => setSessions(getNegotiationSessions(userId));
    window.addEventListener("negosphere-history-updated", updateSessions);
    return () => window.removeEventListener("negosphere-history-updated", updateSessions);
  }, [userId]);

  const removeSession = async (session) => {
    const remoteId = session.sourceSessionId || session.sessionId;
    if (token && remoteId) await deleteRemoteNegotiationSession(remoteId, token);
    deleteNegotiationSession(userId, session.id);
    refresh();
    if (selected?.id === session.id) setSelected(null);
  };

  const clearHistory = async () => {
    if (token) await clearRemoteNegotiationSessions(token);
    clearNegotiationSessions(userId);
    refresh();
    setSelected(null);
  };

  const stats = useMemo(() => getSessionStats(sessions), [sessions]);

  if (!user) return null;

  return (
    <div className="platform-workspace-overlay" role="dialog" aria-modal="true" aria-label="Platform workspace">
      <div className="platform-workspace-backdrop" onClick={onClose} />
      <section className={`platform-workspace-drawer ${tab === "settings" ? "settings-workspace-mode" : ""}`}>
        {tab !== "settings" && <header className="platform-workspace-header">
          <div><span className="eyebrow">PLATFORM TOOLS</span><h2>Workspace</h2><p>{user.full_name || "Negotiator"} · {stats.total} saved sessions</p></div>
          <button className="platform-close" onClick={onClose} aria-label="Close workspace">×</button>
        </header>}
        {tab !== "settings" && <nav className="platform-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>}
        <div className="platform-workspace-content">
          {tab === "sessions" && <SessionsPage sessions={sessions} onRefresh={refresh} onOpen={(session) => { setSelected(session); setTab("reports"); }} onDelete={removeSession} />}
          {tab === "analytics" && <AnalyticsPage sessions={sessions} selected={selected} />}
          {tab === "reports" && <ReportsPage sessions={sessions} selected={selected} />}
          {tab === "scenarios" && <ScenarioLibraryPage customScenarios={[]} scenarios={scenarios} onSelect={(scenario) => { onClose(); window.dispatchEvent(new CustomEvent("platform-scenario-request", { detail: scenario })); }} onCustom={() => { onClose(); window.dispatchEvent(new CustomEvent("platform-custom-scenario-request")); }} />}
          {tab === "settings" && <SettingsPage settings={settings} onChange={updateSettings} onClearHistory={clearHistory} onBack={onClose} />}
        </div>
        {tab !== "settings" && <footer className="platform-workspace-footer">
          <span><i /> Signed in as {user.full_name || "Negotiator"}</span>
          <button onClick={() => { onSignOut(); onClose(); }}>Sign out</button>
        </footer>}
      </section>
    </div>
  );
}
