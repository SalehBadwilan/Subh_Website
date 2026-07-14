export type MerchantStatus = 'pending' | 'active' | 'suspended';

export interface Merchant {
  id: string;
  name: string;
  logoUrl?: string;
  status: MerchantStatus;
  /** رقم السجل التجاري. */
  crNumber: string;
  city: string;
  planId?: string;
  createdAt: string;
}

export interface MerchantOnboardingInput {
  facility: { name: string; crNumber: string; city: string };
  account: { iban: string };
  contact: { name: string; phone: string; email: string };
}
