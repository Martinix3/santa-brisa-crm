/** @type {import('tailwindcss').Config} */
module.exports = {
    // Asegúrate de que las rutas a tus archivos de código sean correctas
    // para que Tailwind pueda encontrar las clases que usas.
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  };
  