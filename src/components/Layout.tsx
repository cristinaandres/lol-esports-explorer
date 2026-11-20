import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import type { Meta } from '../lib/types'

const links = [
  { to: '/', label: 'Eras', end: true },
  { to: '/glossary', label: 'Glossary', end: false },
]

export function Layout({ meta, children }: { meta: Meta | null; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line/70 bg-ink-950/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          <Link to="/" className="group flex items-baseline gap-2.5 no-underline">
            <span className="bg-gold size-2 rounded-full" aria-hidden />
            <span className="text-fog-100 font-semibold tracking-tight">LoL Esports Explorer</span>
            <span className="text-fog-600 hidden text-xs tracking-widest uppercase sm:inline">
              intl · 2011–2026
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  isActive ? 'text-gold no-underline' : 'text-fog-500 hover:text-fog-100 no-underline'
                }
              >
                {link.label}
              </NavLink>
            ))}
            <a
              href="https://github.com/cristinaandres/lol-esports-explorer"
              className="text-fog-500 hover:text-fog-100 no-underline"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14">{children}</main>

      <footer className="border-line/70 mt-10 border-t">
        <div className="text-fog-600 mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            Game data from{' '}
            <a className="text-fog-500 hover:text-fog-100" href="https://lol.fandom.com">
              Leaguepedia
            </a>{' '}
            (CC BY-SA 3.0), via the{' '}
            <a
              className="text-fog-500 hover:text-fog-100"
              href="https://github.com/RRiboulet/lol-dataset"
            >
              lol-dataset
            </a>{' '}
            build.
          </p>
          {meta ? (
            <p className="font-mono">
              {meta.source.tag} · {meta.source.commit.slice(0, 7)}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
