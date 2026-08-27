/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/training/launch': ['./kaggle-scripts/train_novaia.py'],
    },
  },
};

module.exports = nextConfig;