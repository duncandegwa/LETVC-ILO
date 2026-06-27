import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        letvc: {
          green: '#4a7c2f',
          'green-dark': '#3d6827',
          amber: '#d4a017',
        },
      },
    },
  },
  plugins: [],
}

export default config
