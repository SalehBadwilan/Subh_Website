import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { Product, ProductDetail, ProductFilters } from '../types/product';
import type { Category, CategoryDetail } from '../types/category';
import type { Paginated } from '../types/api';

export const productsApi = {
  list: (client: HttpClient, filters: ProductFilters = {}) =>
    client.get<Paginated<Product>>(endpoints.products.list(), {
      q: filters.q,
      category: filters.category,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      inStock: filters.inStock,
      sort: filters.sort,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    }),

  detail: (client: HttpClient, slug: string) =>
    client.get<ProductDetail>(endpoints.products.detail(slug)),

  categories: (client: HttpClient) =>
    client.get<Category[]>(endpoints.categories.list()),

  categoryDetail: (client: HttpClient, slug: string) =>
    client.get<CategoryDetail>(endpoints.categories.detail(slug)),
};
