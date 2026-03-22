/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Transpile workspace packages so Next.js can compile their TypeScript source
  transpilePackages: ['@pathos/core', '@pathos/adapters', '@pathos/ui'],
};

export default nextConfig;
