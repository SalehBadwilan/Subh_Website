import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

const AUTH_KEY = "subh:auth";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthenticated(): void {
  try {
    sessionStorage.setItem(AUTH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
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
