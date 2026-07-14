import type { Plan } from '../../types/plan';

export const mockPlans: Plan[] = [
  {
    id: 'p1',
    slug: 'starter',
    name: 'الباقة البداية',
    description: 'للتجار الجدد — إطلاق سريع.',
    priceMonthly: 0,
    currency: 'SAR',
    isPopular: false,
    features: [
      { key: 'products', label: 'عدد المنتجات', value: 50 },
      { key: 'staff', label: 'موظفون', value: 1 },
      { key: 'reports', label: 'تقارير', value: false },
    ],
    limits: { maxProducts: 50, maxStaff: 1, commissionRate: 10 },
  },
  {
    id: 'p2',
    slug: 'growth',
    name: 'باقة النمو',
    description: 'للتجار المتنامين — أدوات أوسع.',
    priceMonthly: 199,
    currency: 'SAR',
    isPopular: true,
    features: [
      { key: 'products', label: 'عدد المنتجات', value: 500 },
      { key: 'staff', label: 'موظفون', value: 5 },
      { key: 'reports', label: 'تقارير متقدمة', value: true },
    ],
    limits: { maxProducts: 500, maxStaff: 5, commissionRate: 8 },
  },
  {
    id: 'p3',
    slug: 'enterprise',
    name: 'الباقة الاحترافية',
    description: 'للتجار الكبار — بدون حدود.',
    priceMonthly: 599,
    currency: 'SAR',
    isPopular: false,
    features: [
      { key: 'products', label: 'عدد المنتجات', value: 'unlimited' },
      { key: 'staff', label: 'موظفون', value: 'unlimited' },
      { key: 'reports', label: 'تقارير + تصدير', value: true },
    ],
    limits: { maxProducts: 'unlimited', maxStaff: 'unlimited', commissionRate: 6 },
  },
];
