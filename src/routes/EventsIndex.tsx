import { useMemo } from 'react'
import { Link } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { LoadFailure } from '../components/LoadFailure'
import { Skeleton } from '../components/Skeleton'
import { useDataset, useGameCorpus } from '../lib/data'
import { count } from '../lib/format'
import { buildIndexes, teamName } from '../lib/indexes'
import { championships } from '../lib/titles'

/**
 * Every event, grouped by the competition it belongs to.
 *
 * The eras axis answers "what was the game like then"; this one answers "show me
 * Worlds", which is how most readers arrive: they follow a competition, not a
 * chassis. The two are complements, and neither is a filter over the other.
 *
 * Each event carries its derived champion where there is one, so the list reads as a
 * roll of honour as well as an index.
 */
export default function EventsIndex() {
  const state = useDataset()
  const corpus = useGameCorpus()

  const prepared = useMemo(() => {
    if (state.status !== 'ready' || corpus.status !== 'ready') return null
    const { events, teams } = state.data
    const { games, matches } = corpus.data
    const champs = championships(games, matches)
    const index = buildIndexes(state.data)

    const groups = new Map<string, typeof events>()
    for (const event of events) {
      const bucket = groups.get(event.competition)
      if (bucket) bucket.push(event)
      else groups.set(event.competition, [event])
    }

    return {
      index,
      champs,
      teams,
      groups: [...groups.entries()]
        .map(([competition, rows]) => ({
          competition,
          events: [...rows].sort((a, b) => b.year - a.year || a.event_name.localeCompare(b.event_name)),
        }))
        .sort((a, b) => b.events.length - a.events.length || a.competition.localeCompare(b.competition)),
      total: events.length,
    } as const
  }, [state, corpus])

  if (state.status === 'loading' || corpus.status === 'loading') return <Skeleton shape="page" />
  if (corpus.status === 'failed')
    return (
      <LoadFailure failures={[{ what: 'the games', error: corpus.error }]} onRetry={corpus.retry} />
    )
  if (state.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {state.error.message}</p>
  if (!prepared) return null

  return (
    <>
      <Breadcrumbs items={[{ label: 'Events' }]} />

      <PageHeader
        eyebrow="Index"
        title="Events"
        lead={`${count(prepared.total)} events, grouped by the competition they belong to. The eras answer what the game was like then; this answers where a competition sits in its own history.`}
      />

      <div className="space-y-12">
        {prepared.groups.map((group) => (
          <section key={group.competition}>
            <h2 className="text-fog-100 border-line mb-3 flex items-baseline justify-between border-b pb-2 text-base font-semibold tracking-tight">
              <span>{group.competition}</span>
              <span className="text-fog-600 font-mono text-xs">
                {count(group.events.length)} {group.events.length === 1 ? 'event' : 'events'}
              </span>
            </h2>

            <ul className="grid gap-x-8 sm:grid-cols-2">
              {group.events.map((event) => {
                const champion = prepared.champs.get(event.event_key)
                return (
                  <li
                    key={event.event_id}
                    className="border-line/60 flex items-baseline justify-between gap-4 border-b py-2"
                  >
                    <span className="min-w-0">
                      <Link to={`/events/${event.event_id}`} className="text-fog-200 hover:text-gold text-sm">
                        {event.event_name}
                      </Link>
                      {champion ? (
                        <span className="text-fog-600 ml-2 text-xs">
                          won by {teamName(prepared.index, champion.teamKey)}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-fog-600 shrink-0 font-mono text-xs tabular-nums">
                      {count(event.games)} games
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
