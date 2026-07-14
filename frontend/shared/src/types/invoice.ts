import type { Order } from './order';

export interface Invoice {
  id: string;
  orderId: string;
  /** الرقم الظاهر: INV-2026-000123 */
  number: string;
  order: Order;
  /** رابط PDF مُولّد خادمياً. */
  pdfUrl?: string;
  issuedAt: string;
}
