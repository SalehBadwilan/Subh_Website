import { endpoints } from './endpoints';
import type { MutationOptions } from '../types/api';

export interface UploadResult { url: string; }

export const uploadsApi = {
  /**
   * رفع ملف (multipart). HttpClient العادي يرسل JSON — هنا نستخدم fetch مباشرة.
   * التحقق من النوع/الحجم يتم في الواجهة قبل الرفع.
   * client غير مستخدم هنا لكنه يبقى في التوقيع لتوحيد نمط الـ api.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  upload: async (
    _client: unknown,
    file: File | Blob,
    fileName?: string,
    opts?: MutationOptions,
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    // نستخدم fetch مباشرة لأن HttpClient يضبط Content-Type: application/json.
    const res = await fetch(`${endpoints.uploads.create()}`, {
      method: 'POST',
      body: formData,
      headers: opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined,
    });
    if (!res.ok) throw new Error('UPLOAD_FAILED');
    return (await res.json()) as UploadResult;
  },
};
