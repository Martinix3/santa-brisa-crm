/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite el proxy de Firebase Studio / Cloud Workstations en desarrollo
  allowedDevOrigins: ['*.cloudworkstations.dev'],
};

module.exports = nextConfig;
