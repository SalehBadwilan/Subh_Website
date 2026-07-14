import type { Address } from '../../types/address';

export const mockAddresses: Address[] = [
  {
    id: 'a1', label: 'المنزل', recipientName: 'عميل تجريبي', phone: '+966500000001',
    city: 'الرياض', district: 'النرجس', street: 'شارع التفاح', building: '12', isDefault: true,
  },
  {
    id: 'a2', label: 'العمل', recipientName: 'عميل تجريبي', phone: '+966500000001',
    city: 'الرياض', district: 'العليا', street: 'طريق الملك فهد', building: '45', isDefault: false,
  },
];
