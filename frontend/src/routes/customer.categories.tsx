import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { categories, getProductsByCategory } from "@/lib/customer-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/categories")({
  head: () => ({
    meta: [
      { title: "الفئات — صبح" },
      {
        name: "description",
        content: "تصفّح كل فئات صبح واختر ما يناسبك.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="جميع الفئات"
        subtitle="اختر فئة لاستعراض منتجاتها على صبح"
      />

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const count = getProductsByCategory(cat.id).length;
          return (
            <li key={cat.id}>
              <Link
                to="/customer/category/$id"
                params={{ id: cat.id }}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                    cat.tone,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground">{cat.name}</h2>
                  {cat.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>
                    <span className="num">{count}</span> منتج
                  </span>
                  <ChevronLeft className="h-4 w-4" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
