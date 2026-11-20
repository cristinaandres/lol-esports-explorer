import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import { SearchBox } from './SearchBox'
import { DATA_REPO, REPO_URL, SITE_NAME, SITE_TAGLINE } from '../lib/site'
import type { Meta } from '../lib/types'

const links = [
  { to: '/eras', label: 'Eras', end: false },
  { to: '/players', label: 'Players', end: false },
  { to: '/teams', label: 'Teams', end: false },
  { to: '/champions', label: 'Champions', end: false },
  { to: '/glossary', label: 'Glossary', end: false },
]

/**
 * The site frame.
 *
 * The header does not fit a wordmark, a search box and a nav on a phone: the three
 * of them pushed past the viewport and left the row looking broken. Below `sm` the
 * search and the nav move into a panel behind one button, which is the only thing
 * a 390 px header has room to state honestly.
 */
export function Layout({ meta, children }: { meta: Meta | null; children: ReactNode }) {
  const [menu, setMenu] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line/70 bg-ink-950/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/"
            onClick={() => setMenu(false)}
            className="group flex min-w-0 items-baseline gap-2.5 no-underline"
          >
            <span className="bg-gold size-2 shrink-0 rounded-full" aria-hidden />
            <span className="text-fog-100 truncate font-semibold tracking-tight">{SITE_NAME}</span>
            <span className="text-fog-600 hidden text-xs tracking-widest uppercase sm:inline">
              {SITE_TAGLINE}
            </span>
          </Link>

          <div className="hidden flex-1 items-center justify-between gap-6 sm:flex">
            <NavLinks />
            <SearchBox />
          </div>

          <button
            type="button"
            onClick={() => setMenu((open) => !open)}
            aria-expanded={menu}
            aria-controls="mobile-nav"
            aria-label={menu ? 'Close menu' : 'Open menu'}
            className="border-line text-fog-300 hover:text-fog-100 hover:border-line-bright flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:hidden"
          >
            {menu ? 'Close' : 'Menu'}
          </button>
        </div>

        {menu ? (
          <div id="mobile-nav" className="border-line/70 space-y-4 border-t px-5 py-4 sm:hidden">
            {/* Links first, search second: the search dropdown opens downward and
                would cover anything placed below it. */}
            <NavLinks stacked onNavigate={() => setMenu(false)} />
            <SearchBox fullWidth />
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14">{children}</main>

      <footer className="border-line/70 mt-10 border-t">
        <div className="text-fog-600 mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            Game data from{' '}
            <a className="text-fog-500 hover:text-fog-100" href="https://lol.fandom.com">
              Leaguepedia
            </a>{' '}
            (CC BY-SA 3.0), via the <a className="text-fog-500 hover:text-fog-100" href={DATA_REPO}>lol-dataset</a>{' '}
            build.
          </p>
          <p className="flex items-center gap-4">
            <a
              href={REPO_URL}
              className="text-fog-500 hover:text-fog-100"
              rel="noreferrer"
            >
              Source on GitHub
            </a>
            {meta ? (
              <span className="font-mono">
                {meta.source.tag} · {meta.source.commit.slice(0, 7)}
              </span>
            ) : null}
          </p>
        </div>
      </footer>
    </div>
  )
}

function NavLinks({ stacked = false, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  return (
    <nav className={stacked ? 'flex flex-col gap-3 text-sm' : 'flex items-center gap-5 text-sm'}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive ? 'text-gold no-underline' : 'text-fog-500 hover:text-fog-100 no-underline'
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
