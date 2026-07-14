import { getDb } from '../db';
import type { Product, ProductDetail, ProductFilters } from '../../types/product';
import type { Category, CategoryDetail } from '../../types/category';
import type { Paginated, ApiResult } from '../../types/api';

export interface MockProductsHandler {
  list(filters: ProductFilters): Promise<ApiResult<Paginated<Product>>>;
  detail(slug: string): Promise<ApiResult<ProductDetail>>;
  categories(): Promise<ApiResult<Category[]>>;
  categoryDetail(slug: string): Promise<ApiResult<CategoryDetail>>;
}

export function createMockProductsHandler(): MockProductsHandler {
  return {
    async list(filters) {
      const db = getDb();
      let items = [...db.products];

      if (filters.q) {
        const q = filters.q.toLowerCase();
        items = items.filter(
          (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
        );
      }
      if (filters.category) {
        const cat = db.categories.find((c) => c.slug === filters.category);
        if (cat) items = items.filter((p) => p.categoryId === cat.id);
      }
      if (filters.inStock !== undefined) {
        items = items.filter((p) => p.inStock === filters.inStock);
      }
      if (filters.priceMin !== undefined) items = items.filter((p) => p.price >= filters.priceMin!);
      if (filters.priceMax !== undefined) items = items.filter((p) => p.price <= filters.priceMax!);

      switch (filters.sort) {
        case 'price_asc': items.sort((a, b) => a.price - b.price); break;
        case 'price_desc': items.sort((a, b) => b.price - a.price); break;
        case 'popular': items.sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0)); break;
        default: items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      }

      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);

      return {
        data: { items: paged, page, pageSize, total: items.length, hasMore: start + pageSize < items.length },
      };
    },

    async detail(slug) {
      const db = getDb();
      const product = db.products.find((p) => p.slug === slug);
      if (!product) throw { code: 'PRODUCT_NOT_FOUND', message: 'المنتج غير موجود.' };
      const merchant = db.merchants.find((m) => m.id === product.merchantId);
      const stock = db.stock.get(product.id) ?? 0;
      const detail: ProductDetail = {
        ...product,
        merchant: { id: merchant?.id ?? '', name: merchant?.name ?? product.merchantName },
        shippingEstimate: { min: 1, max: 4 },
        stock,
        bundleComponents: product.isBundle
          ? [{ productId: 'pr1', name: 'كوب صبح الذكي', quantity: 1 }]
          : undefined,
      };
      return { data: detail };
    },

    async categories() {
      const db = getDb();
      return { data: [...db.categories].sort((a, b) => a.order - b.order) };
    },

    async categoryDetail(slug) {
      const db = getDb();
      const cat = db.categories.find((c) => c.slug === slug);
      if (!cat) throw { code: 'NOT_FOUND', message: 'التصنيف غير موجود.' };
      const productCount = db.products.filter((p) => p.categoryId === cat.id).length;
      return { data: { ...cat, productCount } };
    },
  };
}
