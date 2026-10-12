import { useState } from "react";
import { useAuth } from "../context/authContext.js";
import "./AuthPage.css";

function NegoLogo({ compact = false }) {
  return (
    <div className={`nego-logo ${compact ? "compact" : ""}`}>
      <span className="nego-logo-mark" aria-hidden="true">
        <i /><i /><i />
      </span>
      <div>
        <strong>Nego<span>Sphere</span></strong>
        <small>Negotiate&nbsp; • &nbsp;Learn&nbsp; • &nbsp;Achieve</small>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const {
    signIn,
    signUp,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resendPasswordResetOtp,
    resetPassword,
    oauthSignIn,
    loading,
  } = useAuth();

  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetStep, setResetStep] = useState("email");

  const clearMessage = () => setMessage("");
  const switchMode = (next) => {
    setMode(next);
    setResetStep("email");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    clearMessage();
  };

  const submit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (mode === "forgot") {
      if (resetStep === "email") {
        const result = await requestPasswordReset(email);
        if (result?.requires_otp) {
          setResetStep("otp");
          setMessage(result.message);
        } else setMessage(result?.message || "Unable to start password recovery.");
        return;
      }
      if (resetStep === "otp") {
        const result = await verifyPasswordResetOtp(email, otp);
        if (result?.verified) {
          setResetStep("password");
          setMessage(result.message);
        } else setMessage(result?.message || "Invalid verification code.");
        return;
      }
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
      const result = await resetPassword(email, otp, password);
      setMessage(result?.message || "Unable to reset password.");
      return;
    }

    if (mode === "otp") {
      const result = await verifyOtp(email, otp);
      if (!result?.token) setMessage(result?.message || "OTP verification failed.");
      return;
    }

    const result = mode === "signup"
      ? await signUp(fullName, email, password)
      : await signIn(email, password);

    if (result?.requires_otp) {
      setMode("otp");
      setMessage(result.message || "A 6-digit verification code has been sent to your email.");
    } else if (result?.error || !result?.token) {
      setMessage(result?.error || result?.message || "Unable to complete authentication.");
    }
  };

  const handleSocial = (provider) => {
    clearMessage();
    oauthSignIn(provider);
  };

  const title = mode === "otp"
    ? "Verify your account"
    : mode === "forgot" && resetStep === "otp"
      ? "Verify recovery code"
      : mode === "forgot" && resetStep === "password"
        ? "Create a new password"
        : mode === "forgot"
          ? "Forgot your password?"
          : mode === "signin"
            ? "Welcome Back 👋"
            : "Create your account";

  const description = mode === "otp"
    ? "Enter the verification code sent to your email."
    : mode === "forgot" && resetStep === "email"
      ? "Enter your registered email and we will send a secure verification code."
      : mode === "forgot" && resetStep === "otp"
        ? "Enter the 6-digit code from your password recovery email."
        : mode === "forgot"
          ? "Choose a new password after your email is verified."
          : mode === "signin"
            ? "Sign in to continue your negotiation journey with NegoSphere."
            : "Create your NegoSphere account and start building negotiation skills.";

  return (
    <main className="auth-shell auth-split-shell">
      <section className="auth-hero-side" aria-label="NegoSphere introduction">
        <div className="auth-hero-reference" aria-hidden="true" />
      </section>

      <section className="auth-form-side">
        {(mode === "signin" || mode === "signup") && (
          <div className="auth-create-link">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Sign in"} <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        <div className="auth-card auth-card-light">
          <NegoLogo compact />

          <div className="auth-copy">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <form onSubmit={submit}>
            {mode === "signup" && (
              <label>
                Full Name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
              </label>
            )}

            {(mode === "signin" || mode === "signup" || (mode === "forgot" && resetStep === "email")) && (
              <label>
                Email Address
                <div className="auth-input-wrap">
                  <span className="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 5.5h17v13h-17z"/><path d="m4 7 8 6 8-6"/></svg></span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
                </div>
              </label>
            )}

            {(mode === "signin" || mode === "signup") && (
              <label>
                Password
                <div className="auth-input-wrap">
                  <span className="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5.5" y="10" width="13" height="10" rx="1.5"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter your password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password">
                    {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.9A10.8 10.8 0 0 1 12 7c6.3 0 9.5 5 9.5 5a17 17 0 0 1-3.2 3.5M6.2 6.2C3.7 7.8 2.5 10 2.5 12c0 0 3.2 5 9.5 5 1.2 0 2.3-.2 3.3-.5"/></svg>}
                  </button>
                </div>
              </label>
            )}

            {(mode === "otp" || (mode === "forgot" && resetStep === "otp")) && (
              <label>
                6-digit verification code
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" placeholder="123456" autoComplete="one-time-code" />
              </label>
            )}

            {mode === "forgot" && resetStep === "password" && (
              <>
                <label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" /></label>
                <label>Confirm password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Repeat your new password" /></label>
              </>
            )}

            {mode === "signin" && (
              <div className="auth-login-options">
                <label className="auth-remember">
                  <input type="checkbox" defaultChecked />
                  <span className="remember-box" aria-hidden="true">✓</span>
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth-forgot-link" onClick={() => switchMode("forgot")}>Forgot password?</button>
              </div>
            )}

            <button className="auth-primary auth-primary-light" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "otp"
                  ? "Verify & Continue →"
                  : mode === "forgot" && resetStep === "email"
                    ? "Send Verification Code →"
                    : mode === "forgot" && resetStep === "otp"
                      ? "Verify Code →"
                      : mode === "forgot"
                        ? "Reset Password →"
                        : mode === "signin"
                          ? "Sign In  →"
                          : "Create Account  →"}
            </button>
          </form>

          {message && <div className="auth-message auth-message-light">{message}</div>}

          {mode === "signin" && (
            <>
              <div className="auth-or"><span />OR<span /></div>
              <div className="auth-socials" aria-label="Social sign in options">
                <button type="button" onClick={() => handleSocial("Google")} aria-label="Continue with Google">
                  <span className="social-icon google" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.74-.07-1.27-.23-1.82H12v3.45h5.37a4.58 4.58 0 0 1-1.99 3.01l3.22 2.5c1.88-1.73 2.75-4.28 2.75-7.14Z"/><path fill="#34A853" d="M12 21.75c2.7 0 4.96-.9 6.61-2.44l-3.22-2.5c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A9.99 9.99 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.39 13.64A6.01 6.01 0 0 1 6.07 12c0-.57.11-1.12.32-1.64V7.78H3.06A9.98 9.98 0 0 0 2 12c0 1.61.39 3.13 1.06 4.22l3.33-2.58Z"/><path fill="#EA4335" d="M12 6.23c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.96 3.2 14.7 2.25 12 2.25a9.99 9.99 0 0 0-8.94 5.53l3.33 2.58C7.18 7.99 9.39 6.23 12 6.23Z"/></svg>
                  </span>
                  <span>Continue with Google</span>
                </button>

                <button type="button" onClick={() => handleSocial("GitHub")} aria-label="Continue with GitHub">
                  <span className="social-icon github" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.76-1.3-3.76-1.3-.51-1.29-1.25-1.63-1.25-1.63-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.43-2.22 1.16-3-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15A10.7 10.7 0 0 1 12 6.04c.96 0 1.92.13 2.82.38 2.13-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.73.78 1.16 1.78 1.16 3 0 4.29-2.62 5.24-5.11 5.51.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>
                  </span>
                  <span>Continue with GitHub</span>
                </button>
              </div>
            </>
          )}

          {mode === "otp" && (
            <>
              <button className="switch-auth light-switch" disabled={loading} onClick={async () => setMessage((await resendOtp(email))?.message || "Unable to resend code.")}>Resend verification code</button>
              <button className="switch-auth light-switch" onClick={() => switchMode("signin")}>Use a different email</button>
            </>
          )}

          {mode === "forgot" && resetStep === "otp" && (
            <button className="switch-auth light-switch" disabled={loading} onClick={async () => setMessage((await resendPasswordResetOtp(email))?.message || "Unable to resend code.")}>Resend recovery code</button>
          )}

          {mode === "forgot" && (
            <button className="switch-auth light-switch" onClick={() => switchMode("signin")}>Back to Sign In</button>
          )}

          {mode === "signup" && (
            <button className="switch-auth light-switch" onClick={() => switchMode("signin")}>Already have an account? Sign in</button>
          )}

          <div className="auth-safe-note"><span aria-hidden="true">▣</span> Your data is safe with us. We never share your information.</div>
        </div>
      </section>
    </main>
  );
}
