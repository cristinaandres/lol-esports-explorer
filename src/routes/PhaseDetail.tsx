import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { SeriesList } from '../components/SeriesList'
import { useDataset } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, dayMonthYear } from '../lib/format'
import { buildIndexes } from '../lib/indexes'
import { groupByPhase, phaseSlug } from '../lib/phases'
import { groupGamesBySeries } from '../lib/series'

/**
 * One phase of one competition.
 *
 * A tournament is not read as a flat list of 120 series: it is read as a group
 * stage, then a bracket, then a final. The source states that grouping on every
 * series, so the page exists rather than being reconstructed by eye, and it is a
 * page somebody can link to — "the semifinals of Worlds 2024" is a thing people
 * want to send each other.
 */
export default function PhaseDetail() {
  const { event: eventId, phase } = useParams()
  const { status, data } = useDataset()

  const prepared = useMemo(() => {
    if (status !== 'ready') return null
    const event = data.events.find((row) => row.event_id === eventId)
    if (!event) return { event: undefined } as const

    const games = data.games.filter((game) => game.event_key === event.event_key)
    const matches = new Map(
      data.matches.filter((match) => match.event_key === event.event_key).map((match) => [match.match_key, match]),
    )
    const grouped = groupGamesBySeries(games)
    const wanted = phase ? decodeURIComponent(phase) : ''
    const found = groupByPhase(grouped.series, matches).find((entry) => entry.tab === wanted)

    return {
      event,
      matches,
      phase: found,
      wanted,
      index: buildIndexes(data),
      all: groupByPhase(grouped.series, matches),
    } as const
  }, [status, data, eventId, phase])

  if (status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {status === 'failed' ? '' : ''}</p>

  if (!prepared?.event) {
    return (
      <p className="text-fog-300">
        No event called <code>{eventId}</code>.{' '}
        <Link to="/eras" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const { event, matches, phase: found, wanted, index, all } = prepared
  const eraId = event.eras?.split(', ')[0] ?? ''

  if (!found) {
    return (
      <div className="py-12">
        <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">Not found</p>
        <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">
          {event.event_name} has no phase called “{wanted}”.
        </h1>
        <p className="text-fog-300 mt-3 max-w-xl text-sm leading-relaxed">
          The phases this event was played in are{' '}
          {all.map((entry, position) => (
            <span key={entry.tab}>
              {position > 0 ? ', ' : ''}
              <Link to={`/events/${event.event_id}/phases/${phaseSlug(entry.tab)}`} className="text-gold">
                {entry.tab}
              </Link>
            </span>
          ))}
          .
        </p>
      </div>
    )
  }

  const games = found.series.reduce((sum, entry) => sum + entry.games.length, 0)
  const position = all.findIndex((entry) => entry.tab === found.tab)
  const next = all[position + 1]

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Eras', to: '/eras' },
          { label: eraId ? eraCopy(eraId).title : 'Era', to: eraId ? `/eras/${eraId}` : undefined },
          { label: event.event_name, to: `/events/${event.event_id}` },
          { label: found.tab },
        ]}
      />

      <PageHeader
        eyebrow={`${event.competition} · ${event.year}`}
        title={found.tab}
        lead={`${count(found.series.length)} series, ${count(games)} games, from ${dayMonthYear(found.firstDate)}.`}
        aside={
          next ? (
            <p className="text-fog-600 text-right text-xs">
              next phase
              <br />
              <Link
                to={`/events/${event.event_id}/phases/${phaseSlug(next.tab)}`}
                className="text-fog-300 hover:text-gold"
              >
                {next.tab} →
              </Link>
            </p>
          ) : null
        }
      />

      <SeriesList series={found.series} matches={matches} index={index} />
    </>
  )
}
