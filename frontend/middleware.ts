import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * حارس المسارات — يعيد توجيه غير المسجّلين من الصفحات المحمية إلى /login.
 * يعتمد على وجود كوكي الجلسة `sabah_session` (يُضبط عبر /api/session بعد OTP).
 */

const SESSION_COOKIE = 'sabah_session';

export function middleware(req: NextRequest) {
  const isAuthed = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (isAuthed) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(loginUrl);
}

/**
 * المسارات المحمية فقط. لا نمرر أصولاً ثابتة أو مسارات API.
 * (صفحات account/addresses تُضاف هنا عند بنائها في أيام لاحقة.)
 */
export const config = {
  matcher: ['/cart/:path*', '/checkout/:path*', '/orders/:path*'],
};
