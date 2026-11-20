import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { useDataset } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, duration, isoDate, monthYear } from '../lib/format'
import type { Era, EventRow } from '../lib/types'

export default function EraDetail() {
  const { era: id } = useParams()
  const { status, data } = useDataset()

  if (status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (status !== 'ready') return <p className="text-fog-600">Nothing to show.</p>

  // Empty declared eras are documented in the glossary but are not part of the
  // navigation, so stepping through the spine never lands on a page with no game.
  const navigable = data.eras.filter((candidate) => candidate.games > 0)
  const era = data.eras.find((candidate) => candidate.era === id)

  if (!era) {
    return (
      <p className="text-fog-300">
        No era called <code>{id}</code>.{' '}
        <Link to="/" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const events = data.events.filter((event) => event.eras?.split(', ').includes(era.era))
  const copy = eraCopy(era.era)
  const position = navigable.findIndex((candidate) => candidate.era === era.era)
  const previous = position > 0 ? navigable[position - 1] : undefined
  const next = position >= 0 ? navigable[position + 1] : undefined

  return (
    <>
      <Breadcrumbs items={[{ label: copy.title }]} />

      <PageHeader
        eyebrow={span(era)}
        title={copy.title}
        lead={copy.whatChanged}
        aside={
          <p className="text-fog-600 max-w-xs text-right font-mono text-xs leading-relaxed">
            governed from {isoDate(era.from)} · {era.eligible_fields} judged fields
          </p>
        }
      />

      {era.games === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 mt-8 rounded-xl border p-6 text-sm">
          {copy.empty} The era is real: the game changed on {isoDate(era.from)}, and no
          international game was played before the next boundary.
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Games" value={count(era.games)} />
            <Stat label="Series" value={count(era.series)} />
            <Stat label="Events" value={count(era.events)} />
            <Stat label="Teams" value={count(era.teams)} />
            <Stat label="Players" value={count(era.players)} />
            <Stat
              label="Avg length"
              value={<span className="text-lg">{duration(era.avg_duration_seconds)}</span>}
            />
          </StatRow>

          <section className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
                What this era can be measured on
              </h2>
              <p className="text-fog-500 mb-5 text-sm leading-relaxed">
                A <code className="text-fog-300">complete</code> game has every eligible field. The
                rest are <code className="text-fog-300">partial</code>: the source recorded some of
                them and answered <code className="text-fog-300">null</code> for others. Partial is
                a fact about the source, not a defect in the data, so it is shown rather than
                dropped.
              </p>

              <dl className="divide-line border-line divide-y border-y">
                <CoverageRow label="Draft" part={era.games_draft_complete} total={era.games} />
                <CoverageRow
                  label="Player statistics"
                  part={era.games_player_complete}
                  total={era.games}
                />
                <CoverageRow label="Team statistics" part={era.games_team_complete} total={era.games} />
                <CoverageRow label="Blue side won" part={era.blue_wins} total={era.games} />
              </dl>
            </div>

            <div>
              <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
                Why this boundary
              </h2>
              <p className="text-fog-500 mb-5 text-sm leading-relaxed">
                Boundaries are declared upstream with a patch citation, never inferred from the
                games — otherwise the assertion "no game before a boundary carries a field that era
                cannot have" would be true by construction.
              </p>
              <blockquote className="border-gold/50 bg-ink-900 text-fog-300 rounded-r-lg border-l-2 p-4 font-mono text-xs leading-relaxed">
                {era.cites}
              </blockquote>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Events</h2>
            <p className="text-fog-500 mb-5 text-sm leading-relaxed">
              {count(events.length)} events admitted in this era. Event pages open in the next
              phase.
            </p>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <Th>Year</Th>
                    <Th>Event</Th>
                    <Th>Competition</Th>
                    <Th right>Games</Th>
                    <Th right>Teams</Th>
                    <Th right>Blue won</Th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {events.map((event: EventRow) => (
                    <tr key={event.event_id} className="hover:bg-ink-850/60">
                      <Td className="text-fog-600 font-mono">{event.year}</Td>
                      <Td className="text-fog-100">{event.event_name}</Td>
                      <Td className="text-fog-500">
                        <span title={event.league || undefined}>{event.competition}</span>
                      </Td>
                      <Td right>{count(event.games)}</Td>
                      <Td right>{count(event.teams)}</Td>
                      <Td right>
                        <Ratio part={event.blue_wins} total={event.games} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <nav className="border-line mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2">
        {previous ? <EraStep era={previous} direction="Previous" /> : <span />}
        {next ? <EraStep era={next} direction="Next" align="right" /> : null}
      </nav>

      {era.games === 0 ? (
        <p className="text-fog-600 mt-6 text-xs">
          This era is reachable by URL for citation, but it is not part of the navigation.{' '}
          <Link to="/glossary" className="text-fog-500 hover:text-fog-100">
            Glossary
          </Link>
        </p>
      ) : null}
    </>
  )
}

function CoverageRow({ label, part, total }: { label: string; part: number; total: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-fog-300 text-sm">{label}</dt>
      <dd>
        <Ratio part={part} total={total} />
      </dd>
    </div>
  )
}

function EraStep({
  era,
  direction,
  align = 'left',
}: {
  era: Era
  direction: string
  align?: 'left' | 'right'
}) {
  return (
    <Link
      to={`/eras/${era.era}`}
      className={`border-line hover:border-line-bright group rounded-xl border p-4 no-underline transition-colors ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      <div className="text-fog-600 text-[10px] tracking-[0.14em] uppercase">{direction}</div>
      <div className="text-fog-100 group-hover:text-gold mt-1 font-semibold">{eraCopy(era.era).title}</div>
      <div className="text-fog-600 font-mono text-xs">{span(era)}</div>
    </Link>
  )
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 font-medium ${right ? 'text-right' : ''}`}>{children}</th>
}

function Td({
  children,
  right,
  className = '',
}: {
  children?: React.ReactNode
  right?: boolean
  className?: string
}) {
  return (
    <td
      className={`px-4 py-2.5 ${right ? 'text-right tabular-nums' : ''} ${className}`}
    >
      {children}
    </td>
  )
}

function span(era: Era): string {
  if (!era.first_date || !era.last_date) return `from ${monthYear(era.from)}`
  const from = era.first_date.slice(0, 4)
  const to = era.last_date.slice(0, 4)
  return from === to ? from : `${from} – ${to}`
}
