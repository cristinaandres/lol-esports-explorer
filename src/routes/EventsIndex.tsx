import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { SelectField } from '../components/SelectField'
import { LoadFailure } from '../components/LoadFailure'
import { Skeleton } from '../components/Skeleton'
import { useDataset, useGameCorpus } from '../lib/data'
import { groupEvents, parseEventSort, parseSortOrder } from '../lib/eventGroups'
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
const SORT_OPTIONS = [
  { value: 'competition', label: 'Competition' },
  { value: 'year', label: 'Year' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
]

export default function EventsIndex() {
  const state = useDataset()
  const corpus = useGameCorpus()
  // Both choices are URL parameters, like the index sorts: `?sort=year&order=asc` is a
  // link a reader can send, and an unknown value falls back rather than emptying the page.
  const [params, setParams] = useSearchParams()
  const sort = parseEventSort(params.get('sort'))
  const order = parseSortOrder(params.get('order'))

  const setParam = (name: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }

  const prepared = useMemo(() => {
    if (state.status !== 'ready' || corpus.status !== 'ready') return null
    const { events, teams } = state.data
    const { games, matches } = corpus.data
    const champs = championships(games, matches)
    const index = buildIndexes(state.data)

    return {
      index,
      champs,
      teams,
      groups: groupEvents(events, sort, order),
      total: events.length,
    } as const
  }, [state, corpus, sort, order])

  if (state.status === 'loading' || corpus.status === 'loading') return <Skeleton shape="page" />
  if (corpus.status === 'failed')
    return (
      <LoadFailure failures={[{ what: 'the games', error: corpus.error }]} onRetry={corpus.retry} />
    )
  if (state.status === 'failed')
    return (
      <LoadFailure
        failures={[{ what: 'the dataset', error: state.error }]}
        onRetry={state.retry}
      />
    )
  if (!prepared) return null

  return (
    <>
      <Breadcrumbs items={[{ label: 'Events' }]} />

      <PageHeader
        eyebrow="Index"
        title="Events"
        lead={
          sort === 'year'
            ? `${count(prepared.total)} events, one group per year, ${order === 'asc' ? 'oldest first' : 'newest first'}. Inside a year the events run by name: a year is a date, not a ranking.`
            : `${count(prepared.total)} events, grouped by the competition they belong to. The eras answer what the game was like then; this answers where a competition sits in its own history.`
        }
        aside={
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Sort by"
              value={sort}
              onChange={(value) => setParam('sort', value, 'competition')}
              options={SORT_OPTIONS}
            />
            {sort === 'year' ? (
              <SelectField
                label="Order"
                value={order}
                onChange={(value) => setParam('order', value, 'desc')}
                options={ORDER_OPTIONS}
              />
            ) : null}
          </div>
        }
      />

      <div className="space-y-12">
        {prepared.groups.map((group) => (
          <section key={group.label}>
            <h2 className="text-fog-100 border-line mb-3 flex items-baseline justify-between border-b pb-2 text-base font-semibold tracking-tight">
              <span>{group.label}</span>
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
