import type { Config } from 'tailwindcss'

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: {
          DEFAULT: "#0B0E1A", // used only for dark sections if needed
        },

        gradient: {
          from: "#FF4B0E",
          to: "#677AE5",
        },

        surface: {
          DEFAULT: "rgba(255,255,255,0.92)",
          soft: "rgba(255,255,255,0.85)",
        },

        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Custom text colors mapping to globals
        text: {
          primary: "#0F172A",     // very dark slate
          secondary: "#334155",
          muted: "#64748B",
          inverse: "#FFFFFF",
        },
        'text-secondary': '#334155', // legacy support
        'text-muted': '#64748B', // legacy support

        card: {
          DEFAULT: 'rgba(255,255,255,0.92)',
          foreground: '#0F172A',
        },
        popover: {
          DEFAULT: 'rgba(255,255,255,0.92)',
          foreground: '#0F172A',
        },
        primary: {
          DEFAULT: "#FF4B0E",
          foreground: "#FFFFFF",
          hover: "#E8430C",
          soft: "rgba(255,75,14,0.12)",
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: "#677AE5",
          foreground: "#FFFFFF",
          hover: "#5A6DE0",
          soft: "rgba(103,122,229,0.15)",
        },
        success: {
          DEFAULT: "#22c55e", // green-500
          foreground: "#FFFFFF",
          hover: "#16a34a", // green-600
          soft: "rgba(34,197,94,0.15)",
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        danger: 'hsl(var(--destructive))', // Alias for destructive
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      boxShadow: {
        card: "0 20px 40px rgba(0,0,0,0.18)",
        soft: "0 10px 25px rgba(0,0,0,0.12)",
        glowOrange: "0 0 0 4px rgba(255,75,14,0.25)",
        glowBlue: "0 0 0 4px rgba(103,122,229,0.25)",
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0px)" },
        },
        drift: {
          "0%": { transform: "translateY(-10%)", opacity: '0' },
          "10%": { opacity: '0.12' },
          "100%": { transform: "translateY(110%)", opacity: '0' },
        },
        gradientMove: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        breathing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        falling: {
          '0%': { transform: 'translateY(-20vh)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(120vh)', opacity: '0' },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        breathing: 'breathing 2.8s ease-in-out infinite',
        falling: 'falling 15s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        floatSlow: "float 6s ease-in-out infinite",
        drift: "drift 18s linear infinite",
        gradientMove: "gradientMove 60s ease infinite",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
