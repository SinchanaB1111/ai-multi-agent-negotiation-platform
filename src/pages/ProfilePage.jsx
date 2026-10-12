import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/authContext.js";
import { getPerformanceBand } from "../logic/dashboardStore.js";
import "./ProfilePage.css";

function initials(name = "Negotiator") {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "N";
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" /></>,
    chart: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19V3" /><path d="M3 19h20" /></>,
    target: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="m12 4 1.5 3" /></>,
    brain: <><path d="M9.2 4.2A3.3 3.3 0 0 0 6 7.5c0 .4.1.8.2 1.2A3.5 3.5 0 0 0 5 15.4 3.7 3.7 0 0 0 9 19h1V5.4a2.5 2.5 0 0 0-.8-1.2Z" /><path d="M14.8 4.2A3.3 3.3 0 0 1 18 7.5c0 .4-.1.8-.2 1.2A3.5 3.5 0 0 1 19 15.4 3.7 3.7 0 0 1 15 19h-1V5.4a2.5 2.5 0 0 1 .8-1.2Z" /><path d="M7.5 11h2M14.5 11h2M8 15h2M14 15h2" /></>,
    trophy: <><path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a2 2 0 0 0 2 4h1M16 6h3a2 2 0 0 1-2 4h-1M12 13v4M8 20h8M9 17h6" /></>,
    pencil: <><path d="m4 20 4.5-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /><path d="m13.8 7.2 3 3" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
    rocket: <><path d="M14 5c3-2 5-1 5-1s1 2-1 5l-6 6-4-4 6-6Z" /><path d="M9 15 6 18M7 12l-3 1 4 4 1-3M15 7l2 2" /></>,
    sessions: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    reports: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  };
  return <svg {...common}>{paths[name] || paths.user}</svg>;
}

function Skill({ icon, label, value }) {
  return (
    <div className="profile-skill-pill">
      <span className="profile-skill-icon"><Icon name={icon} size={18} /></span>
      <div className="profile-skill-copy"><strong>{label}</strong><span className="profile-skill-track"><i style={{ width: `${value}%` }} /></span></div>
      <b>{value}%</b>
    </div>
  );
}

export default function ProfilePage({ user, store, onNavigate, onSignOut }) {
  const { updateProfile, requestPasswordReset, verifyPasswordResetOtp, resendPasswordResetOtp, resetPassword, getNotificationSettings, updateNotificationSettings, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user?.full_name || store?.profile?.name || "Negotiator");
  const [draftEmail, setDraftEmail] = useState(user?.email || "");
  const [draftBio, setDraftBio] = useState(user?.bio || "Passionate about negotiation and strategic decision-making. I enjoy learning new skills, exploring different scenarios, and building better outcomes through collaboration.");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState("request");
  const [passwordOtp, setPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({ emailNotifications: true, negotiationReminders: true, reportNotifications: true, productUpdates: false });

  useEffect(() => {
    setDraftName(user?.full_name || store?.profile?.name || "Negotiator");
    setDraftEmail(user?.email || "");
    setDraftBio(user?.bio || "Passionate about negotiation and strategic decision-making. I enjoy learning new skills, exploring different scenarios, and building better outcomes through collaboration.");
  }, [user?.full_name, user?.email, user?.bio, store?.profile?.name]);
  // Profile performance is intentionally based ONLY on completed Practice Mode
  // negotiations. Simulation Mode must never affect the user's profile score,
  // skills, achievements, counts, or recent activity shown here.
  const practiceProfile = useMemo(() => {
    const allSessions = Array.isArray(store?.sessions) ? store.sessions : [];
    const sessions = allSessions.filter((session) => String(session?.mode || "").toLowerCase() === "practice");
    const scoredSessions = sessions.filter((session) => Number.isFinite(Number(session.score)));
    const averageScore = scoredSessions.length
      ? Math.round(scoredSessions.reduce((sum, session) => sum + Number(session.score), 0) / scoredSessions.length)
      : 0;
    const completedAgreements = sessions.filter((session) => String(session?.status || "").toUpperCase() === "AGREEMENT").length;
    const completedScenarios = new Set(sessions.map((session) => session.scenarioId).filter(Boolean)).size;
    return {
      sessions,
      scoredSessions,
      averageScore,
      completedAgreements,
      completedScenarios,
    };
  }, [store]);

  // Recent Activity is an activity timeline, not a performance metric.
  // Build it from completed sessions first so activity still appears after a
  // backend sync, even when the local activity log is empty. Existing started
  // activity records are retained as a fallback for sessions that are not yet
  // completed.
  const recentActivities = useMemo(() => {
    const allSessions = Array.isArray(store?.sessions) ? store.sessions : [];
    const loggedActivities = Array.isArray(store?.activities) ? store.activities : [];
    const completed = allSessions
      .filter((session) => session?.scenarioName || session?.stateSnapshot?.scenario?.name)
      .map((session) => {
        const scenarioName = session.scenarioName || session.stateSnapshot?.scenario?.name || "Negotiation";
        const timestamp = session.completedAt || session.stateSnapshot?.completedAt || session.stateSnapshot?.createdAt;
        return {
          id: `session-${session.sessionId || session.id || scenarioName}-${timestamp || "unknown"}`,
          type: "completed",
          title: scenarioName,
          scenarioName,
          mode: String(session.mode || "simulation").toLowerCase(),
          status: String(session.status || "COMPLETED").toUpperCase(),
          timestamp,
          sessionId: session.sessionId || session.id || null,
        };
      });

    const completedIds = new Set(completed.map((item) => item.sessionId).filter(Boolean));
    const fallbackActivities = loggedActivities
      .filter((activity) => !activity.sessionId || !completedIds.has(activity.sessionId))
      .map((activity) => ({
        ...activity,
        title: activity.scenarioName || String(activity.title || "Negotiation").replace(/^(Completed|Started|Created)\s+/i, ""),
        status: activity.type === "completed" ? "COMPLETED" : "STARTED",
        timestamp: activity.timestamp || null,
      }));

    return [...completed, ...fallbackActivities]
      .filter((activity) => activity.timestamp && !Number.isNaN(new Date(activity.timestamp).getTime()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [store]);
  const performance = getPerformanceBand(practiceProfile.averageScore, practiceProfile.scoredSessions.length);
  const sessions = practiceProfile.sessions;
  const practiceCount = sessions.length;
  const simulationCount = 0;
  const score = Math.min(100, Math.max(0, Number(practiceProfile.averageScore) || 0));
  const metrics = {
    averageScore: practiceProfile.averageScore,
    scoredSessions: practiceProfile.scoredSessions.length,
    totalSessions: practiceCount,
  };
  const name = draftName || user?.full_name || store?.profile?.name || "Negotiator";

  const saveProfile = async () => {
    setNotice("");
    setError("");
    if (!draftName.trim() || !draftEmail.trim()) { setError("Name and email are required."); return; }
    const result = await updateProfile(draftName.trim(), draftEmail.trim(), draftBio.trim());
    if (!result.success) { setError(result.error || "Unable to update profile."); return; }
    localStorage.setItem("negosphere-profile-name", result.user.full_name);
    window.dispatchEvent(new CustomEvent("negosphere-profile-name-updated", { detail: { name: result.user.full_name } }));
    setNotice("Profile updated successfully.");
    setEditing(false);
  };

  const openPasswordChange = async () => {
    setNotice(""); setError(""); setPasswordOpen(true); setPasswordStep("request"); setPasswordOtp(""); setNewPassword(""); setConfirmPassword("");
    const result = await requestPasswordReset(user?.email || "");
    if (result?.success === false || result?.error) { setError(result.error || "Unable to send the verification code."); return; }
    setPasswordStep("otp");
  };

  const verifyPasswordCode = async () => {
    setError("");
    const result = await verifyPasswordResetOtp(user?.email || "", passwordOtp.trim());
    if (!result?.verified) { setError(result?.error || result?.message || "Invalid verification code."); return; }
    setPasswordStep("new");
  };

  const confirmPasswordChange = async () => {
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    const result = await resetPassword(user?.email || "", passwordOtp.trim(), newPassword);
    if (result?.success === false || result?.error) { setError(result.error || "Unable to change password."); return; }
    setPasswordOpen(false);
    setNotice("Password changed successfully.");
  };

  const openNotifications = async () => {
    setNotice(""); setError("");
    const current = await getNotificationSettings();
    setNotificationSettings((previous) => ({ ...previous, ...current }));
    setNotificationsOpen(true);
  };

  const saveNotifications = async () => {
    setError("");
    const result = await updateNotificationSettings(notificationSettings);
    if (!result.success) { setError(result.error || "Unable to update notification settings."); return; }
    setNotificationsOpen(false);
    setNotice("Notification settings updated successfully.");
  };

  const activityLabel = (activity) => activity.mode === "practice" ? "Practice Session" : activity.mode === "simulation" ? "Scenario" : "Workspace";

  return (
    <section className="profile-page profile-reference-page">
      <header className="profile-hero">
        <div className="profile-hero-mountains" aria-hidden="true" />
        <div className="profile-hero-content">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">{initials(name)}</div>
            <span className="profile-camera" aria-hidden="true">⌾</span>
          </div>
          <div className="profile-hero-copy">
            <h1>{name}</h1>
            <div className="profile-role-line"><span>Negotiator</span><i>•</i><span>Learner</span><i>•</i><span>Team Player</span></div>
            <p>Curious mind. Better negotiations. Bigger goals.</p>
          </div>
          <button className="profile-edit-button" onClick={() => setEditing((value) => !value)}><Icon name="pencil" size={17} /> {editing ? "Close" : "Edit Profile"}</button>
        </div>
      </header>

      <nav className="profile-tabs" aria-label="Profile sections">
        <button className="active">Overview</button>
        <button type="button" onClick={() => setEditing(true)}>Personal Information</button>
        <button type="button" onClick={() => onNavigate("sessions")}>Activity</button>
      </nav>

      {editing && (
        <section className="profile-edit-card panel-block">
          <div className="profile-edit-heading"><div><span className="profile-kicker">PERSONAL INFORMATION</span><h2>Update your profile</h2></div></div>
          <label>Full name<input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Your name" /></label>
          <label>Email address<input type="email" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Bio<textarea value={draftBio} onChange={(event) => setDraftBio(event.target.value)} maxLength={1000} rows={4} placeholder="Tell us about yourself" /></label>
          <div className="profile-edit-actions"><button className="secondary-action" onClick={() => setEditing(false)}>Cancel</button><button className="primary-action" onClick={saveProfile}>Save Changes</button></div>
        </section>
      )}

      <div className="profile-content-grid">
        <div className="profile-left-column">
          <section className="panel-block profile-card profile-information-card">
            <div className="profile-card-heading"><span className="profile-heading-icon"><Icon name="user" /></span><div><h2>Profile Information</h2><p>Your basic details and bio</p></div></div>
            <div className="profile-information-layout">
              <div className="profile-details">
                <div><span>Full Name</span><b>{user?.full_name || name}</b></div>
                <div><span>Email</span><b>{user?.email || "Not available"}</b></div>
                <div><span>Location</span><b>India</b></div>
                <div className="profile-bio-row"><span>Bio</span><b>{user?.bio || draftBio}</b></div>
              </div>
              <div className="profile-mini-identity"><div className="profile-mini-avatar">{initials(name)}</div><strong>{name}</strong><span>Negotiator</span><em><Icon name="trophy" size={15} /> {performance.label}</em></div>
            </div>
          </section>

          <section className="panel-block profile-card">
            <div className="profile-card-heading"><span className="profile-heading-icon"><Icon name="brain" /></span><div><h2>Skills &amp; Expertise</h2><p>Your negotiation strengths</p></div></div>
            <div className="profile-skills-grid">
              <Skill icon="target" label="Goal Achievement" value={Math.min(100, Math.round(metrics.averageScore || 80))} />
              <Skill icon="brain" label="Decision Making" value={Math.min(100, Math.max(55, Math.round((metrics.averageScore || 75) - 3)))} />
              <Skill icon="reports" label="Communication" value={Math.min(100, Math.max(60, Math.round((metrics.averageScore || 78) + 1)))} />
              <Skill icon="chart" label="Strategic Thinking" value={Math.min(100, Math.max(55, Math.round((metrics.averageScore || 70) - 2)))} />
              <Skill icon="rocket" label="Problem Solving" value={Math.min(100, Math.max(50, Math.round((metrics.averageScore || 68) - 7)))} />
              <Skill icon="user" label="Team Collaboration" value={Math.min(100, Math.max(55, Math.round((metrics.averageScore || 72) - 1)))} />
            </div>
          </section>

          <section className="panel-block profile-card profile-activity-card">
            <div className="profile-card-heading profile-heading-with-link"><div className="profile-card-heading-inner"><span className="profile-heading-icon"><Icon name="sessions" /></span><div><h2>Recent Activity</h2><p>Your latest negotiation activity</p></div></div><button onClick={() => onNavigate("sessions")}>View All →</button></div>
            <div className="profile-activity-list">
              {recentActivities.length ? recentActivities.map((activity) => (
                <div className="profile-activity-row" key={activity.id}>
                  <span className="profile-activity-icon"><Icon name={activity.mode === "practice" ? "target" : "reports"} size={17} /></span>
                  <div className="profile-activity-copy">
                    <strong>{activity.title}</strong>
                    <small>{new Date(activity.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(activity.timestamp).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {activity.mode === "practice" ? "Practice" : "Simulation"}</small>
                  </div>
                  <span className={`profile-completed ${activity.status !== "AGREEMENT" && activity.status !== "COMPLETED" ? "profile-activity-status" : ""}`}>{activity.status === "AGREEMENT" ? "Agreement" : activity.status === "DEADLOCK" ? "Deadlock" : activity.status === "REJECTED" ? "Rejected" : activity.status === "STARTED" ? "Started" : "Completed"}</span>
                  <span className="profile-row-chevron">›</span>
                </div>
              )) : <p className="profile-empty">Complete your first negotiation and your activity will appear here.</p>}
            </div>
          </section>
        </div>

        <div className="profile-right-column">
          <section className="panel-block profile-card profile-performance-card">
            <div className="profile-card-heading profile-heading-with-link"><div className="profile-card-heading-inner"><span className="profile-heading-icon"><Icon name="chart" /></span><div><h2>Overall Performance</h2></div></div><button onClick={() => onNavigate("reports")}>View Details →</button></div>
            <div className="profile-performance-body">
              <div className="profile-score-ring" style={{ "--score": `${score * 3.6}deg` }}><div><strong>{metrics.scoredSessions ? `${Math.round(score)}%` : "—"}</strong><span>Average Score</span></div></div>
              <div className="profile-performance-copy"><h3><span>🏆</span> {performance.label}</h3><p>{performance.description || "Complete Practice Mode negotiations to build your profile performance."}</p></div>
            </div>
            <div className="profile-performance-scale"><div className="profile-scale-bar"><i style={{ left: `${Math.min(100, score)}%` }} /></div><div><span>Needs<br />Improvement<br /><b>(0–49%)</b></span><span>Developing<br /><b>(50–69%)</b></span><span>Proficient<br /><b>(70–84%)</b></span><span>Advanced<br /><b>(85–100%)</b></span></div></div>
          </section>

          <section className="panel-block profile-card profile-achievements-card">
            <div className="profile-card-heading profile-heading-with-link"><div className="profile-card-heading-inner"><span className="profile-heading-icon"><Icon name="trophy" /></span><div><h2>Badges &amp; Achievements</h2></div></div><button onClick={() => onNavigate("reports")}>View All →</button></div>
            <div className="profile-badges-grid">
              <div><span className="achievement-badge badge-gold">★</span><strong>First Agreement</strong><small>{practiceProfile.completedAgreements ? "Earned" : "Keep negotiating"}</small></div>
              <div><span className="achievement-badge badge-blue">◉</span><strong>Consistent Learner</strong><small>{sessions.length >= 2 ? "Earned" : "In progress"}</small></div>
              <div><span className="achievement-badge badge-green">✦</span><strong>Strategic Thinker</strong><small>{score >= 70 ? "Earned" : "In progress"}</small></div>
              <div><span className="achievement-badge badge-purple">ϟ</span><strong>Rising Negotiator</strong><small>{score >= 60 ? "Earned" : "In progress"}</small></div>
            </div>
          </section>

          <section className="panel-block profile-card profile-quick-card">
            <div className="profile-card-heading"><span className="profile-heading-icon"><Icon name="rocket" /></span><div><h2>Quick Actions</h2><p>Keep moving forward</p></div></div>
            <div className="profile-actions">
              <button onClick={() => setEditing(true)}><Icon name="pencil" size={18} /><span>Update Profile Information</span><b>›</b></button>
              <button onClick={openPasswordChange}><Icon name="lock" size={18} /><span>Change Password</span><b>›</b></button>
              <button onClick={openNotifications}><Icon name="bell" size={18} /><span>Notification Settings</span><b>›</b></button>
              <button className="profile-delete-action" onClick={onSignOut}><Icon name="trash" size={18} /><span>Sign out</span><b>›</b></button>
            </div>
          </section>
        </div>
      </div>

      {(notice || error) && <div className={`profile-toast ${error ? "is-error" : ""}`} role="status">{error || notice}<button onClick={() => { setError(""); setNotice(""); }} aria-label="Close">×</button></div>}

      {passwordOpen && (
        <div className="profile-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPasswordOpen(false)}>
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
            <div className="profile-modal-header"><div><span className="profile-kicker">SECURE ACCOUNT</span><h2 id="change-password-title">Change Password</h2></div><button onClick={() => setPasswordOpen(false)} aria-label="Close">×</button></div>
            {passwordStep === "request" && <p>We are sending a one-time verification code to <strong>{user?.email}</strong>.</p>}
            {passwordStep === "otp" && <><p>Enter the 6-digit OTP sent to <strong>{user?.email}</strong>.</p><input className="profile-modal-input" inputMode="numeric" maxLength={6} value={passwordOtp} onChange={(event) => setPasswordOtp(event.target.value.replace(/\D/g, ""))} placeholder="Enter OTP" /><div className="profile-modal-actions"><button className="secondary-action" onClick={() => resendPasswordResetOtp(user?.email || "")}>Resend OTP</button><button className="primary-action" disabled={loading || passwordOtp.length < 4} onClick={verifyPasswordCode}>Verify OTP</button></div></>}
            {passwordStep === "new" && <><p>Choose your new password and confirm it to complete the change.</p><label>New password<input className="profile-modal-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 6 characters" /></label><label>Confirm new password<input className="profile-modal-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" /></label><div className="profile-modal-actions"><button className="secondary-action" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="primary-action" disabled={loading} onClick={confirmPasswordChange}>Change Password</button></div></>}
            {passwordStep === "request" && <div className="profile-modal-actions"><button className="secondary-action" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="primary-action" disabled={loading}>Sending OTP…</button></div>}
          </div>
        </div>
      )}

      {notificationsOpen && (
        <div className="profile-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setNotificationsOpen(false)}>
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="notification-title">
            <div className="profile-modal-header"><div><span className="profile-kicker">NOTIFICATIONS</span><h2 id="notification-title">Notification Settings</h2></div><button onClick={() => setNotificationsOpen(false)} aria-label="Close">×</button></div>
            <p>Choose which NegoSphere notifications you want to receive.</p>
            <div className="profile-notification-options">
              {[['emailNotifications','Email notifications','Account and important platform updates'],['negotiationReminders','Negotiation reminders','Reminders about unfinished sessions'],['reportNotifications','Report notifications','Alerts when reports and analysis are ready'],['productUpdates','Product updates','New features and platform improvements']].map(([key,title,description]) => <label key={key} className="profile-notification-option"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={!!notificationSettings[key]} onChange={(event) => setNotificationSettings((previous) => ({ ...previous, [key]: event.target.checked }))} /></label>)}
            </div>
            <div className="profile-modal-actions"><button className="secondary-action" onClick={() => setNotificationsOpen(false)}>Cancel</button><button className="primary-action" disabled={loading} onClick={saveNotifications}>{loading ? "Saving…" : "Save Settings"}</button></div>
          </div>
        </div>
      )}

      <div className="profile-hidden-stats" aria-hidden="true"><span>{metrics.totalSessions}</span><span>{practiceCount}</span><span>{simulationCount}</span></div>
    </section>
  );
}
