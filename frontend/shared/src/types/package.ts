/** بكج/حزمة منتجات — ليس نفس `Plan` (باقة اشتراك التاجر). */
export interface Package {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: 'SAR';
  images: { id: string; url: string; order: number }[];
  merchantId: string;
  inStock: boolean;
}

export interface PackageComponent {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type PackageDetail = Package & {
  components: PackageComponent[];
  /** سعر المكونات منفردة — لإظهار قيمة التوفير. */
  componentsTotal: number;
};
