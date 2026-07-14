export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  /** ترتيب العرض في المعرض. */
  order: number;
}

export interface ProductVariant {
  id: string;
  /** مثال: «أحمر / كبير». */
  label: string;
  sku: string;
  priceDelta: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** السعر الأساسي بالريال السعودي (قد تُعدّله الخصومات/الـ variants). */
  price: number;
  /** سعر ما قبل الخصم إن وُجد. */
  compareAtPrice?: number;
  currency: 'SAR';
  images: ProductImage[];
  categoryId: string;
  merchantId: string;
  merchantName: string;
  /** هل هو بكج/حزمة؟ إن نعم، انظر bundleComponents في ProductDetail. */
  isBundle: boolean;
  variants: ProductVariant[];
  /** متوسط تقييم 0–5. */
  rating?: number;
  ratingsCount?: number;
  inStock: boolean;
  createdAt: string;
}

export interface ProductDetail extends Product {
  merchant: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  /** تقدير الشحن بالأيام. */
  shippingEstimate: { min: number; max: number };
  stock: number;
  /** مكوّنات البكج إن كان isBundle=true. */
  bundleComponents?: { productId: string; name: string; quantity: number }[];
}

export interface ProductFilters {
  q?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  pageSize?: number;
}
