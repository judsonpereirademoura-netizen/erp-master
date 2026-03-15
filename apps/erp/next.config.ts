import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'erp',
    NEXT_PUBLIC_APP_URL: process.env.AUTH_URL_ERP ?? 'http://localhost:3000',
  },
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }]
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' }],
  },
}

export default nextConfig