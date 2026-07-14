export interface Category {
  id: string;
  slug: string;
  name: string;
  iconUrl?: string;
  /** ترتيب العرض في الشريط الأفقي. */
  order: number;
}

export interface CategoryDetail extends Category {
  productCount: number;
  subcategories?: Category[];
}
