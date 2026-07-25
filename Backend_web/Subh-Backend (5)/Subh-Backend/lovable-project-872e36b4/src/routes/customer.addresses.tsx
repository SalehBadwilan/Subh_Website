import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { type Address } from "@/lib/customer-data";
import { useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/lib/auth";
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

type FormState = {
  label: string;
  recipient: string;
  phone: string;
  city: string;
  district: string;
  street: string;
};

const emptyForm: FormState = {
  label: "",
  recipient: "",
  phone: "",
  city: "",
  district: "",
  street: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.label.trim()) errors.label = "التسمية مطلوبة.";
  if (!form.recipient.trim()) errors.recipient = "اسم المستلم مطلوب.";
  if (!form.phone.trim()) errors.phone = "رقم الجوال مطلوب.";
  else if (!/^\+?\d{9,15}$/.test(form.phone.replace(/\s+/g, "")))
    errors.phone = "رقم الجوال غير صحيح.";
  if (!form.city.trim()) errors.city = "المدينة مطلوبة.";
  if (!form.district.trim()) errors.district = "الحي مطلوب.";
  if (!form.street.trim()) errors.street = "الشارع مطلوب.";
  return errors;
}

function AddressesPage() {
  const ready = useRequireAuth();
  const {
    addresses: items,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  } = useAppStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  if (!ready) return null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(a: Address) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      city: a.city,
      district: a.district,
      street: a.street,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    if (editingId) {
      updateAddress(editingId, form);
      toast.success("تم تحديث العنوان.");
    } else {
      addAddress(form);
      toast.success("تمت إضافة العنوان.");
    }
    setDialogOpen(false);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    removeAddress(pendingDelete.id);
    toast.success("تم حذف العنوان.");
    setPendingDelete(null);
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
          <Button className="rounded-full" onClick={openNew}>
            <Plus className="h-4 w-4" />
            إضافة عنوان
          </Button>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد لديك أي عنوان محفوظ.</p>
          <Button className="mt-4 rounded-full" onClick={openNew}>
            <Plus className="h-4 w-4" />
            أضف عنوانك الأول
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-colors",
                a.isDefault ? "border-primary/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-foreground">{a.label}</div>
                    {a.isDefault && (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Star className="h-3 w-3 fill-primary" /> افتراضي
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                <p className="text-foreground">{a.recipient}</p>
                <p className="num" dir="ltr">{a.phone}</p>
                <p>{a.city} — {a.district}</p>
                <p>{a.street}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!a.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setDefaultAddress(a.id);
                      toast.success("تم تعيين العنوان كافتراضي.");
                    }}
                  >
                    <Star className="h-3.5 w-3.5" />
                    اجعله افتراضيًا
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => openEdit(a)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive"
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
            <DialogTitle>
              {editingId ? "تعديل العنوان" : "إضافة عنوان جديد"}
            </DialogTitle>
            <DialogDescription>
              أدخل تفاصيل العنوان لاستخدامه عند إتمام الشراء.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field
              id="addr-label"
              label="التسمية (المنزل، العمل…)"
              value={form.label}
              onChange={(v) => setField("label", v)}
              error={errors.label}
            />
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
                label="الحي"
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
              >
                إلغاء
              </Button>
              <Button type="submit" className="rounded-full">
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
              هل أنت متأكد من حذف عنوان «{pendingDelete?.label}»؟ لا يمكن التراجع
              عن هذا الإجراء.
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
