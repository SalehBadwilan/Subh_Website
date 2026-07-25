import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { ProductCard } from "@/components/customer/ProductCard";
import { getCategory, getProductsByCategory, type Product } from "@/lib/customer-data";

export const Route = createFileRoute("/customer/category/$id")({
  loader: ({ params }) => {
    const category = getCategory(params.id);
    if (!category) throw notFound();
    return { category, products: getProductsByCategory(params.id) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.category.name} — صبح` },
          {
            name: "description",
            content: `تسوّق ${loaderData.category.name} على صبح.`,
          },
        ]
      : [{ title: "الفئة — صبح" }, { name: "robots", content: "noindex" }],
  }),
  component: CategoryPage,
  notFoundComponent: CategoryNotFound,
});

function CategoryPage() {
  const { category, products } = Route.useLoaderData();
  return (
    <PageContainer>
      <Link
        to="/customer/categories"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        كل الفئات
      </Link>
      <PageHeader
        title={category.name}
        subtitle={category.description ?? `منتجات ${category.name} على صبح`}
      />

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد منتجات في هذه الفئة حاليًا.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p: Product) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function CategoryNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="الفئة غير موجودة"
        subtitle="تحقّق من الرابط أو تصفّح كل الفئات."
      />
      <Link
        to="/customer/categories"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الفئات
      </Link>
    </PageContainer>
  );
}
