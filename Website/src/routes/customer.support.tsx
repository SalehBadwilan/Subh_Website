import { createFileRoute } from "@tanstack/react-router";
import { HeadphonesIcon, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createCustomerSupportTicket } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";

export const Route = createFileRoute("/customer/support")({
  head: () => ({
    meta: [
      { title: "الدعم — صبح" },
      { name: "description", content: "تواصل مع فريق دعم صبح." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

const faqs: { q: string; a: string }[] = [
  { q: "كم يستغرق التوصيل؟", a: "شحن صبح القياسي يصل خلال ٢ إلى ٥ أيام عمل لجميع مدن المملكة." },
  {
    q: "هل يمكنني إرجاع منتج؟",
    a: "نعم، يمكنك إرجاع أي منتج خلال ١٤ يومًا من الاستلام مع ضمان صبح.",
  },
  { q: "كيف أتتبّع طلبي؟", a: "من صفحة «طلباتي» تجد حالة كل طلب وتحديثاته." },
  {
    q: "ما طرق الدفع المتاحة؟",
    a: "بطاقات الائتمان، مدى، المحافظ الإلكترونية، والدفع عند الاستلام.",
  },
];

function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) return;

    try {
      await createCustomerSupportTicket({
        subject_ar: subject,
        message_ar: message,
        category: "general",
      });

      toast.success("تم إرسال التذكرة بنجاح");

      setSent(true);
      setSubject("");
      setMessage("");

      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
      toast.error("تعذر إرسال التذكرة");
    }
  }

  return (
    <PageContainer>
      <PageHeader title="الدعم" subtitle="فريق صبح جاهز لمساعدتك على مدار الساعة" />

      <div className="grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={<Phone className="h-5 w-5" />}
          label="اتصل بنا"
          value="+966 56 002 4444"
          href="tel:+966920000000"
        />
        <ContactCard
          icon={<Mail className="h-5 w-5" />}
          label="البريد"
          value="care@subh.sa"
          href="mailto:care@subh.sa"
        />
        <ContactCard
          icon={<MessageCircle className="h-5 w-5" />}
          label="واتساب"
          value="+966 56 002 4444"
          href="https://wa.me/966550000000"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <HeadphonesIcon className="h-4 w-4" />
            </span>
            أرسل رسالة إلى الدعم
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="subject">الموضوع</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: استفسار عن طلب"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="message">الرسالة</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل استفسارك…"
                rows={5}
                className="mt-1.5"
              />
            </div>
            <Button
              type="submit"
              className="rounded-full"
              disabled={!subject.trim() || !message.trim()}
            >
              <Send className="h-4 w-4" />
              إرسال
            </Button>
            {sent && (
              <p className="text-xs font-semibold text-primary">
                تم استلام رسالتك، سيتواصل معك فريق صبح قريبًا.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold text-foreground">أسئلة شائعة</h2>
          <ul className="divide-y divide-border">
            {faqs.map((f, i) => (
              <li key={i} className="py-3">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-foreground">
                    {f.q}
                    <span className="text-primary transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:shadow-soft"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="num truncate text-sm font-bold text-foreground" dir="ltr">
          {value}
        </div>
      </div>
    </a>
  );
}
