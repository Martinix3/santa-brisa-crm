
module.exports = {
  experimental: {
    serverActions: {
      allowedForwardedHosts: ['firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'],
      allowedOrigins: ['9000-firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'],
    },
    // The `allowedDevOrigins` key should be directly under experimental, not inside serverActions.
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
};
