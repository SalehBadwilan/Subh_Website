import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Building2, Landmark, Loader2, Pencil, Percent } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError } from "@/lib/api";
import { updateMerchant } from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/profile")({
  head: () => ({ meta: [{ title: "الملف التجاري — صبح تاجر" }] }),
  component: MerchantProfilePage,
});

function MerchantProfilePage() {
  const { merchant, setMerchant } = useMerchant();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(merchant?.commercial_name ?? "");
  const [iban, setIban] = useState(merchant?.iban ?? "");
  const [saving, setSaving] = useState(false);

  if (!merchant) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!merchant) return;
    if (!name.trim() || !iban.trim()) {
      toast.error("الاسم التجاري والآيبان مطلوبان.");
      return;
    }
    setSaving(true);
    try {
      // Real backend call: PUT /api/merchants/:id
      const updated = await updateMerchant(merchant.id, {
        commercial_name: name.trim(),
        iban: iban.trim(),
      });
      setMerchant(updated);
      setEditing(false);
      toast.success("تم تحديث الملف التجاري.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: "السجل التجاري", value: merchant.commercial_registration_no, icon: Building2 },
    { label: "الرقم الضريبي", value: merchant.vat_number ?? "—", icon: Percent },
    {
      label: "نسبة عمولة صبح",
      value: `${Math.round((Number.parseFloat(String(merchant.commission_rate)) || 0) * 100)}٪`,
      icon: Percent,
    },
  ];

  return (
    <MerchantPage
      title="الملف التجاري"
      subtitle="بياناتك الحقيقية المسجّلة في نظام صبح"
      action={
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-bold",
            merchant.status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          {merchant.status === "active" ? "نشط" : merchant.status}
        </span>
      }
    >
      <section className="rounded-2xl border border-border bg-card p-6">
        {editing ? (
          <form onSubmit={save} className="max-w-md space-y-4">
            <div>
              <Label htmlFor="m-name" className="text-xs font-semibold">
                الاسم التجاري
              </Label>
              <Input
                id="m-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={150}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="m-iban" className="text-xs font-semibold">
                الآيبان (IBAN)
              </Label>
              <Input
                id="m-iban"
                dir="ltr"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                maxLength={34}
                className="num mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="rounded-full font-bold" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setName(merchant.commercial_name);
                  setIban(merchant.iban);
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">
                    {merchant.commercial_name}
                  </h2>
                  <p className="num mt-0.5 text-xs text-muted-foreground" dir="ltr">
                    <Landmark className="ml-1 inline h-3.5 w-3.5" />
                    {merchant.iban}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setName(merchant.commercial_name);
                  setIban(merchant.iban);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              {fields.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-4">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </dt>
                  <dd className="num mt-1.5 text-sm font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </MerchantPage>
  );
}
