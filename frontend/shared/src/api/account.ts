import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { User } from '../types/user';
import type { Notification } from '../types/notification';
import type { Paginated, MutationOptions } from '../types/api';

export interface UpdateAccountInput { name?: string; email?: string; avatarUrl?: string; }
export interface SupportTicketInput { subject: string; message: string; orderId?: string; }

export const accountApi = {
  get: (client: HttpClient) => client.get<User>(endpoints.account.get()),
  update: (client: HttpClient, input: UpdateAccountInput, opts?: MutationOptions) =>
    client.put<User>(endpoints.account.update(), input, opts),
};

export const notificationsApi = {
  list: (client: HttpClient, page = 1, pageSize = 20) =>
    client.get<Paginated<Notification>>(endpoints.notifications.list(), { page, pageSize }),
};

export const supportApi = {
  createTicket: (client: HttpClient, input: SupportTicketInput, opts?: MutationOptions) =>
    client.post<{ ticketId: string }>(endpoints.support.createTicket(), input, opts),
};
