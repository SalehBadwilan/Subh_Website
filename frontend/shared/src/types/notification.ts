export type NotificationType =
  | 'order'
  | 'payment'
  | 'shipping'
  | 'merchant'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  at: string;
}
