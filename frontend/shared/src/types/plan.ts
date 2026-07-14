export interface PlanFeature {
  key: string;
  label: string;
  /** قيمة الميزة: true/false، عدد، أو 'unlimited'. */
  value: boolean | number | 'unlimited';
}

export interface PlanLimits {
  maxProducts: number | 'unlimited';
  maxStaff: number | 'unlimited';
  /** نسبة العمولة %. */
  commissionRate: number;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** سعر الباقة الشهري بالـ SAR. */
  priceMonthly: number;
  currency: 'SAR';
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular?: boolean;
}
