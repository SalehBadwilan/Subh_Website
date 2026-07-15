import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { ProductCard } from "@/components/customer/ProductCard";
import { allProducts, categories } from "@/lib/customer-data";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/customer/search")({
  head: () => ({
    meta: [
      { title: "البحث — صبح" },
      { name: "description", content: "ابحث في منتجات صبح حسب الاسم أو الفئة." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: SearchPage,
});

const SEARCH_DEBOUNCE_MS = 300;

function SearchPage() {
  const { q: initialQ = "", cat: initialCat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [activeCat, setActiveCat] = useState<string | undefined>(initialCat);

  // Live search: debounce the query so results update automatically while
  // typing without hammering the URL or re-renders on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      navigate({
        search: { q: q || undefined, cat: activeCat },
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, activeCat, navigate]);

  const results = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (activeCat && p.categoryId !== activeCat) return false;
      if (!needle) return true;
      return p.name.toLowerCase().includes(needle);
    });
  }, [debouncedQ, activeCat]);

  function toggleCat(id: string) {
    setActiveCat((prev) => (prev === id ? undefined : id));
  }

  function clearAll() {
    setQ("");
    setDebouncedQ("");
    setActiveCat(undefined);
    navigate({ search: {}, replace: true });
  }

  return (
    <PageContainer>
      <PageHeader
        title="البحث في صبح"
        subtitle="ابحث بين آلاف المنتجات المتوفّرة على المنصة"
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج…"
          className="h-12 rounded-full border-border bg-card pr-10 pl-10 text-base"
          aria-label="بحث"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="مسح البحث"
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                activeCat === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="num font-semibold text-foreground">{results.length}</span>{" "}
          نتيجة
        </p>
        {(activeCat || q) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-primary hover:underline"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState q={debouncedQ} />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <SearchIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">لا توجد نتائج</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        لم نعثر على منتجات تطابق «{q || "بحثك"}». جرّب كلمات أخرى أو تصفّح الفئات.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {categories.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            to="/customer/category/$id"
            params={{ id: c.id }}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:border-primary/40"
          >
            <Badge variant="secondary" className="border-0 bg-transparent p-0 text-xs font-semibold">
              {c.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
