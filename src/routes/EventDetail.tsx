import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { useDataset } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, duration, dayMonthYear } from '../lib/format'
import { buildIndexes, teamName, teamPath } from '../lib/indexes'
import { groupGamesBySeries } from '../lib/series'

export default function EventDetail() {
  const { event: id } = useParams()
  const state = useDataset()

  const prepared = useMemo(() => {
    if (state.status !== 'ready') return null
    const data = state.data
    const event = data.events.find((row) => row.event_id === id)
    if (!event) return { event: undefined } as const

    const games = data.games.filter((game) => game.event_key === event.event_key)
    const matches = new Map(
      data.matches.filter((match) => match.event_key === event.event_key).map((match) => [match.match_key, match]),
    )
    return { event, games, matches, grouped: groupGamesBySeries(games), index: buildIndexes(data) } as const
  }, [state, id])

  if (state.status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (state.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {state.error.message}</p>
  if (!prepared?.event) {
    return (
      <p className="text-fog-300">
        No event called <code>{id}</code>.{' '}
        <Link to="/" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const { event, matches, grouped, index } = prepared
  const eraId = event.eras?.split(', ')[0] ?? ''
  const eraTitle = eraId ? eraCopy(eraId).title : '—'

  return (
    <>
      <Breadcrumbs
        items={[
          { label: eraTitle, to: eraId ? `/eras/${eraId}` : undefined },
          { label: event.event_name },
        ]}
      />

      <PageHeader
        eyebrow={`${event.competition} · ${event.year}`}
        title={event.event_name}
        lead={undefined}
        aside={
          <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
            {dayMonthYear(event.first_date)} → {dayMonthYear(event.last_date)}
            <br />
            {eraTitle}
            {event.eras && event.eras.includes(',') ? ' (spans more than one era)' : ''}
          </p>
        }
      />

      <StatRow>
        <Stat label="Games" value={count(event.games)} />
        <Stat label="Series" value={count(event.series)} />
        <Stat label="Teams" value={count(event.teams)} />
        <Stat label="Players" value={count(event.players)} />
        <Stat
          label="Avg length"
          value={<span className="text-lg">{duration(event.avg_duration_seconds)}</span>}
        />
        <Stat label="Blue side won" value={<Ratio part={event.blue_wins} total={event.games} />} />
      </StatRow>

      {grouped.series.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Series</h2>
          <p className="text-fog-500 mb-5 text-sm leading-relaxed">
            A best-of-one is shown as the game it is: there is no series page to open for a single
            game.
          </p>

          <ol className="divide-line border-line divide-y border-y">
            {grouped.series.map((series) => {
              const match = matches.get(series.matchKey)
              const single = series.games.length === 1
              const [a, b] = series.teamKeys
              const scoreA = series.wins.get(a) ?? 0
              const scoreB = series.wins.get(b) ?? 0
              const href = single
                ? `/games/${series.games[0]!.game_id}`
                : `/series/${match?.match_id ?? ''}`

              return (
                <li
                  key={series.matchKey}
                  className="grid gap-2 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4"
                >
                  <span className="text-fog-600 font-mono text-xs">
                    {dayMonthYear(series.firstDate)}
                  </span>

                  <span className="flex flex-wrap items-baseline gap-2">
                    <Link
                      to={teamPath(index, a) ?? href}
                      className="text-fog-100 hover:text-gold font-medium"
                    >
                      {teamName(index, a)}
                    </Link>
                    <Link to={href} className="text-fog-300 hover:text-gold no-underline tabular-nums">
                      {single ? 'vs' : `${scoreA} – ${scoreB}`}
                    </Link>
                    <Link
                      to={teamPath(index, b) ?? href}
                      className="text-fog-100 hover:text-gold font-medium"
                    >
                      {teamName(index, b)}
                    </Link>
                    <span className="text-fog-600 text-xs">
                      {match?.best_of ? `best of ${match.best_of}` : 'format not stated'}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-1.5">
                    {single ? (
                      <span className="text-fog-600 font-mono text-xs">
                        {duration(series.games[0]!.duration_seconds)}
                      </span>
                    ) : (
                      series.games.map((game, position) => (
                        <Link
                          key={game.game_key}
                          to={`/games/${game.game_id}`}
                          className="border-line text-fog-500 hover:border-line-bright hover:text-fog-100 rounded border px-2 py-0.5 font-mono text-[11px] no-underline"
                          title={`${dayMonthYear(game.date_time_utc)} · ${duration(game.duration_seconds)}`}
                        >
                          G{position + 1}
                        </Link>
                      ))
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {grouped.orphans.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
            Games without a series
          </h2>
          <p className="text-fog-500 mb-5 text-sm leading-relaxed">
            {count(grouped.orphans.length)} games at this event are not attached to a series in the
            source. They are listed here rather than dropped: a played game that no bracket row
            covers is still a played game.
          </p>

          <ol className="divide-line border-line divide-y border-y">
            {grouped.orphans.map((game) => (
              <li key={game.game_key} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4">
                <span className="text-fog-600 font-mono text-xs">{dayMonthYear(game.date_time_utc)}</span>
                <Link
                  to={`/games/${game.game_id}`}
                  className="text-fog-100 hover:text-gold font-medium"
                >
                  {teamName(index, game.blue_team_key)} vs {teamName(index, game.red_team_key)}
                </Link>
                <span className="text-fog-600 font-mono text-xs">{duration(game.duration_seconds)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  )
}
