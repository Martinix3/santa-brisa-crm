/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', // Allow any path on this hostname
      },
    ],
  },
  webpack: (config, {isServer}) => {
    // This is required to make certain server-side libraries work in Next.js.
    // It prevents client-side modules from being bundled into the server-side code.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    
    // This rule is to handle the 'handlebars' library issue which uses an outdated Node.js feature.
    config.module.rules.push({
      test: /handlebars\/dist\/cjs\/handlebars\.js$/,
      loader: 'null-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;
