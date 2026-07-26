import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { AuthUser } from "@/lib/api";

const AUTH_KEY = "subh:auth";
const TOKEN_KEY = "subh:token";
const USER_KEY = "subh:user";

/**
 * Auth routes that must NEVER be captured as a post-login `next` target.
 * Without this, a race in the guard (the effect re-running once the pathname
 * has already become "/login") would set next=/login, so after a successful
 * login the user is sent straight back to the login page — the "double login"
 * loop. Any path under these prefixes is treated as "no usable next".
 */
const AUTH_PATHS = ["/login", "/verify", "/role-redirect"];

/** True when a path is one of the auth screens (login/verify/role-redirect). */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}?`));
}

/** A safe post-login redirect target, or null when `next` is unusable/unsafe. */
export function safeNext(next: string | undefined | null): string | null {
  if (!next || typeof next !== "string") return null;
  // Only allow same-origin absolute paths, never auth screens (avoids loops).
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (isAuthPath(next)) return null;
  return next;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persist the real backend session returned by POST /api/auth/otp/verify:
 * the JWT plus the safe user fields. The legacy "subh:auth" flag is kept so
 * existing guards keep working unchanged.
 */
export function setSession(token: string, user: AuthUser): void {
  try {
    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
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
/**
 * Canonical portal for a set of role slugs — the ONE place a user belongs.
 * Priority ensures employees land on their own portal, never the owner/admin one.
 */
export function portalForRoles(roles: string[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("admin_employee")) return "/admin-employee";
  if (roles.includes("merchant_employee")) return "/merchant-employee";
  if (roles.includes("merchant")) return "/merchant";
  return "/customer";
}

type RoleGuardStatus = "checking" | "allowed" | "denied";

/**
 * Guard a portal on specific role slugs. Behaviour:
 *   - not signed in            → redirect to /login (with a safe `next`)
 *   - signed in, role allowed  → "allowed"
 *   - signed in, wrong portal  → redirect to the user's OWN portal (so a
 *                                merchant employee can never open /merchant,
 *                                an admin employee can never open /admin, etc.)
 *   - signed in, no portal fit → "denied" (caller renders a forbidden screen)
 *
 * This is the frontend UX layer; the backend independently rejects every
 * cross-role API call, so access is enforced on both sides.
 */
export function useRequireRoles(allowed: string[]): RoleGuardStatus {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<RoleGuardStatus>("checking");
  const acted = useRef(false);

  useEffect(() => {
    if (acted.current) return;

    if (!isAuthenticated()) {
      acted.current = true;
      navigate({ to: "/login", search: { next: safeNext(pathname) ?? undefined }, replace: true });
      return;
    }

    const roles = getUser()?.roles ?? [];
console.log("Roles:", roles);
console.log("Path:", pathname);

// اسمح للعميل بالدخول إلى صفحة التقديم كتاجر
if (
  pathname.startsWith("/merchant/register") &&
  roles.includes("customer")
) {
  setStatus("allowed");
  return;
}

if (allowed.some((r) => roles.includes(r))) {
  setStatus("allowed");
  return;
}

    // Wrong portal → send them to where they DO belong (if anywhere else).
    const home = portalForRoles(roles);
    if (home !== pathname && !pathname.startsWith(`${home}/`) && pathname !== home) {
      acted.current = true;
      navigate({ to: home, replace: true });
      return;
    }
    setStatus("denied");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, pathname]);

  return status;
}

export function useRequireAuth(): boolean {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);
  // Guard against a double redirect: once we've bounced to /login we must not
  // fire again with a now-stale pathname (which was the source of next=/login).
  const redirected = useRef(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setReady(true);
      return;
    }
    // Never capture an auth screen as `next`, and only redirect once.
    if (redirected.current || isAuthPath(pathname)) return;
    redirected.current = true;
    navigate({ to: "/login", search: { next: safeNext(pathname) ?? undefined }, replace: true });
  }, [navigate, pathname]);

  return ready;
}
