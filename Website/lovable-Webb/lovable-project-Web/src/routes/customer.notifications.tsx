import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Megaphone, Package, RefreshCcw, Settings2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { getUser, useRequireAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import {
  getNotifications,
  markAllNotificationsRead,
  type ApiNotification,
} from "@/lib/api-customer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات — صبح" },
      { name: "description", content: "آخر تحديثات طلباتك وعروض صبح." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

/** Pick an icon from the notification channel (backend has no "type" field). */
function iconFor(n: ApiNotification): typeof Bell {
  if (n.channel === "push" || n.channel === "sms") return Package;
  if (n.channel === "email") return Megaphone;
  return Settings2;
}

function toneFor(n: ApiNotification): string {
  if (n.channel === "push" || n.channel === "sms") return "bg-primary-soft text-primary";
  if (n.channel === "email") return "bg-amber-50 text-amber-700";
  return "bg-muted text-foreground";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type LoadStatus = "loading" | "success" | "error";

function NotificationsPage() {
  const ready = useRequireAuth();
  const userId = getUser()?.id ?? null;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/notifications?user_id=
    getNotifications(userId)
      .then((rows) => {
        setItems(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الإشعارات.");
        setStatus("error");
      });
  }, [userId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  const anyUnread = items.some((n) => !n.is_read);

  async function markAllRead() {
    if (!anyUnread) return;
    setMarkingAll(true);
    try {
      // Real bulk endpoint: POST /api/notifications/read-all (JWT-scoped).
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      toast.error("تعذّر تعليم الإشعارات كمقروءة.");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="الإشعارات"
        subtitle="تحديثات الطلبات والعروض من صبح"
        action={
          status === "success" && anyUnread ? (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {markingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              تعليم الكل كمقروء
            </button>
          ) : undefined
        }
      />

      {status === "loading" && (
        <ul className="space-y-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
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
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد إشعارات حاليًا.</p>
        </div>
      )}

      {status === "success" && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor(n);
            const unread = !n.is_read;
            return (
              <li
                key={n.id}
                className={cn(
                  "flex gap-3 rounded-2xl border p-4 transition-colors",
                  unread ? "border-primary/40 bg-primary-soft/40" : "border-border bg-card",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    toneFor(n),
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">{n.title_ar}</h2>
                    {unread && (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-label="غير مقروء" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body_ar}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatTime(n.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
