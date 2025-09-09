/**
 * @type {import('next').NextConfig}
 */
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Los workers de Monaco no funcionan en el lado del servidor,
    // así que solo aplicamos el plugin para el build del cliente.
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json', 'typescript', 'javascript', 'css', 'html', 'handlebars'],
          // Define una ruta de salida predecible para los workers
          publicPath: '/_next/static/monaco',
          filename: '[name].worker.js',
        })
      );
    }
    return config;
  },
}
 
module.exports = nextConfig
