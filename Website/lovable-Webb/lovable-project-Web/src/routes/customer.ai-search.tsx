import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  PlugZap,
  RefreshCcw,
  SearchX,
  Sparkles,
  Tag,
  TimerOff,
  WifiOff,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/customer-data";
import {
  aiProductSearch,
  getCategories,
  ApiRequestError,
  type AiSearchPagination,
  type ApiCategory,
  type ApiProduct,
  type SearchIntent,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/customer/ai-search")({
  head: () => ({
    meta: [
      { title: "البحث الذكي — صبح" },
      {
        name: "description",
        content: "اكتب ما تبحث عنه بلغتك الطبيعية ودع الذكاء الاصطناعي يجد المنتج المناسب.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AiSearchPage,
});

const PAGE_SIZE = 12;

const EXAMPLE_PROMPTS = [
  "أبغى قهوة عربية فاخرة بأقل من 100 ريال",
  "هدية لطفل عمره خمس سنوات",
  "ديكور منزلي برائحة العود بين 50 و200 ريال",
  "ساعة ذكية رياضية بسعر مناسب",
];

type SearchStatus = "idle" | "loading" | "success" | "error";

type SearchData = {
  intent: SearchIntent;
  products: ApiProduct[];
  pagination: AiSearchPagination;
};

function AiSearchPage() {
  const { q: initialQ } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [query, setQuery] = useState(initialQ ?? "");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [data, setData] = useState<SearchData | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  // Guards against out-of-order responses when the user re-submits quickly.
  const requestId = useRef(0);
  const lastQuery = useRef("");

  // Real backend call: GET /api/categories — used to resolve the intent's
  // category_slug into a display name and to offer quick prompt hints.
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        /* categories are a nice-to-have here; the page works without them */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch(q: string, page = 1, append = false) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const id = ++requestId.current;
    lastQuery.current = trimmed;

    if (append) setLoadingMore(true);
    else {
      setStatus("loading");
      setError(null);
    }

    try {
      // Real backend call: POST /api/ai/product-search
      const result = await aiProductSearch(trimmed, { page, limit: PAGE_SIZE });
      if (id !== requestId.current) return; // a newer request superseded this one
      setData((prev) =>
        append && prev ? { ...result, products: [...prev.products, ...result.products] } : result,
      );
      setStatus("success");
    } catch (err) {
      if (id !== requestId.current) return;
      const apiErr =
        err instanceof ApiRequestError
          ? err
          : new ApiRequestError("حدث خطأ غير متوقع أثناء البحث.");
      if (append) {
        toast.error(apiErr.message);
      } else {
        setError(apiErr);
        setStatus("error");
      }
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }

  // Deep-link support: /customer/ai-search?q=... runs the search on arrival.
  useEffect(() => {
    if (initialQ?.trim()) runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate({ search: { q: query.trim() || undefined }, replace: true });
    runSearch(query);
  }

  function searchExample(prompt: string) {
    setQuery(prompt);
    navigate({ search: { q: prompt }, replace: true });
    runSearch(prompt);
  }

  const showLoadMore =
    status === "success" && data !== null && data.pagination.page < data.pagination.totalPages;

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            البحث الذكي
          </span>
        }
        subtitle="اكتب ما تبحث عنه بلغتك الطبيعية — الاسم، الاستخدام، أو حتى ميزانيتك — وسيفهمك الذكاء الاصطناعي."
      />

      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          maxLength={500}
          placeholder="مثال: أبغى هدية عطرية أنيقة بأقل من 150 ريال…"
          className="min-h-16 resize-none rounded-2xl border-transparent bg-muted text-base focus-visible:border-primary/40 focus-visible:bg-background"
          aria-label="نص البحث الذكي"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="num text-xs text-muted-foreground">{query.length}/500</p>
          <Button
            type="submit"
            size="lg"
            className="h-11 rounded-full px-6 text-sm font-bold"
            disabled={status === "loading" || !query.trim()}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ البحث…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                ابحث بالذكاء الاصطناعي
              </>
            )}
          </Button>
        </div>
      </form>

      {status === "idle" && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">جرّب مثلًا:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => searchExample(p)}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {categories.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                أو ابحث داخل تصنيف:
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => searchExample(`منتجات من تصنيف ${c.name_ar}`)}
                    className="rounded-full border border-dashed border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {c.name_ar}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {status === "loading" && <LoadingState />}

      {status === "error" && error && (
        <ErrorState error={error} onRetry={() => runSearch(lastQuery.current)} />
      )}

      {status === "success" && data && (
        <ResultsState
          data={data}
          categories={categories}
          loadingMore={loadingMore}
          showLoadMore={showLoadMore}
          onLoadMore={() => runSearch(lastQuery.current, data.pagination.page + 1, true)}
          onExample={searchExample}
        />
      )}
    </PageContainer>
  );
}

/* --- Loading -------------------------------------------------------------- */

function LoadingState() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <div>
          <p className="text-sm font-bold text-foreground">الذكاء الاصطناعي يحلّل طلبك…</p>
          <p className="text-xs text-muted-foreground">
            نفهم كلماتك ونحوّلها إلى بحث دقيق في الكتالوج
            {elapsed >= 5 && <span className="num"> — {elapsed} ث</span>}
          </p>
        </div>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --- Error (including timeout) --------------------------------------------- */

function ErrorState({ error, onRetry }: { error: ApiRequestError; onRetry: () => void }) {
  const view = error.isTimeout
    ? {
        icon: TimerOff,
        tone: "text-warning bg-warning/10",
        title: "انتهت مهلة الانتظار",
        description:
          error.status === 504
            ? "تأخر مزود الذكاء الاصطناعي في الرد على الخادم. حاول مرة أخرى بعد قليل."
            : "لم يصلنا رد من الخادم خلال المهلة المحددة. تأكد من تشغيله ثم أعد المحاولة.",
        retry: true,
      }
    : error.code === "not_configured"
      ? {
          icon: PlugZap,
          tone: "text-muted-foreground bg-muted",
          title: "البحث الذكي غير مفعّل حاليًا",
          description:
            "لم يتم ضبط مفتاح الذكاء الاصطناعي في الخادم بعد (AI_API_KEY). تواصل مع فريق الباك إند لتفعيله.",
          retry: false,
        }
      : error.code === "network"
        ? {
            icon: WifiOff,
            tone: "text-destructive bg-destructive/10",
            title: "تعذّر الاتصال بالخادم",
            description: "تأكد من اتصالك بالإنترنت وأن خادم صبح يعمل، ثم أعد المحاولة.",
            retry: true,
          }
        : error.code === "validation"
          ? {
              icon: AlertTriangle,
              tone: "text-warning bg-warning/10",
              title: "نص البحث غير صالح",
              description: error.message || "يجب أن يكون نص البحث بين 1 و500 حرف.",
              retry: false,
            }
          : {
              icon: AlertTriangle,
              tone: "text-destructive bg-destructive/10",
              title: "تعذّر إتمام البحث الذكي",
              description: error.message || "حدث خطأ أثناء التواصل مع مزود الذكاء الاصطناعي.",
              retry: true,
            };

  const Icon = view.icon;

  return (
    <div
      role="alert"
      className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center"
    >
      <div className={cn("mx-auto grid h-14 w-14 place-items-center rounded-2xl", view.tone)}>
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">{view.title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        {view.description}
      </p>
      {view.retry && (
        <Button onClick={onRetry} variant="outline" className="mt-5 rounded-full font-bold">
          <RefreshCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

/* --- Success ---------------------------------------------------------------- */

function ResultsState({
  data,
  categories,
  loadingMore,
  showLoadMore,
  onLoadMore,
  onExample,
}: {
  data: SearchData;
  categories: ApiCategory[];
  loadingMore: boolean;
  showLoadMore: boolean;
  onLoadMore: () => void;
  onExample: (prompt: string) => void;
}) {
  const { intent, products, pagination } = data;

  return (
    <div className="mt-8">
      <IntentSummary intent={intent} />

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="num font-semibold text-foreground">{pagination.total}</span> نتيجة مطابقة
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyResults onExample={onExample} categories={categories} />
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id}>
                <AiProductCard
                  product={p}
                  categoryName={
                    p.category_id
                      ? categories.find((c) => c.id === p.category_id)?.name_ar
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
          {showLoadMore && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-full px-6 font-bold"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                عرض المزيد
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * How the AI understood the prompt. The backend returns a privacy-safe summary
 * (counts + flags, not the raw terms), so we surface that — plus tolerate the
 * legacy full shape (keywords/price) when present.
 */
function IntentSummary({ intent }: { intent: SearchIntent }) {
  // Prefer the summary flags; fall back to the legacy arrays if a build sends them.
  const keywordsCount =
    intent.keywords_count ?? (Array.isArray(intent.keywords) ? intent.keywords.length : 0);
  const hasPrice =
    intent.has_price_filter ?? (intent.price_min != null || intent.price_max != null);
  const hasCategory = intent.has_category_filter ?? Boolean(intent.category_slug);

  const chips: { key: string; label: string; tone: "kw" | "cat" | "price" }[] = [];
  if (keywordsCount > 0) {
    chips.push({
      key: "kw",
      label: `${keywordsCount} كلمة مفتاحية`,
      tone: "kw",
    });
  }
  if (hasCategory) chips.push({ key: "cat", label: "ضمن تصنيف محدّد", tone: "cat" });
  if (hasPrice) chips.push({ key: "price", label: "ضمن نطاق سعري", tone: "price" });

  if (chips.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <p className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        هكذا فهم الذكاء الاصطناعي طلبك
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) =>
          c.tone === "cat" ? (
            <Badge
              key={c.key}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <Tag className="h-3 w-3" />
              {c.label}
            </Badge>
          ) : (
            <Badge
              key={c.key}
              variant={c.tone === "price" ? "outline" : "secondary"}
              className="rounded-full px-3 py-1 text-xs font-semibold"
            >
              {c.label}
            </Badge>
          ),
        )}
      </div>
    </div>
  );
}

function EmptyResults({
  onExample,
  categories,
}: {
  onExample: (prompt: string) => void;
  categories: ApiCategory[];
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">فهمنا طلبك، لكن لا توجد نتائج</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        لا توجد منتجات في الكتالوج تطابق هذا الوصف حاليًا. جرّب وصفًا أعم أو تصنيفًا آخر.
      </p>
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {categories.slice(0, 5).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onExample(`منتجات من تصنيف ${c.name_ar}`)}
              className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary"
            >
              {c.name_ar}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Result card ------------------------------------------------------------ */

/** Deterministic hue from a UUID so each product gets a stable placeholder tint. */
function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function formatPrice(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return String(value);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

/**
 * Card for a REAL backend product (ApiProduct). Separate from ProductCard,
 * which renders the local mock shape (ratings, old prices, detail links that
 * only exist for mock ids).
 */
function AiProductCard({ product, categoryName }: { product: ApiProduct; categoryName?: string }) {
  const { addItem } = useCart();
  const hue = hueFromId(product.id);
  const price = Number.parseFloat(String(product.price_sar)) || 0;

  function addToCart() {
    // Map the backend product onto the cart's Product shape so the existing
    // cart/checkout flow keeps working during the session.
    const mapped: Product = {
      id: product.id,
      name: product.name_ar,
      merchant: "صبح",
      categoryId: product.category_id ?? "",
      price,
      rating: 0,
      reviews: 0,
      hue,
      description: product.description_ar ?? undefined,
    };
    addItem(mapped, 1);
    toast.success(`أُضيف «${product.name_ar}» إلى السلّة`);
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated">
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.92 0.06 ${hue}), oklch(0.82 0.09 ${hue}))`,
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/40 text-white backdrop-blur">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
        {categoryName && (
          <Badge className="absolute right-3 top-3 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
            {categoryName}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[11px] font-semibold text-primary/80">شحن وضمان من صبح</div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-foreground">
          {product.name_ar}
        </h3>
        {product.description_ar && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description_ar}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col leading-tight">
            <span className="num text-lg font-black text-foreground">
              {formatPrice(price)} <span className="text-xs font-bold">ر.س</span>
            </span>
            <span className="num text-[10px] text-muted-foreground">SKU: {product.sku}</span>
          </div>
          <Button
            size="icon"
            type="button"
            className="h-9 w-9 shrink-0 rounded-full shadow-sm"
            aria-label={`أضف ${product.name_ar} إلى السلّة`}
            onClick={addToCart}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
