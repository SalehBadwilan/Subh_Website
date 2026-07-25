import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Power, Users } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Employee } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/employees")({
  head: () => ({ meta: [{ title: "الموظفون — صبح تاجر" }] }),
  component: EmployeesPage,
});

type Draft = Omit<Employee, "id"> & { id?: string };

function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, toggleEmployeeActive } =
    useMerchantStore();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing({ name: "", role: "", email: "", phone: "", active: true });
    setOpen(true);
  }
  function openEdit(e: Employee) {
    setEditing({ ...e });
    setOpen(true);
  }
  function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.role.trim()) {
      toast.error("يرجى تعبئة الاسم والمسمى الوظيفي.");
      return;
    }
    if (editing.id) {
      updateEmployee(editing.id, {
        name: editing.name,
        role: editing.role,
        email: editing.email,
        phone: editing.phone,
        active: editing.active,
      });
      toast.success("تم حفظ التعديلات.");
    } else {
      addEmployee({
        name: editing.name,
        role: editing.role,
        email: editing.email,
        phone: editing.phone,
        active: editing.active,
      });
      toast.success("تمت إضافة الموظف.");
    }
    setOpen(false);
    setEditing(null);
  }

  return (
    <MerchantPage
      title="الموظفون"
      subtitle="أدر فريق عمل متجرك وصلاحياتهم."
      action={
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          إضافة موظف
        </Button>
      }
    >
      {employees.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا يوجد موظفون حتى الآن.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ابدأ ببناء فريقك بإضافة أول موظف.
          </p>
          <div className="mt-5">
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              إضافة موظف
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr,180px,1fr,120px,180px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
            <span>الاسم</span>
            <span>المسمى</span>
            <span>التواصل</span>
            <span>الحالة</span>
            <span className="text-left">إجراءات</span>
          </div>
          {employees.map((e) => (
            <div
              key={e.id}
              className="grid gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr,180px,1fr,120px,180px] md:items-center"
            >
              <div>
                <p className="text-sm font-bold text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground md:hidden">{e.role}</p>
              </div>
              <span className="hidden text-sm text-muted-foreground md:block">{e.role}</span>
              <div className="text-xs text-muted-foreground">
                <p dir="ltr">{e.email}</p>
                <p dir="ltr" className="num">
                  {e.phone}
                </p>
              </div>
              <span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    e.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {e.active ? "نشط" : "معطّل"}
                </span>
              </span>
              <div className="flex gap-2 md:justify-end">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    toggleEmployeeActive(e.id);
                    toast.success("تم تحديث حالة الموظف.");
                  }}
                >
                  <Power className="h-3.5 w-3.5" />
                  {e.active ? "تعطيل" : "تفعيل"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل موظف" : "إضافة موظف"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-name">الاسم</Label>
                <Input
                  id="emp-name"
                  value={editing.name}
                  onChange={(ev) => setEditing({ ...editing, name: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-role">المسمى الوظيفي</Label>
                <Input
                  id="emp-role"
                  value={editing.role}
                  onChange={(ev) => setEditing({ ...editing, role: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-email">البريد الإلكتروني</Label>
                <Input
                  id="emp-email"
                  type="email"
                  dir="ltr"
                  value={editing.email}
                  onChange={(ev) => setEditing({ ...editing, email: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-phone">رقم الجوال</Label>
                <Input
                  id="emp-phone"
                  dir="ltr"
                  className="num"
                  value={editing.phone}
                  onChange={(ev) => setEditing({ ...editing, phone: ev.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantPage>
  );
}
