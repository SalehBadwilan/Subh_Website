import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { getAuthToken, setAuthToken } from "@/lib/api-client";

const AUTH_KEY = "subh:auth";

/**
 * Auth state lives in sessionStorage.
 *
 * Two pieces:
 *  - `subh:auth`  = "1" (legacy boolean flag — kept for backward compatibility
 *                  with existing useRequireAuth guard + any other consumers).
 *  - `subh:token` = the JWT returned by POST /api/auth/otp/verify. Read/written
 *                  through api-client.ts so the API client is the single place
 *                  that attaches the bearer header.
 *
 * Both are set together on a successful login, and cleared together on logout.
 */

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

/** Read the stored JWT (or null). Exposed for components that want to show
 *  "logged in as X" — never log this value. */
export function getAuth(): { token: string | null; authenticated: boolean } {
  return { token: getAuthToken(), authenticated: isAuthenticated() };
}

/** Mark the session as authenticated. If a real JWT was issued by the backend,
 *  pass it here so subsequent API calls carry the bearer. */
export function setAuthenticated(token?: string | null): void {
  try {
    sessionStorage.setItem(AUTH_KEY, "1");
  } catch {
    /* ignore */
  }
  // Sync the token storage too. Passing null/undefined clears any stale token
  // (e.g. logging in again after expiry) — but only clear if explicitly null.
  if (token === null) setAuthToken(null);
  else if (token) setAuthToken(token);
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
  setAuthToken(null);
}

/**
 * Guard hook for protected pages. If the user is not authenticated,
 * redirects to /login with a ?next= param pointing back to the current URL.
 * Returns `true` only after the check confirmed the user is signed in, so
 * callers can render `null` until then to avoid flashing protected content.
 */
export function useRequireAuth(): boolean {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login", search: { next: pathname }, replace: true });
    } else {
      setReady(true);
    }
  }, [navigate, pathname]);

  return ready;
}
