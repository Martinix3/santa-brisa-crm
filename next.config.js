
module.exports = {
  experimental: {
    serverActions: {
      allowedForwardedHosts: ['firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'],
      allowedOrigins: ['9000-firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'],
      // The above is too specific. Using allowedDevOrigins is better for dynamic dev environments.
      // We'll keep the old ones for reference during transition if needed, but the new one should take precedence.
    },
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
};
