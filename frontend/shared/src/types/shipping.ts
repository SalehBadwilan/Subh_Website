export type ShippingMethod =
  | 'standard'
  | 'express'
  | 'courier'
  | 'pickup';

export interface ShippingOption {
  method: ShippingMethod;
  label: string;
  cost: number;
  /** تقدير بالأيام. */
  eta: { min: number; max: number };
  currency: 'SAR';
}
