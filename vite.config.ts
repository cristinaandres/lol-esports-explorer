import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The site is a static GitHub Pages project page, so every asset URL is served
// from a sub-path. Set BASE_PATH to '/' to host it at a domain root instead.
const base = process.env.BASE_PATH ?? '/lol-esports-explorer/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
