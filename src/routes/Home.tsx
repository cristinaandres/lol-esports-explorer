import { Link } from 'react-router'

import { PageHeader } from '../components/PageHeader'
import { Stat, StatRow } from '../components/Stat'
import { useDataset } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, monthYear } from '../lib/format'
import type { Era } from '../lib/types'

export default function Home() {
  const { status, data, error } = useDataset()

  if (status === 'loading') return <HomeSkeleton />
  if (status === 'failed')
    return (
      <p className="text-side-red">
        Could not load the dataset: {error.message}. Run <code>node tools/check.ts</code>.
      </p>
    )

  const { eras, totals } = data
  // A declared era can govern no game at all, because the game changed during a
  // window in which no international event ran. Those eras stay in the data and
  // are documented below the grid, but an empty card in the primary navigation
  // is a door that opens onto nothing.
  const withGames = eras.filter((era) => era.games > 0)
  const gaps = eras.filter((era) => era.games === 0)

  return (
    <>
      <PageHeader
        eyebrow="International events · 2011–2026"
        title="Every international game, one spine."
        lead="Choose an era to walk the record: era, then event, then series, then the game and its draft. Every number shows the sample it was measured on, because most of them are small."
      />

      <StatRow>
        {/* Containment order: an event holds series, a series holds games. */}
        <Stat
          label="Events played"
          value={count(totals.events)}
          hint={`of ${count(totals.events_admitted)} admitted`}
        />
        <Stat
          label="Series played"
          value={count(totals.series)}
          hint={`of ${count(totals.series_admitted)} admitted`}
        />
        <Stat label="Games" value={count(totals.games)} />
        <Stat
          label="Teams seen"
          value={count(totals.teams)}
          hint={`of ${count(totals.teams_registered)} registered`}
        />
        <Stat label="Players seen" value={count(totals.players)} />
        <Stat
          label="Latest game"
          value={<span className="text-lg">{monthYear(totals.last_date)}</span>}
          hint={`first ${monthYear(totals.first_date)}`}
        />
      </StatRow>

      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-fog-100 text-lg font-semibold tracking-tight">The eras</h2>
          <p className="text-fog-600 text-xs">{withGames.length} eras carried a game</p>
        </div>

        <p className="text-fog-500 mb-8 max-w-3xl text-sm leading-relaxed">
          An era is not a chapter of history this site invented: it is a declared rule about which
          statistics <em>could</em> exist when a game was played.
        </p>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withGames.map((era, index) => (
            <EraCard key={era.era} era={era} index={index} />
          ))}
        </ol>

        <div className="border-line mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-6">
          <span className="text-fog-600 text-[11px] tracking-[0.14em] uppercase">Or browse</span>
          <Link to="/players" className="text-fog-300 hover:text-gold text-sm no-underline">
            {count(totals.players)} players
          </Link>
          <Link to="/teams" className="text-fog-300 hover:text-gold text-sm no-underline">
            {count(totals.teams_registered)} teams
          </Link>
          <Link to="/champions" className="text-fog-300 hover:text-gold text-sm no-underline">
            every champion
          </Link>
        </div>

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
      </section>
    </>
  )
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
        <p className="text-fog-600 mt-1 font-mono text-xs">{span(era)}</p>
        <p className="text-fog-300 mt-3 text-sm leading-relaxed">{copy.whatChanged}</p>

        <div className="border-line mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs">
          <CardFact label="events" value={count(era.events)} />
          <CardFact label="teams" value={count(era.teams)} />
          <CardFact label="players" value={count(era.players)} />
        </div>
      </Link>
    </li>
  )
}

function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fog-100 font-semibold tabular-nums">{value}</div>
      <div className="text-fog-600 text-[10px] tracking-wider uppercase">{label}</div>
    </div>
  )
}

/** '2016 – 2021': the competitive span, not the declared one. */
function span(era: Era): string {
  if (!era.first_date || !era.last_date) return `from ${era.from}`
  const from = era.first_date.slice(0, 4)
  const to = era.last_date.slice(0, 4)
  return from === to ? from : `${from} – ${to}`
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-ink-800 h-10 w-2/3 rounded" />
      <div className="bg-ink-800/60 mt-4 h-4 w-1/2 rounded" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-ink-900 border-line h-44 rounded-xl border" />
        ))}
      </div>
    </div>
  )
}
