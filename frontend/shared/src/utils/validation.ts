import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants/config';
import { isValidSaudiPhone, normalizeSaudiPhone } from './phone';

/** مخطط رقم الجوال السعودي — يتحقق ويُطبّع. */
export const saudiPhoneSchema = z
  .string()
  .min(1, 'رقم الجوال مطلوب')
  .refine(isValidSaudiPhone, 'رقم الجوال غير صحيح. مثال: 05xxxxxxxx')
  .transform((v) => normalizeSaudiPhone(v) ?? v);

/** مخطط OTP من 4 أرقام. */
export const otpSchema = z
  .string()
  .length(VALIDATION_LIMITS.otpLength, `رمز التحقق يجب أن يكون ${VALIDATION_LIMITS.otpLength} أرقام`)
  .regex(/^\d+$/, 'رمز التحقق يجب أن يكون أرقاماً فقط');

/** مخطط العنوان. */
export const addressSchema = z.object({
  label: z.string().min(1, 'اسم العنوان مطلوب'),
  recipientName: z.string().min(2, 'اسم المستلم مطلوب'),
  phone: saudiPhoneSchema,
  city: z.string().min(2, 'المدينة مطلوبة'),
  district: z.string().min(2, 'الحي مطلوب'),
  street: z.string().min(2, 'الشارع مطلوب'),
  building: z.string().min(1, 'رقم المبنى مطلوب'),
  isDefault: z.boolean().optional().default(false),
});

/** مخطط كمية السلة. */
export const quantitySchema = z
  .number()
  .int('الكمية يجب أن تكون عدداً صحيحاً')
  .min(1, 'الكمية يجب أن تكون 1 على الأقل')
  .max(VALIDATION_LIMITS.cartMaxQuantityPerItem, `الحد الأقصى ${VALIDATION_LIMITS.cartMaxQuantityPerItem}`);

/** مخطط تذكرة الدعم. */
export const supportTicketSchema = z.object({
  subject: z.string().min(3, 'الموضوع مطلوب'),
  message: z.string().min(10, 'الرسالة قصيرة جداً'),
  orderId: z.string().optional(),
});
