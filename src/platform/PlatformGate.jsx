import { useEffect, useMemo, useState } from "react";
import { AuthProvider } from "../context/AuthContext.jsx";
import { useAuth } from "../context/authContext.js";
import AuthPage from "../components/AuthPage.jsx";
import GuideBot from "../components/guide/GuideBot.jsx";
import PlatformWorkspace from "./PlatformWorkspace.jsx";
import { syncNegotiationSessions } from "../services/historyService.js";
import { readDashboardStore, writeDashboardStore } from "../logic/dashboardStore.js";
import { loadSettings, saveSettings } from "../logic/negotiationInsights.js";
import "./PlatformFeatures.css";

function syncProfile(user) {
  if (!user) return;
  try {
    const store = readDashboardStore();
    writeDashboardStore({
      ...store,
      profile: { ...(store.profile || {}), name: user.full_name || "Negotiator" },
    });
  } catch { /* keep the core UI running if local storage is unavailable */ }
}

async function syncUserSessions(userId, token) {
  const store = readDashboardStore();
  return syncNegotiationSessions(userId, token, store.sessions || []);
}

function PlatformBridge({ children }) {
  const { user, token, isAuthenticated, signOut } = useAuth();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("sessions");
  const [guidePage, setGuidePage] = useState("Dashboard");
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings();
    try {
      const appTheme = window.localStorage.getItem("app-theme");
      return appTheme ? { ...saved, appearance: appTheme } : saved;
    } catch {
      return saved;
    }
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    syncProfile(user);
    const userId = user.id || "guest";
    const refresh = () => {
      syncUserSessions(userId, token)
        .then(() => {
          window.dispatchEvent(new Event("negosphere-history-updated"));
          window.dispatchEvent(new Event("negosphere-reports-updated"));
        })
        .catch((error) => {
          if (error.status === 401) {
            signOut();
            return;
          }
          console.error("Session sync failed:", error.message);
        });
    };
    refresh();
    window.addEventListener("negosphere-dashboard-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("negosphere-dashboard-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [isAuthenticated, user, token, signOut]);

  useEffect(() => {
    const openWorkspace = (event) => {
      const requestedTab = event?.detail?.tab || "sessions";
      setWorkspaceTab(requestedTab);
      setWorkspaceOpen(true);
    };
    window.addEventListener("platform-open-workspace", openWorkspace);
    return () => window.removeEventListener("platform-open-workspace", openWorkspace);
  }, []);

  useEffect(() => {
    const onPage = () => {
      const heading = document.querySelector(".main-content h1, .main-content h2");
      if (heading?.textContent) setGuidePage(heading.textContent);
    };
    onPage();
    const timer = window.setInterval(onPage, 1200);
    return () => window.clearInterval(timer);
  }, []);

  const updateSettings = (updater) => setSettings((previous) => {
    const next = typeof updater === "function" ? updater(previous) : updater;
    saveSettings(next);
    return next;
  });

  const workspaceContext = useMemo(() => ({
    user,
    token,
    settings,
    updateSettings,
    initialTab: workspaceTab,
    onClose: () => setWorkspaceOpen(false),
    onOpen: () => setWorkspaceOpen(true),
    onSignOut: signOut,
  }), [user, token, settings, workspaceTab, signOut]);

  if (!isAuthenticated) return <AuthPage />;

  return (
    <>
      {children}
      {workspaceOpen && <PlatformWorkspace {...workspaceContext} />}
      <GuideBot page={guidePage} />

    </>
  );
}

export default function PlatformGate({ children }) {
  return <AuthProvider><PlatformBridge>{children}</PlatformBridge></AuthProvider>;
}
