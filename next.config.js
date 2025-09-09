/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Permite el proxy de Firebase Studio / Cloud Workstations en desarrollo
    allowedDevOrigins: [process.env.NEXT_PUBLIC_DEV_ORIGIN].filter(Boolean)
  },
};

module.exports = nextConfig;
