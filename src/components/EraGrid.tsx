import { Link } from 'react-router'

import { eraCopy } from '../lib/eras'
import { count } from '../lib/format'
import type { Era } from '../lib/types'

/**
 * The era spine, as cards.
 *
 * Shared by the home page and the eras index so the two cannot describe an era
 * differently. An era with no game is not a card: it is named once below the grid,
 * because a card that opens onto nothing is not a navigable level.
 */
export function EraGrid({ eras }: { eras: Era[] }) {
  const withGames = eras.filter((era) => era.games > 0)
  const gaps = eras.filter((era) => era.games === 0)

  return (
    <>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withGames.map((era, index) => (
          <EraCard key={era.era} era={era} index={index} />
        ))}
      </ol>

      {gaps.length > 0 ? (
        <p className="text-fog-600 border-line mt-6 border-t pt-5 text-xs leading-relaxed">
          <span className="text-fog-500">Also declared, but empty:</span>{' '}
          {gaps.map((era, index) => (
            <span key={era.era}>
              {index > 0 ? ' · ' : ''}
              <span className="text-fog-400">{eraCopy(era.era).title}</span>{' '}
              <span className="font-mono">({era.from})</span>
            </span>
          ))}
          . The game changed in windows where no international event was played, so they carry a
          boundary but no game. They are kept in the data, and explained in the{' '}
          <Link to="/glossary" className="text-fog-500 hover:text-fog-100">
            glossary
          </Link>
          .
        </p>
      ) : null}
    </>
  )
}

export function eraSpan(era: Era): string {
  if (!era.first_date || !era.last_date) return `from ${era.from}`
  const from = era.first_date.slice(0, 4)
  const to = era.last_date.slice(0, 4)
  return from === to ? from : `${from} – ${to}`
}

function EraCard({ era, index }: { era: Era; index: number }) {
  const copy = eraCopy(era.era)

  return (
    <li>
      <Link
        to={`/eras/${era.era}`}
        className="border-line bg-ink-900 hover:border-line-bright hover:bg-ink-850 block h-full rounded-xl border p-5 no-underline transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-fog-600 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-fog-600 font-mono text-xs">
            {count(era.games)} games · {count(era.patches)} patches
          </span>
        </div>

        <h3 className="text-fog-100 mt-6 text-lg font-semibold tracking-tight">{copy.title}</h3>
        <p className="text-fog-600 mt-1 font-mono text-xs">{eraSpan(era)}</p>
        <p className="text-fog-300 mt-3 text-sm leading-relaxed">{copy.whatChanged}</p>

        <div className="border-line mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs">
          <Fact label="events" value={count(era.events)} />
          <Fact label="teams" value={count(era.teams)} />
          <Fact label="players" value={count(era.players)} />
        </div>
      </Link>
    </li>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fog-100 font-semibold tabular-nums">{value}</div>
      <div className="text-fog-600 text-[10px] tracking-wider uppercase">{label}</div>
    </div>
  )
}
