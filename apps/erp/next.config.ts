import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Identidade do app para roteamento de auth
  env: {
    NEXT_PUBLIC_APP_NAME: 'erp',
    NEXT_PUBLIC_APP_URL: process.env.AUTH_URL_ERP ?? 'http://localhost:3000',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // remover unsafe em prod
              "style-src 'self' 'unsafe-inline'",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://api.anthropic.com wss://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://','')}`,
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "frame-src 'none'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  // Redirect raiz para /dashboard se autenticado
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },

  // Imagens permitidas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  // Turborepo — transpila packages internos
  transpilePackages: ['@erp-master/ui', '@erp-master/database', '@erp-master/auth', '@erp-master/mcp'],

  // Sentry
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
