import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatSAR, merchantProfile, packages } from "@/lib/merchant-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/subscription")({
  head: () => ({ meta: [{ title: "باقة الاشتراك — صبح تاجر" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const [currentId, setCurrentId] = useState(merchantProfile.package);
  const [changeTo, setChangeTo] = useState<string | null>(null);
  const current = packages.find((p) => p.id === currentId)!;

  function confirmChange() {
    if (!changeTo) return;
    setCurrentId(changeTo);
    toast.success("تم إرسال طلب تغيير الباقة. سيتم تفعيلها بعد المراجعة.");
    setChangeTo(null);
  }

  return (
    <MerchantPage title="باقة الاشتراك" subtitle="تحكّم في باقتك الحالية وطوّرها متى شئت.">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              باقتك الحالية
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-foreground">{current.name}</h2>
            <p className="text-sm text-muted-foreground">{current.tagline}</p>
          </div>
          <div className="text-left">
            <p className="num text-3xl font-extrabold text-foreground">
              {formatSAR(current.price)}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">شهريًا</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {current.features.map((f) => (
            <div key={f} className="flex items-start gap-2 text-sm text-foreground/85">
              <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-4 text-sm">
          <span className="text-muted-foreground">تاريخ انتهاء الاشتراك</span>
          <span className="font-bold text-foreground">{merchantProfile.packageExpiry}</span>
        </div>
      </section>

      <h3 className="mt-8 mb-3 text-base font-extrabold text-foreground">الباقات المتاحة</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((p) => {
          const isCurrent = p.id === currentId;
          return (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-5",
                p.featured ? "border-primary shadow-sm" : "border-border",
              )}
            >
              {p.featured && (
                <span className="absolute left-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  الأكثر اختيارًا
                </span>
              )}
              <h4 className="text-lg font-extrabold text-foreground">{p.name}</h4>
              <p className="text-xs text-muted-foreground">{p.tagline}</p>
              <p className="mt-3 num text-3xl font-extrabold text-foreground">
                {p.price.toLocaleString("ar-SA")}
                <span className="text-sm font-semibold text-muted-foreground"> ر.س/شهر</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5"
                disabled={isCurrent}
                variant={isCurrent ? "outline" : "default"}
                onClick={() => setChangeTo(p.id)}
              >
                {isCurrent ? "الباقة الحالية" : "الترقية إلى هذه الباقة"}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!changeTo} onOpenChange={(o) => !o && setChangeTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير الباقة</DialogTitle>
            <DialogDescription>
              هل تريد تقديم طلب الانتقال إلى باقة{" "}
              <b>{packages.find((p) => p.id === changeTo)?.name}</b>؟ سيتم مراجعة الطلب من فريق صبح.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeTo(null)}>
              إلغاء
            </Button>
            <Button onClick={confirmChange}>تأكيد الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantPage>
  );
}
