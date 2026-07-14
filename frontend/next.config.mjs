/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // نقل transpile لحزمة workspace (تستخدم TS خام).
  transpilePackages: ['@sabah/shared'],
  experimental: {
    // تحميل الخطوط عبر next/font أفضل من CDN.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
