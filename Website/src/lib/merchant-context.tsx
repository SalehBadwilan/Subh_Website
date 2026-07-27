/**
 * حالة التاجر — merchant session context.
 *
 * Resolves the REAL merchant owned by the signed-in user (via
 * GET /api/merchants matched on user_id) once, and shares it with every
 * merchant screen. Screens render three states:
 *   - loading  → skeletons
 *   - merchant → the portal
 *   - none     → a "register as merchant" prompt (no merchant row for user)
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiRequestError } from "@/lib/api";
import { findMerchantByUser, type ApiMerchant } from "@/lib/api-merchant";
import { getUser } from "@/lib/auth";

type MerchantContextValue = {
  status: "loading" | "ready" | "none" | "error";
  merchant: ApiMerchant | null;
  error: string | null;
  reload: () => void;
  /** Patch the cached merchant after a successful PUT. */
  setMerchant: (m: ApiMerchant) => void;
};

const MerchantContext = createContext<MerchantContextValue | null>(null);

export function MerchantProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MerchantContextValue["status"]>("loading");
  const [merchant, setMerchantState] = useState<ApiMerchant | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const user = getUser();

    if (!user) {
      setStatus("none");
      setMerchantState(null);
      return;
    }

    const roles = user.roles ?? [];

    if (!roles.includes("merchant")) {
      setStatus("none");
      setMerchantState(null);
      return;
    }
    setStatus("loading");
    setError(null);
    // Owner-only resolution: match a Merchant whose user_id is the signed-in
    // user. Employees are NOT resolved here — they have their own portal
    // (/merchant-employee) and the route guard keeps them out of this one.
    findMerchantByUser(user.id)
      .then((m) => {
        setMerchantState(m);
        setStatus(m ? "ready" : "none");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب بيانات التاجر.");
        setStatus("error");
      });
  }, []);

  useEffect(reload, [reload]);

  return (
    <MerchantContext.Provider
      value={{ status, merchant, error, reload, setMerchant: setMerchantState }}
    >
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant(): MerchantContextValue {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error("useMerchant must be used within MerchantProvider");
  return ctx;
}
