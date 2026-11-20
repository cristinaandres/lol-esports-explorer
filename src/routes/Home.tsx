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
  const withGames = eras.filter((era) => era.games > 0)

  return (
    <>
      <PageHeader
        eyebrow="International events · 2011–2026"
        title="Every international game, one spine."
        lead="Choose an era to walk the record: era, then event, then series, then the game and its draft. Every number shows the sample it was measured on, because most of them are small."
      />

      <StatRow>
        <Stat label="Games" value={count(totals.games)} />
        <Stat
          label="Series played"
          value={count(totals.series)}
          hint={`of ${count(totals.series_admitted)} admitted`}
        />
        <Stat
          label="Events played"
          value={count(totals.events)}
          hint={`of ${count(totals.events_admitted)} admitted`}
        />
        <Stat
          label="Teams seen"
          value={count(totals.teams)}
          hint={`of ${count(totals.teams_registered)} registered`}
        />
        <Stat label="Players seen" value={count(totals.players)} />
        <Stat
          label="First game"
          value={<span className="text-lg">{monthYear(totals.first_date)}</span>}
          hint={`last ${monthYear(totals.last_date)}`}
        />
      </StatRow>

      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-fog-100 text-lg font-semibold tracking-tight">The eras</h2>
          <p className="text-fog-600 text-xs">{withGames.length} of {eras.length} govern any game</p>
        </div>

        <p className="text-fog-500 mb-8 max-w-3xl text-sm leading-relaxed">
          An era is not a chapter of history this site invented: it is a declared rule about which
          statistics <em>could</em> exist when a game was played. Two declared eras govern no game at
          all, because the game changed during a window in which no international event ran.
        </p>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eras.map((era, index) => (
            <EraCard key={era.era} era={era} index={index} />
          ))}
        </ol>
      </section>
    </>
  )
}

function EraCard({ era, index }: { era: Era; index: number }) {
  const copy = eraCopy(era.era)
  const empty = era.games === 0

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-fog-600 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
        {empty ? (
          <span className="border-line text-fog-600 rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase">
            gap
          </span>
        ) : (
          <span className="text-fog-600 font-mono text-xs">
            {count(era.games)} games · {count(era.patches)} patches
          </span>
        )}
      </div>

      <h3 className="text-fog-100 mt-6 text-lg font-semibold tracking-tight">{copy.title}</h3>
      <p className="text-fog-600 mt-1 font-mono text-xs">
        {span(era)}
      </p>
      <p className="text-fog-300 mt-3 text-sm leading-relaxed">
        {empty ? copy.empty : copy.whatChanged}
      </p>

      {empty ? null : (
        <div className="border-line mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs">
          <CardFact label="events" value={count(era.events)} />
          <CardFact label="teams" value={count(era.teams)} />
          <CardFact label="players" value={count(era.players)} />
        </div>
      )}
    </>
  )

  if (empty) {
    return (
      <li className="border-line bg-ink-900/40 rounded-xl border border-dashed p-5 opacity-70">
        {body}
      </li>
    )
  }

  return (
    <li>
      <Link
        to={`/eras/${era.era}`}
        className="border-line bg-ink-900 hover:border-line-bright hover:bg-ink-850 block h-full rounded-xl border p-5 no-underline transition-colors"
      >
        {body}
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
