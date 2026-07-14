export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}
