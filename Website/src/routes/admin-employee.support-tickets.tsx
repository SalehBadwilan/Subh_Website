import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  getOperationsSupportTickets,
  updateOperationsSupportTicketStatus,
  type ApiSupportTicket,
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

import { AdminEmployeePage } from "@/components/admin-employee/AdminEmployeeShell";

import { ClipboardList } from "lucide-react";
const statusLabels = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const statusColors = {
  open: "bg-sky-50 text-sky-700 border-sky-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-700 border-gray-300",
};

export const Route = createFileRoute("/admin-employee/support-tickets")({
  head: () => ({
    meta: [{ title: "تذاكر الدعم — لوحة الإدارة" }, { name: "robots", content: "noindex" }],
  }),
  component: OperationsSupportTicketsPage,
});

function OperationsSupportTicketsPage() {
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<ApiSupportTicket | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ApiSupportTicket["status"]>("open");

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getOperationsSupportTickets();
        setTickets(data);
      } catch (err) {
        console.error(err);
        toast.error("تعذر تحميل تذاكر الدعم");
      }
    }

    loadTickets();
  }, []);

  if (tickets.length === 0) {
    return (
      <AdminEmployeePage title="تذاكر الدعم" subtitle="إدارة استفسارات العملاء.">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold">لا توجد تذاكر حالياً</h3>
          <p className="text-sm text-muted-foreground">ستظهر تذاكر العملاء هنا.</p>
        </div>
      </AdminEmployeePage>
    );
  }

  return (
    <AdminEmployeePage title="تذاكر الدعم" subtitle="إدارة استفسارات العملاء.">
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() => {
              setActiveTicket(ticket);
              setSelectedStatus(ticket.status);
            }}
            className="block w-full rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <h3 className="font-bold text-lg">{ticket.subject_ar}</h3>

            <p className="mt-2 text-sm text-muted-foreground">{ticket.message_ar}</p>

            <div className="mt-3 flex justify-between text-sm">
              <span>👤 {ticket.User?.full_name}</span>

              <span>📞 {ticket.User?.phone}</span>
            </div>

            <div className="mt-3 flex justify-between">
              <span className="font-semibold">{ticket.category}</span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  statusColors[ticket.status]
                }`}
              >
                {statusLabels[ticket.status]}
              </span>
            </div>
          </button>
        ))}
      </div>
      <Dialog open={!!activeTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <DialogContent className="max-w-lg">
          {activeTicket && (
            <>
              <DialogHeader>
                <DialogTitle>{activeTicket.subject_ar}</DialogTitle>

                <DialogDescription>
                  {activeTicket.User?.full_name} • {activeTicket.User?.phone}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">الرسالة</p>

                  <div className="rounded-xl border p-3">{activeTicket.message_ar}</div>
                </div>

                <div className="flex justify-between">
                  <span>التصنيف</span>

                  <span className="font-semibold">{activeTicket.category}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-semibold">الحالة</span>

                  <Select
                    value={selectedStatus}
                    onValueChange={(value) =>
                      setSelectedStatus(value as ApiSupportTicket["status"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="open">مفتوحة</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="resolved">تم الحل</SelectItem>
                      <SelectItem value="closed">مغلقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeTicket.Order && (
                  <div className="flex justify-between">
                    <span>رقم الطلب</span>

                    <span className="font-semibold">{activeTicket.Order.number}</span>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              onClick={async () => {
                if (!activeTicket) return;

                try {
                  await updateOperationsSupportTicketStatus(activeTicket.id, selectedStatus);

                  setTickets((prev) =>
                    prev.map((ticket) =>
                      ticket.id === activeTicket.id
                        ? { ...ticket, status: selectedStatus }
                        : ticket,
                    ),
                  );

                  setActiveTicket(null);

                  toast.success("تم تحديث الحالة");
                } catch (err) {
                  console.error(err);
                  toast.error("فشل تحديث الحالة");
                }
              }}
            >
              حفظ
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminEmployeePage>
  );
}
