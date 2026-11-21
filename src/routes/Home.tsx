import { Link } from 'react-router'

import { EraGrid } from '../components/EraGrid'
import { PageHeader } from '../components/PageHeader'
import { LoadFailure } from '../components/LoadFailure'
import { Skeleton } from '../components/Skeleton'
import { Stat, StatRow } from '../components/Stat'
import { useDataset } from '../lib/data'
import { count, monthYear } from '../lib/format'

export default function Home() {
  const { status, data, error, retry } = useDataset()

  if (status === 'loading') return <Skeleton shape="cards" />
  // The eager set is the one thing every page needs, so this is the failure a
  // reader is most likely to meet; it gets the same block and retry as the rest
  // rather than advice to reload by hand.
  if (status === 'failed')
    return <LoadFailure failures={[{ what: 'the dataset', error }]} onRetry={retry} />

  const { eras, totals, champions } = data
  const championsPlayed = champions.filter((champion) => champion.games > 0).length

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
          <Link to="/eras" className="text-fog-600 hover:text-fog-100 text-xs no-underline">
            open the eras →
          </Link>
        </div>

        <p className="text-fog-500 mb-8 max-w-3xl text-sm leading-relaxed">
          An era is not a chapter of history this site invented: it is a declared rule about which
          statistics <em>could</em> exist when a game was played.
        </p>

        <EraGrid eras={eras} />
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-fog-100 text-lg font-semibold tracking-tight">Or come in by entity</h2>
          <p className="text-fog-600 text-xs">every name the corpus carries</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <BrowseCard
            to="/players"
            label="Players"
            value={count(totals.players)}
            blurb="everyone who appears in at least one game"
          />
          <BrowseCard
            to="/teams"
            label="Teams"
            value={count(totals.teams)}
            blurb="every organisation a game names"
          />
          <BrowseCard
            to="/champions"
            label="Champions"
            value={count(championsPlayed)}
            blurb="every champion a draft contains"
          />
        </div>
      </section>
    </>
  )
}

function BrowseCard({
  to,
  label,
  value,
  blurb,
}: {
  to: string
  label: string
  value: string
  blurb: string
}) {
  return (
    <Link
      to={to}
      className="border-line bg-ink-900 hover:border-line-bright hover:bg-ink-850 group block rounded-xl border p-5 no-underline transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-fog-100 text-base font-semibold tracking-tight">{label}</span>
        <span className="text-fog-600 group-hover:text-gold font-mono text-xs">{value} →</span>
      </div>
      <p className="text-fog-500 mt-2 text-sm leading-relaxed">{blurb}</p>
    </Link>
  )
}
