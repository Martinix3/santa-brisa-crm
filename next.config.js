// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedForwardedHosts: [
        // cualquier subdominio en cloudworkstations.dev
        "*.cloudworkstations.dev",
        "localhost:3000",
      ],
      allowedOrigins: [
        "http://localhost:3000",
        "https://*.cloudworkstations.dev",
      ],
    },
  },
};

module.exports = nextConfig;
