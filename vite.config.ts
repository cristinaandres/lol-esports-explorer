import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// The site is a static GitHub Pages project page, so every asset URL is served
// from a sub-path. Set BASE_PATH to '/' to host it at a domain root instead.
const base = process.env.BASE_PATH ?? '/lol-esports-explorer/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  test: {
    // A linked worktree is a full checkout under `.worktrees/` inside this
    // repository, because project trust is keyed on the checkout root. Vitest's
    // default include is `**/*.test.ts`, so without this exclusion a worktree's copy
    // of the suite runs as if it were this checkout's: 34 files instead of 17, a
    // failing branch breaking `dev`'s check, and a green run that says nothing about
    // the code under test. The defaults are kept, not replaced.
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
})
