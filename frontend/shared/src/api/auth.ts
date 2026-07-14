import { HttpClient } from './client';
import { endpoints } from './endpoints';
import type { AuthSession, User } from '../types/user';
import type { MutationOptions } from '../types/api';

export interface OtpRequestInput { phone: string; }
export interface OtpRequestOutput { attemptId: string; expiresIn: number; }
export interface OtpVerifyInput { attemptId: string; code: string; }
export interface RefreshInput { refreshToken: string; }
export interface RefreshOutput { accessToken: string; expiresAt: string; }

export const authApi = {
  requestOtp: (client: HttpClient, input: OtpRequestInput) =>
    client.post<OtpRequestOutput>(endpoints.auth.otpRequest(), input),

  verifyOtp: (client: HttpClient, input: OtpVerifyInput) =>
    client.post<AuthSession>(endpoints.auth.otpVerify(), input),

  refresh: (client: HttpClient, input: RefreshInput) =>
    client.post<RefreshOutput>(endpoints.auth.refresh(), input),

  me: (client: HttpClient) => client.get<User>(endpoints.auth.me()),

  logout: (client: HttpClient, opts?: MutationOptions) =>
    client.post<{ ok: boolean }>(endpoints.auth.logout(), undefined, opts),
};
