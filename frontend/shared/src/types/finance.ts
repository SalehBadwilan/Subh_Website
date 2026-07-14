export type TransactionType = 'sale' | 'commission' | 'payout' | 'refund' | 'adjustment';

export interface Transaction {
  id: string;
  merchantId: string;
  type: TransactionType;
  amount: number;
  currency: 'SAR';
  orderId?: string;
  note?: string;
  at: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  commission: number;
  net: number;
  status: 'pending' | 'paid';
  paidAt?: string;
}

export interface MerchantFinance {
  available: number;
  reserved: number;
  consumed: number;
  dues: number;
  currency: 'SAR';
}
