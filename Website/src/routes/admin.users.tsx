import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Power, RefreshCcw, Search, Users, WifiOff } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { getAdminUsers, toggleAdminUser, type AdminUser } from "@/lib/api-admin";
import { useHasPermission } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — لوحة الإدارة" }] }),
  component: UsersPage,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
}

type LoadStatus = "loading" | "success" | "error";

export function UsersPage() {
  const canManage = useHasPermission("users");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((search?: string) => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/admin/users (password hashes never leave the
    // server — the serializer strips them).
    getAdminUsers({ q: search || undefined, limit: 100 })
      .then((r) => {
        setUsers(r.users);
        setTotal(r.pagination?.total ?? r.users.length);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المستخدمين.");
        setStatus("error");
      });
  }, []);

  useEffect(() => load(), [load]);

  // Debounced server-side search.
  useEffect(() => {
    const t = setTimeout(() => load(q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function toggle(u: AdminUser) {
    setBusyId(u.id);
    try {
      const r = await toggleAdminUser(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: r.is_active } : x)));
      toast.success(r.is_active ? "تم تفعيل الحساب." : "تم تعطيل الحساب.");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر تغيير حالة الحساب.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminPage
      title="المستخدمون"
      subtitle={
        <>
          حسابات المنصة الحقيقية — <span className="num font-bold text-foreground">{total}</span>{" "}
          مستخدم.
        </>
      }
    >
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الجوال أو البريد"
          className="h-11 rounded-full pr-10"
        />
      </div>

      {status === "loading" && (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => load(q)} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && users.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد مستخدمون مطابقون.</p>
        </div>
      )}

      {status === "success" && users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-bold">المستخدم</th>
                  <th className="px-4 py-3 font-bold">الجوال</th>
                  <th className="px-4 py-3 font-bold">آخر دخول</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  {canManage && <th className="px-4 py-3 font-bold">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="num px-4 py-3 text-muted-foreground" dir="ltr">
                      {u.phone}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(u.last_login_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          u.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700",
                        )}
                      >
                        {u.is_active ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => toggle(u)}
                        >
                          {busyId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {u.is_active ? "تعطيل" : "تفعيل"}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
