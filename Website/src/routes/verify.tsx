import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { safeNext, setSession } from "@/lib/auth";
import { ApiRequestError, fetchUserRoleSlugs, requestOtp, verifyOtp } from "@/lib/api";

const verifySearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "التحقق من الرمز — صبح" },
      { name: "description", content: "أدخل رمز التحقق المرسل إلى جوالك." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => verifySearchSchema.parse(s),
  component: VerifyPage,
});

const RESEND_SECONDS = 45;

function VerifyPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [phone, setPhone] = useState<string>("");
  const [devOtp, setDevOtp] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    try {
      setPhone(sessionStorage.getItem("subh:phone") || "");
      setDevOtp(sessionStorage.getItem("subh:devOtp") || "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("يرجى إدخال الرمز المكوّن من 6 أرقام.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Real backend call: POST /api/auth/otp/verify → JWT + user.
      const { data } = await verifyOtp(phone, code);

      setSession(data.token, data.user);

      const roles = await fetchUserRoleSlugs();

      console.log("Roles from verify:", data.user.roles);
      console.log("Roles from /users/me/roles:", roles);

      setSession(data.token, {
        ...data.user,
        roles,
      });
      // Return the user to the page they were trying to reach (e.g. checkout),
      // preserving the shopping cart along the way. `safeNext` rejects auth
      // screens so we never loop back to /login or /verify.
      const dest = safeNext(next);
      if (dest) {
        navigate({ to: dest, replace: true });
      } else {
        navigate({ to: "/role-redirect", replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      // Re-issue a fresh code from the backend (revokes the previous one).
      const result = await requestOtp(phone);
      const fresh = result.devOtp || "";
      setDevOtp(fresh);
      try {
        if (fresh) sessionStorage.setItem("subh:devOtp", fresh);
        else sessionStorage.removeItem("subh:devOtp");
      } catch {
        /* ignore */
      }
      setCode("");
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "تعذّرت إعادة الإرسال، حاول مرة أخرى.",
      );
    } finally {
      setResending(false);
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <AuthLayout step={{ current: 2, total: 2, label: "التحقق" }}>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">أدخل رمز التحقق</h1>
        <p className="text-sm text-muted-foreground">
          أرسلنا رمزًا مكوّنًا من 6 أرقام إلى{" "}
          <span className="num font-semibold text-foreground">{phone || "رقمك"}</span>
        </p>
        <Link
          to="/login"
          search={{ next }}
          className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-primary hover:underline"
        >
          تغيير الرقم
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        </Link>
      </div>

      {devOtp && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
          <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            وضع التطوير — رمزك هو{" "}
            <button
              type="button"
              onClick={() => setCode(devOtp)}
              className="num font-bold tracking-widest text-primary underline-offset-4 hover:underline"
              aria-label="استخدام رمز التطوير"
            >
              {devOtp}
            </button>
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        <div className="flex flex-col items-center gap-3">
          <div dir="ltr">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              disabled={loading}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-13 w-12 rounded-xl border !border-input bg-background text-lg font-bold text-foreground shadow-sm first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-primary sm:h-14 sm:w-12"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-bold"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ التحقق…
            </>
          ) : (
            "تحقّق ومتابعة"
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-sm">
          {seconds > 0 ? (
            <p className="text-muted-foreground">
              يمكنك طلب رمز جديد خلال{" "}
              <span className="num font-semibold text-foreground">
                {mm}:{ss}
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              إعادة إرسال الرمز
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
