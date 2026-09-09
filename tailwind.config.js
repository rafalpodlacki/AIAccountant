/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#F2F1EA',
        ink: '#14213D',
        ledger: '#1E3D34',
        ledgerlight: '#2C5A4C',
        debit: '#A6372B',
        line: '#D8D5C8',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
