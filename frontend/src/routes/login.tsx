import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Phone } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";

const loginSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — صبح" },
      {
        name: "description",
        content: "سجّل الدخول إلى منصة صبح باستخدام رقم جوالك السعودي.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => loginSearchSchema.parse(s),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const isValid = /^5\d{8}$/.test(digits);

  function handleChange(v: string) {
    const cleaned = v.replace(/\D/g, "").slice(0, 9);
    setPhone(cleaned);
    if (error) setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError("يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 5 ويتكون من 9 أرقام.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      sessionStorage.setItem("subh:phone", `+966${digits}`);
    } catch {
      /* ignore */
    }
    setLoading(false);
    navigate({ to: "/verify", search: { next } });
  }

  return (
    <AuthLayout step={{ current: 1, total: 2, label: "رقم الجوال" }}>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          مرحبًا بك في صبح
        </h1>
        <p className="text-sm text-muted-foreground">
          أدخل رقم جوالك السعودي لإرسال رمز التحقق.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-semibold">
            رقم الجوال
          </Label>
          <div
            className={`flex items-stretch overflow-hidden rounded-xl border bg-background shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
              error ? "border-destructive" : "border-input"
            }`}
            dir="ltr"
          >
            <span className="flex items-center gap-1.5 border-l border-input bg-muted px-3.5 text-sm font-semibold text-muted-foreground">
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="num">+966</span>
            </span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="5X XXX XXXX"
              value={phone}
              onChange={(e) => handleChange(e.target.value)}
              className="num w-full bg-transparent px-4 py-3 text-base tracking-wider text-foreground outline-none placeholder:text-muted-foreground/70"
              aria-invalid={!!error}
              aria-describedby={error ? "phone-error" : "phone-hint"}
            />
          </div>
          {error ? (
            <p id="phone-error" className="text-xs font-medium text-destructive">
              {error}
            </p>
          ) : (
            <p id="phone-hint" className="text-xs text-muted-foreground">
              مثال: 5X XXX XXXX
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-bold"
          disabled={loading || !isValid}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جارٍ الإرسال…
            </>
          ) : (
            "متابعة"
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          بمتابعتك، فإنك توافق على{" "}
          <a className="font-semibold text-foreground underline-offset-4 hover:underline" href="#">
            شروط الاستخدام
          </a>{" "}
          و{" "}
          <a className="font-semibold text-foreground underline-offset-4 hover:underline" href="#">
            سياسة الخصوصية
          </a>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
