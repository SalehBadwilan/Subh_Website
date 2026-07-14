import type { Package } from '../../types/package';

export const mockPackages: Package[] = [
  {
    id: 'pk1', slug: 'coffee-starter-bundle', name: 'باقة صباح القهوة',
    description: 'مطحنة + كوب ذكي + حبوب مختصة.',
    price: 499, compareAtPrice: 620, currency: 'SAR',
    images: [{ id: 'img3', url: 'https://picsum.photos/seed/coffee/600/600', order: 0 }],
    merchantId: 'm3', inStock: true,
  },
];
