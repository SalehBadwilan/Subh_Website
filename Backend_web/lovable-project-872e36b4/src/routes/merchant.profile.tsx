import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, MapPin, Phone, User } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { packages } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";

export const Route = createFileRoute("/merchant/profile")({
  head: () => ({ meta: [{ title: "الملف التجاري — صبح تاجر" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, status } = useMerchantStore();

  if (!profile) {
    return (
      <MerchantPage title="الملف التجاري" subtitle="معلومات نشاطك المسجّلة لدى صبح.">
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-foreground">
            لا يوجد ملف تجاري بعد
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            يرجى إكمال تسجيل التاجر لعرض بيانات نشاطك.
          </p>
        </section>
      </MerchantPage>
    );
  }

  const pkg = packages.find((p) => p.id === profile.package);
  const isPending = status === "pending";

  return (
    <MerchantPage title="الملف التجاري" subtitle="معلومات نشاطك المسجّلة لدى صبح.">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary text-2xl font-extrabold">
            {profile.businessName.slice(0, 1) || "—"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-foreground">
              {profile.businessName || "—"}
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              انضم إلى صبح في {profile.joinedAt}
              {pkg ? ` • باقة ${pkg.name}` : ""}
            </p>
          </div>
          {isPending ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              قيد المراجعة
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              مُعتمَد
            </span>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Info title="معلومات النشاط">
          <Row icon={Building2} label="اسم النشاط" value={profile.businessName || "—"} />
          <Row icon={Building2} label="السجل التجاري" value={profile.crNumber || "—"} mono />
          <Row icon={Building2} label="الرقم الضريبي" value={profile.taxNumber || "—"} mono />
          <Row icon={User} label="صاحب النشاط" value={profile.ownerName || "—"} />
        </Info>
        <Info title="معلومات التواصل">
          <Row icon={Phone} label="الجوال" value={profile.phone || "—"} mono ltr />
          <Row icon={Mail} label="البريد الإلكتروني" value={profile.email || "—"} ltr />
          <Row icon={MapPin} label="المدينة" value={profile.city || "—"} />
          <Row icon={MapPin} label="العنوان" value={profile.address || "—"} />
        </Info>
      </div>
    </MerchantPage>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-extrabold text-foreground">{title}</h3>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
  ltr,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  mono?: boolean;
  ltr?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p
          className={`text-sm font-bold text-foreground ${mono ? "num" : ""}`}
          dir={ltr ? "ltr" : undefined}
        >
          {value}
        </p>
      </div>
    </li>
  );
}
