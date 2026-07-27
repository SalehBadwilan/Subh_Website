import { createFileRoute } from "@tanstack/react-router";
import { Bell, Megaphone, Package, Settings2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { type Notification } from "@/lib/customer-data";
import { useAppStore } from "@/lib/app-store";
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

const iconFor: Record<Notification["type"], typeof Bell> = {
  order: Package,
  promo: Megaphone,
  system: Settings2,
};

const toneFor: Record<Notification["type"], string> = {
  order: "bg-primary-soft text-primary",
  promo: "bg-amber-50 text-amber-700",
  system: "bg-muted text-foreground",
};

function NotificationsPage() {
  const { notifications: items, markAllRead } = useAppStore();
  const anyUnread = items.some((n) => n.unread);

  return (
    <PageContainer>
      <PageHeader
        title="الإشعارات"
        subtitle="تحديثات الطلبات والعروض من صبح"
        action={
          anyUnread ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-semibold text-primary hover:underline"
            >
              تعليم الكل كمقروء
            </button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد إشعارات حاليًا.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor[n.type];
            return (
              <li
                key={n.id}
                className={cn(
                  "flex gap-3 rounded-2xl border p-4 transition-colors",
                  n.unread ? "border-primary/40 bg-primary-soft/40" : "border-border bg-card",
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", toneFor[n.type])}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">{n.title}</h2>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="غير مقروء" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
