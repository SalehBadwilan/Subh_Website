import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MapPin, Pencil, Plus, RefreshCcw, Star, Trash2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { getUser, useRequireAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type AddressInput,
  type ApiAddress,
} from "@/lib/api-customer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/addresses")({
  head: () => ({
    meta: [
      { title: "العناوين — صبح" },
      { name: "description", content: "إدارة عناوين التوصيل في صبح." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AddressesPage,
});

/**
 * The form uses simple Arabic labels; these map onto the backend Address
 * columns: recipient→recipient_name, street→line1, city→city, district→region.
 */
type FormState = {
  recipient: string;
  phone: string;
  city: string;
  district: string;
  street: string;
};

const emptyForm: FormState = {
  recipient: "",
  phone: "",
  city: "",
  district: "",
  street: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.recipient.trim()) errors.recipient = "اسم المستلم مطلوب.";
  if (!form.phone.trim()) errors.phone = "رقم الجوال مطلوب.";
  else if (!/^\+?\d{9,15}$/.test(form.phone.replace(/\s+/g, "")))
    errors.phone = "رقم الجوال غير صحيح.";
  if (!form.city.trim()) errors.city = "المدينة مطلوبة.";
  if (!form.district.trim()) errors.district = "المنطقة مطلوبة.";
  if (!form.street.trim()) errors.street = "الشارع مطلوب.";
  return errors;
}

function toInput(form: FormState, is_default?: boolean): AddressInput {
  return {
    recipient_name: form.recipient.trim(),
    phone: form.phone.trim(),
    line1: form.street.trim(),
    city: form.city.trim(),
    region: form.district.trim(),
    ...(is_default !== undefined ? { is_default } : {}),
  };
}

type LoadStatus = "loading" | "success" | "error";

function AddressesPage() {
  const ready = useRequireAuth();
  const userId = getUser()?.id ?? null;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [items, setItems] = useState<ApiAddress[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiAddress | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setStatus("loading");
    setLoadError(null);
    // Real backend call: GET /api/addresses?user_id=
    getAddresses(userId)
      .then((rows) => {
        setItems(rows);
        setStatus("success");
      })
      .catch((err) => {
        setLoadError(err instanceof ApiRequestError ? err.message : "تعذّر جلب العناوين.");
        setStatus("error");
      });
  }, [userId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(a: ApiAddress) {
    setEditingId(a.id);
    setForm({
      recipient: a.recipient_name,
      phone: a.phone,
      city: a.city,
      district: a.region,
      street: a.line1,
    });
    setErrors({});
    setDialogOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setSaving(true);
    try {
      if (editingId) {
        // Real backend call: PUT /api/addresses/:id
        const updated = await updateAddress(editingId, toInput(form));
        setItems((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast.success("تم تحديث العنوان.");
      } else {
        // First address becomes the default automatically.
        const isFirst = items.length === 0;
        // Real backend call: POST /api/addresses
        const created = await createAddress(userId, toInput(form, isFirst || undefined));
        setItems((prev) => [...prev, created]);
        toast.success("تمت إضافة العنوان.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر حفظ العنوان.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setBusyId(target.id);
    try {
      // Real backend call: DELETE /api/addresses/:id
      await deleteAddress(target.id);
      setItems((prev) => prev.filter((a) => a.id !== target.id));
      toast.success("تم حذف العنوان.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر حذف العنوان.");
    } finally {
      setBusyId(null);
    }
  }

  async function makeDefault(a: ApiAddress) {
    setBusyId(a.id);
    try {
      // There's no /:id/default endpoint — flip is_default via PUT, and clear it
      // on the previous default so only one stays marked.
      const prevDefault = items.find((x) => x.is_default && x.id !== a.id);
      // Real backend call: PUT /api/addresses/:id
      const updated = await updateAddress(a.id, { is_default: true });
      if (prevDefault) await updateAddress(prevDefault.id, { is_default: false });
      setItems((prev) =>
        prev.map((x) =>
          x.id === updated.id ? updated : { ...x, is_default: false },
        ),
      );
      toast.success("تم تعيين العنوان كافتراضي.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر التحديث.");
    } finally {
      setBusyId(null);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <PageContainer>
      <PageHeader
        title="العناوين"
        subtitle="حدّد عنوان التوصيل المناسب لطلباتك من صبح"
        action={
          <Button className="rounded-full" onClick={openNew} disabled={status === "error"}>
            <Plus className="h-4 w-4" />
            إضافة عنوان
          </Button>
        }
      />

      {status === "loading" && (
        <ul className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <div role="alert" className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد لديك أي عنوان محفوظ.</p>
          <Button className="mt-4 rounded-full" onClick={openNew}>
            <Plus className="h-4 w-4" />
            أضف عنوانك الأول
          </Button>
        </div>
      )}

      {status === "success" && items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-colors",
                a.is_default ? "border-primary/40" : "border-border",
                busyId === a.id && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-foreground">{a.recipient_name}</div>
                    {a.is_default && (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Star className="h-3 w-3 fill-primary" /> افتراضي
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                <p className="num" dir="ltr">{a.phone}</p>
                <p>{a.city} — {a.region}</p>
                <p>{a.line1}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!a.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={busyId === a.id}
                    onClick={() => makeDefault(a)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    اجعله افتراضيًا
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={busyId === a.id}
                  onClick={() => openEdit(a)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive"
                  disabled={busyId === a.id}
                  onClick={() => setPendingDelete(a)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل العنوان" : "إضافة عنوان جديد"}</DialogTitle>
            <DialogDescription>أدخل تفاصيل العنوان لاستخدامه عند إتمام الشراء.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field
              id="addr-recipient"
              label="اسم المستلم"
              value={form.recipient}
              onChange={(v) => setField("recipient", v)}
              error={errors.recipient}
            />
            <Field
              id="addr-phone"
              label="رقم الجوال"
              value={form.phone}
              onChange={(v) => setField("phone", v)}
              error={errors.phone}
              dir="ltr"
              inputMode="tel"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="addr-city"
                label="المدينة"
                value={form.city}
                onChange={(v) => setField("city", v)}
                error={errors.city}
              />
              <Field
                id="addr-district"
                label="المنطقة"
                value={form.district}
                onChange={(v) => setField("district", v)}
                error={errors.district}
              />
            </div>
            <Field
              id="addr-street"
              label="الشارع والمبنى"
              value={form.street}
              onChange={(v) => setField("street", v)}
              error={errors.street}
            />

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button type="submit" className="rounded-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "حفظ التعديلات" : "إضافة العنوان"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العنوان</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف عنوان «{pendingDelete?.recipient_name}»؟ لا يمكن التراجع عن هذا
              الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  dir,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  dir?: "ltr" | "rtl";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        inputMode={inputMode}
        aria-invalid={!!error}
        className={cn("mt-1", dir === "ltr" && "num")}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
