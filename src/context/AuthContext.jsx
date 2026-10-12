import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext.js";

const API = (
  import.meta.env.VITE_PLATFORM_API_BASE_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

const TOKEN_KEY = "nego_auth_token";
const USER_KEY = "nego_user_info";
const AUTH_VERSION_KEY = "nego_auth_version";
const AUTH_VERSION = "2026-10-04-auth-server-fixed";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const networkError = new Error(
      "Unable to reach the NegoSphere authentication server."
    );
    networkError.code = "NETWORK_ERROR";
    networkError.cause = error;
    throw networkError;
  }

  const text = await response.text();

  if (!response.ok) {
    let detail = "Authentication request failed.";

    try {
      detail = JSON.parse(text).detail || detail;
    } catch {
      detail = text || detail;
    }

    const requestError = new Error(detail);
    requestError.status = response.status;
    throw requestError;
  }

  return text ? JSON.parse(text) : {};
}

export function AuthProvider({ children }) {
  // Clear authentication left by older builds once, so a newly installed
  // platform always presents the login screen instead of silently reusing
  // an incompatible/stale token. After login, normal session persistence
  // continues to work.
  useState(() => {
    try {
      if (localStorage.getItem(AUTH_VERSION_KEY) !== AUTH_VERSION) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.setItem(AUTH_VERSION_KEY, AUTH_VERSION);
      }
    } catch {
      // Continue; the auth state below will handle unavailable storage.
    }
    return null;
  });

  const [user, setUser] = useState(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      );

      if (storedUser?.id === "guest") {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }

      return storedUser;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_KEY)
  );

  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Complete browser-based Google/GitHub/Microsoft OAuth redirects. The backend
  // returns the short-lived session token in the URL fragment, which is not sent
  // as a Referer header. We immediately remove it from browser history.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const oauthToken = params.get("oauth_token");
    const oauthError = params.get("oauth_error");

    if (oauthToken) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setBackendAvailable(true);
      setToken(oauthToken);
      localStorage.setItem(TOKEN_KEY, oauthToken);
    } else if (oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setBackendAvailable(true);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    request("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((data) => {
        if (localStorage.getItem(TOKEN_KEY) !== token) return;

        setBackendAvailable(true);
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      })
      .catch((error) => {
        if (localStorage.getItem(TOKEN_KEY) !== token) return;

        if (
          error.code === "NETWORK_ERROR" ||
          ![401, 404].includes(error.status)
        ) {
          setBackendAvailable(false);
          return;
        }

        setToken(null);
        setUser(null);

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      });
  }, [token]);

  const save = useCallback((nextToken, nextUser) => {
    setToken(nextToken || null);
    setUser(nextUser || null);

    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const signUp = useCallback(
    async (fullName, email, password) => {
      setLoading(true);

      try {
        const result = await request("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
          }),
        });

        setBackendAvailable(true);

        if (result.token && result.user) {
          save(result.token, result.user);
        }

        return result;
      } catch (error) {
        if (error.code === "NETWORK_ERROR") {
          setBackendAvailable(false);
        }

        return {
          requires_otp: false,
          localFallback: error.code === "NETWORK_ERROR",
          message: error.message,
          error: error.message,
        };
      } finally {
        setLoading(false);
      }
    },
    [save]
  );

  const verifyOtp = useCallback(
    async (email, otp) => {
      setLoading(true);

      try {
        const result = await request("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            email,
            otp_code: otp,
          }),
        });

        save(result.token, result.user);

        return result;
      } catch (error) {
        if (error.code === "NETWORK_ERROR") {
          setBackendAvailable(false);
        }

        return {
          success: false,
          error: error.message,
          message: error.message,
        };
      } finally {
        setLoading(false);
      }
    },
    [save]
  );

  const resendOtp = useCallback(async (email) => {
    setLoading(true);

    try {
      const result = await request("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
        }),
      });

      setBackendAvailable(true);

      return result;
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        setBackendAvailable(false);
      }

      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    setLoading(true);
    try {
      const result = await request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setBackendAvailable(true);
      return result;
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const resendPasswordResetOtp = useCallback(async (email) => {
    setLoading(true);
    try {
      const result = await request("/auth/resend-password-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setBackendAvailable(true);
      return result;
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email, otp) => {
    setLoading(true);
    try {
      const result = await request("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp_code: otp }),
      });
      setBackendAvailable(true);
      return result;
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword) => {
    setLoading(true);
    try {
      const result = await request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp_code: otp, new_password: newPassword }),
      });
      setBackendAvailable(true);
      if (result.token && result.user) save(result.token, result.user);
      return result;
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [save]);

  const updateProfile = useCallback(async (fullName, email, bio) => {
    setLoading(true);
    try {
      const result = await request("/auth/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, email, bio }),
      });
      setBackendAvailable(true);
      save(token, result);
      return { success: true, user: result, message: "Profile updated successfully." };
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [save, token]);

  const getNotificationSettings = useCallback(async () => {
    try {
      const result = await request("/auth/notifications", { headers: { Authorization: `Bearer ${token}` } });
      return result.settings || {};
    } catch (error) {
      return {
        emailNotifications: true,
        negotiationReminders: true,
        reportNotifications: true,
        productUpdates: false,
      };
    }
  }, [token]);

  const updateNotificationSettings = useCallback(async (settings) => {
    setLoading(true);
    try {
      const result = await request("/auth/notifications", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      setBackendAvailable(true);
      return { success: true, settings: result.settings, message: result.message };
    } catch (error) {
      if (error.code === "NETWORK_ERROR") setBackendAvailable(false);
      return { success: false, error: error.message, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [token]);

  const signIn = useCallback(
    async (email, password) => {
      setLoading(true);

      try {
        const result = await request("/auth/signin", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });

        if (result.token && result.user) {
          save(result.token, result.user);
        }

        return result;
      } catch (error) {
        if (error.code === "NETWORK_ERROR") {
          setBackendAvailable(false);
        }

        return {
          success: false,
          localFallback: error.code === "NETWORK_ERROR",
          error: error.message,
          message: error.message,
        };
      } finally {
        setLoading(false);
      }
    },
    [save]
  );

  const oauthSignIn = useCallback((provider) => {
    const normalized = String(provider || "").toLowerCase();
    if (!["google", "github", "microsoft"].includes(normalized)) return;
    const frontendOrigin = window.location.origin;
    const startUrl = `${API}/auth/oauth/${normalized}/start?frontend_origin=${encodeURIComponent(frontendOrigin)}`;
    window.location.assign(startUrl);
  }, []);

  const signOut = useCallback(() => {
    save(null, null);
  }, [save]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      backendAvailable,
      isAuthenticated: !!user,
      signUp,
      verifyOtp,
      resendOtp,
      signIn,
      updateProfile,
      getNotificationSettings,
      updateNotificationSettings,
      oauthSignIn,
      requestPasswordReset,
      verifyPasswordResetOtp,
      resendPasswordResetOtp,
      resetPassword,
      signOut,
    }),
    [
      user,
      token,
      loading,
      backendAvailable,
      signUp,
      verifyOtp,
      resendOtp,
      signIn,
      updateProfile,
      getNotificationSettings,
      updateNotificationSettings,
      oauthSignIn,
      requestPasswordReset,
      verifyPasswordResetOtp,
      resendPasswordResetOtp,
      resetPassword,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
