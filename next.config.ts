
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'santabrisa.com',
        port: '',
        pathname: '/cdn/shop/files/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // These modules are server-side only and should not be included in the client-side bundle.
      // Resolving them to 'false' prevents webpack from trying to bundle them.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
