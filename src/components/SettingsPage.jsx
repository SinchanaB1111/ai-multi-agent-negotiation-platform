import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/authContext.js";
import "./SettingsPage.css";

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const icons = {
    account: <><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6"/></>,
    notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    security: <><path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    data: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.5 1.5c-.8 1-2.2 1.2-2.2 2.8"/><path d="M12 17h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l-1.9 1.9a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6H11a1.8 1.8 0 0 0-1.1-1.6 1.8 1.8 0 0 0-2 .4L6 17a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 5 13.9v-2.7A1.8 1.8 0 0 0 6.4 10 1.8 1.8 0 0 0 6 8l1.9-1.9a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 11 5V3h2v2a1.8 1.8 0 0 0 1.1 1.5 1.8 1.8 0 0 0 2-.4L18 8a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.4 1.2V14A1.8 1.8 0 0 0 19.4 15Z"/></>,
  };
  return <svg {...common}>{icons[name] || icons.settings}</svg>;
}

const defaultNotifications = {
  emailNotifications: true,
  negotiationReminders: true,
  reportNotifications: true,
  productUpdates: false,
};

function Toggle({ checked, onChange }) {
  return <button type="button" className={`settings-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}><span /></button>;
}

function SettingsPage({ settings, onChange, onClearHistory, onBack }) {
  const {
    user,
    loading,
    updateProfile,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resetPassword,
    getNotificationSettings,
    updateNotificationSettings,
  } = useAuth();

  const [section, setSection] = useState("account");
  const [profile, setProfile] = useState({ fullName: user?.full_name || "", email: user?.email || "", bio: user?.bio || "" });
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [notice, setNotice] = useState("");
  const [passwordStep, setPasswordStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    setProfile({ fullName: user?.full_name || "", email: user?.email || "", bio: user?.bio || "" });
  }, [user]);

  useEffect(() => {
    getNotificationSettings().then((saved) => setNotifications((prev) => ({ ...prev, ...saved })));
  }, [getNotificationSettings]);

  const initials = useMemo(() => (profile.fullName || user?.email || "N").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [profile.fullName, user?.email]);

  const update = (key, value) => {
    onChange((previous) => ({ ...previous, [key]: value }));
  };

  const saveProfile = async () => {
    const result = await updateProfile(profile.fullName.trim(), profile.email.trim(), profile.bio.trim());
    setNotice(result.success ? "Profile details saved successfully." : (result.message || "Unable to save profile details."));
  };

  const saveNotifications = async () => {
    const result = await updateNotificationSettings(notifications);
    setNotice(result.success ? "Notification preferences saved." : (result.message || "Unable to save notification preferences."));
  };

  const startPasswordReset = async () => {
    setPasswordMessage("");
    const result = await requestPasswordReset(profile.email);
    if (result.success !== false) {
      setPasswordStep("otp");
      setPasswordMessage(result.message || "A verification code has been sent to your email.");
    } else {
      setPasswordMessage(result.message || "Unable to send the verification code.");
    }
  };

  const verifyOtp = async () => {
    const result = await verifyPasswordResetOtp(profile.email, otp);
    if (result.success !== false) {
      setPasswordStep("new");
      setPasswordMessage(result.message || "Code verified. Create your new password.");
    } else {
      setPasswordMessage(result.message || "Invalid verification code.");
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) return setPasswordMessage("Use at least 8 characters for the new password.");
    if (newPassword !== confirmPassword) return setPasswordMessage("New password and confirmation do not match.");
    const result = await resetPassword(profile.email, otp, newPassword);
    if (result.success !== false) {
      setPasswordStep("done");
      setPasswordMessage(result.message || "Password changed successfully.");
      setOtp(""); setNewPassword(""); setConfirmPassword("");
    } else {
      setPasswordMessage(result.message || "Unable to change the password.");
    }
  };

  const sections = [
    ["account", "Account Settings", "Manage your profile and account details", "account"],
    ["notifications", "Notifications", "Control your notifications and alerts", "notifications"],
    ["security", "Privacy & Security", "Protect your account and data", "security"],
    ["data", "Data & Storage", "Manage your data and storage", "data"],
    ["help", "Help & Support", "Get help and contact support", "help"],
  ];

  return (
    <section className="settings-page settings-reference-page">
      <div className="settings-reference-heading">
        <button type="button" className="settings-back-button" onClick={() => onBack?.()} aria-label="Back to workspace">← Back</button>
        <div className="settings-title-icon"><Icon name="settings" size={31} /></div>
        <div><h1>Settings</h1><p>Manage your account preferences and platform settings</p></div>
      </div>

      {notice && <div className="settings-toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

      <div className="settings-reference-layout">
        <aside className="settings-section-nav">
          {sections.map(([key, title, description, icon]) => (
            <button key={key} className={section === key ? "active" : ""} onClick={() => { setSection(key); setNotice(""); }}>
              <span className="settings-nav-icon"><Icon name={icon} size={24} /></span>
              <span><strong>{title}</strong><small>{description}</small></span>
            </button>
          ))}
        </aside>

        <main className="settings-reference-main">
          {section === "account" && (
            <div className="settings-main-card">
              <div className="settings-card-heading"><div><h2>Account Settings</h2><p>Update your personal preferences and account details</p></div><span className="settings-connected"><i /> Account Connected</span></div>
              <div className="settings-account-grid">
                <div className="settings-profile-card">
                  <div className="settings-profile-summary"><div className="settings-avatar">{initials}</div><div><h3>{profile.fullName || "Negotiator"}</h3><p>Learner&nbsp; · &nbsp;Team Player</p><span>Curious mind. Better negotiations. Bigger goals.</span></div></div>
                  <label>Full Name<input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></label>
                  <label>Email Address<input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
                  <label>Bio<textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={5} /></label>
                  <button className="settings-primary" onClick={saveProfile} disabled={loading}>▣ {loading ? "Saving…" : "Save Changes"}</button>
                </div>
                <div className="settings-side-stack">
                  <div className="settings-mini-card"><div className="settings-mini-title"><Icon name="security" size={23} /><div><h3>Change Password</h3><p>Keep your account secure with a strong password.</p></div></div>
                    {passwordStep === "idle" && <button className="settings-outline" onClick={startPasswordReset} disabled={loading}>Change Password <span>›</span></button>}
                    {passwordStep === "otp" && <div className="settings-password-flow"><input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter email OTP" inputMode="numeric" /><button className="settings-outline" onClick={verifyOtp} disabled={loading}>Verify OTP</button><small>{passwordMessage}</small></div>}
                    {passwordStep === "new" && <div className="settings-password-flow"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" /><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" /><button className="settings-outline" onClick={changePassword} disabled={loading}>Update Password</button><small>{passwordMessage}</small></div>}
                    {passwordStep === "done" && <div className="settings-success">✓ {passwordMessage}<button onClick={() => { setPasswordStep("idle"); setPasswordMessage(""); }}>Done</button></div>}
                  </div>
                  <div className="settings-mini-card"><div className="settings-mini-title"><Icon name="data" size={23} /><div><h3>Account Information</h3><p>Current account details</p></div></div><dl className="settings-account-info"><div><dt>Account Type</dt><dd>Member</dd></div><div><dt>Member Since</dt><dd>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active account"}</dd></div><div><dt>Email</dt><dd>{user?.email || profile.email}</dd></div></dl></div>
                </div>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="settings-main-card"><div className="settings-card-heading"><div><h2>Notifications</h2><p>Choose which alerts NegoSphere should send you</p></div></div><div className="settings-option-list">
              {[["emailNotifications","Email Notifications","Stay updated with important account and platform alerts."],["negotiationReminders","Negotiation Reminders","Reminders about unfinished or upcoming negotiations."],["reportNotifications","Report Notifications","Know when reports and analysis are ready."],["productUpdates","Product Updates","New features, improvements and platform announcements."]].map(([key,title,desc]) => <div className="settings-option" key={key}><div><strong>{title}</strong><small>{desc}</small></div><Toggle checked={!!notifications[key]} onChange={(value) => setNotifications((prev) => ({ ...prev, [key]: value }))} /></div>)}
            </div><button className="settings-primary" onClick={saveNotifications} disabled={loading}>{loading ? "Saving…" : "Save Notification Settings"}</button></div>
          )}

          {section === "security" && (
            <div className="settings-main-card"><div className="settings-card-heading"><div><h2>Privacy & Security</h2><p>Protect your account and keep your information under your control</p></div></div><div className="settings-security-grid"><div><Icon name="security" size={27}/><h3>Authentication</h3><p>Your account uses the existing NegoSphere authentication and email verification flow.</p></div><div><Icon name="notifications" size={27}/><h3>Security alerts</h3><p>Important account and password events can be delivered through your notification preferences.</p></div><div><Icon name="data" size={27}/><h3>Data protection</h3><p>Private authentication credentials are handled by the existing backend authentication service.</p></div></div><button className="settings-outline" onClick={startPasswordReset} disabled={loading}>Start Password Change</button></div>
          )}

          {section === "data" && (
            <div className="settings-main-card"><div className="settings-card-heading"><div><h2>Data & Storage</h2><p>Manage your saved negotiation information</p></div></div><div className="settings-danger-card"><div><h3>Clear negotiation history</h3><p>Remove saved negotiation sessions from this workspace. This action cannot be undone.</p></div><button className="settings-danger" onClick={() => { if (window.confirm("Clear all saved negotiation history?")) onClearHistory?.(); }}>Clear History</button></div><div className="settings-note-box">Reports and analytics use the negotiation history retained by the platform. Clearing history removes those saved sessions from this workspace.</div><button className="settings-outline" onClick={() => onChange(() => ({ defaultMode: "simulation", defaultRounds: 5, automaticNegotiation: true, concessionLimit: 15, negotiationTimeout: 60, providerMode: "auto", provider: "gemini", fallbackEnabled: true, coachingEnabled: true, finalReportEnabled: true, strategySuggestions: true, demoMode: false }))}>Reset Platform Preferences</button></div>
          )}

          {section === "help" && (
            <div className="settings-main-card"><div className="settings-card-heading"><div><h2>Help & Support</h2><p>Get help with your NegoSphere workspace</p></div></div><div className="settings-help-card"><Icon name="help" size={30}/><div><h3>Need assistance?</h3><p>For account, authentication or negotiation-platform issues, contact your project administrator or support team.</p><a href="mailto:support@negosphere.local">Contact Support →</a></div></div><div className="settings-faq"><strong>Quick checks</strong><span>Make sure the authentication server is running for profile, password and notification changes.</span><span>Negotiation preferences are stored in this browser.</span></div></div>
          )}
        </main>
      </div>
    </section>
  );
}

export default SettingsPage;
