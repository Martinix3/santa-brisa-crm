/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sb: {
          primary: "rgb(var(--sb-primary-rgb))",
          orange:  "rgb(var(--sb-orange-rgb))",
          aqua:    "rgb(var(--sb-aqua-rgb))",
          teal:    "rgb(var(--sb-teal-rgb))",
          danger:  "rgb(var(--sb-danger-rgb))",
          ink: {
            900: "var(--sb-ink-900)", 800: "var(--sb-ink-800)",
            700: "var(--sb-ink-700)", 600: "var(--sb-ink-600)",
            500: "var(--sb-ink-500)", 400: "var(--sb-ink-400)",
            300: "var(--sb-ink-300)", 200: "var(--sb-ink-200)",
            100: "var(--sb-ink-100)", 50:  "var(--sb-ink-50)",
          },
        },
      },
      spacing: {
        sb1: "var(--sb-space-1)", sb2: "var(--sb-space-2)",
        sb3: "var(--sb-space-3)", sb4: "var(--sb-space-4)",
        sb6: "var(--sb-space-6)", sb8: "var(--sb-space-8)",
      },
      borderRadius: {
        sbs: "var(--sb-radius-sm)",
        sb: "var(--sb-radius-md)",
        sblg: "var(--sb-radius-lg)",
        pill: "var(--sb-radius-pill)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
       boxShadow: {
        sb1: "var(--sb-shadow-1)", 
        sb2: "var(--sb-shadow-2)" 
      },
      height: {
        'sb-sm': "var(--sb-control-sm)",
        'sb-md': "var(--sb-control-md)",
        'sb-lg': "var(--sb-control-lg)",
      },
      maxWidth: {
        'sb-sm': "var(--sb-container-sm)",
        'sb-md': "var(--sb-container-md)",
        'sb-lg': "var(--sb-container-lg)",
      },
      ringColor: { 
        sb: "rgb(var(--sb-primary-rgb) / 0.55)" 
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
