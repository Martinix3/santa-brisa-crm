// next.config.js
/** @type {import('next').NextConfig} */
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  allowedDevOrigins: [
    '9000-firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
    '9002-firebase-studio-1749550815469.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
    '*.cloudworkstations.dev', // opcional
  ],
  webpack(config, { isServer }) {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json','typescript','javascript','css','html','handlebars'],
          filename: 'static/monaco/[name].worker.js',
        })
      );
    }
    return config;
  },
};
