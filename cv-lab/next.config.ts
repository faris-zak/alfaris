import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '128kb',
    },
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
