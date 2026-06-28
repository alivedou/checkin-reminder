export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#0f1117', card: '#1a1c2e', input: '#252840' },
        text: { primary: '#e8eaf6', secondary: '#9fa4b8', muted: '#6b7084' },
        accent: { blue: '#5b7ff5', red: '#ef4444', green: '#22c55e', yellow: '#eab308', purple: '#a78bfa' },
        border: '#2a2d45',
      }
    }
  },
  plugins: [],
};
