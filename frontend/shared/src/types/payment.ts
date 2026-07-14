export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentIntent {
  intentId: string;
  clientSecret: string;
  amount: number;
  currency: 'SAR';
}
