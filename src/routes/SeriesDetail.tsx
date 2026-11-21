import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { Skeleton } from '../components/Skeleton'
import { PageHeader } from '../components/PageHeader'
import { LoadFailure } from '../components/LoadFailure'
import { useDataset, useGameCorpus } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, dateRange, duration, stripDateSuffix } from '../lib/format'
import { winnerKey } from '../lib/game'
import { buildIndexes, patchLabel, teamName, teamPath } from '../lib/indexes'
import { phasePath } from '../lib/phases'

/**
 * One series and its games.
 *
 * A best-of-one has no series page: the URL redirects to its single game. Two
 * thirds of the corpus is best-of-one, and a level that exists for one third of
 * the visits is a level the reader has to learn for nothing.
 */
export default function SeriesDetail() {
  const { series: id } = useParams()
  const dataset = useDataset()
  const corpus = useGameCorpus()

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready' || corpus.status !== 'ready') return null
    const match = corpus.data.matches.find((row) => row.match_id === id)
    if (!match) return { match: undefined } as const

    const games = corpus.data.games
      .filter((game) => game.match_key === match.match_key)
      .sort((a, b) => a.date_time_utc.localeCompare(b.date_time_utc))
    const event = dataset.data.events.find((row) => row.event_key === match.event_key)
    const wins = new Map<number, number>()
    for (const game of games) {
      const winner = winnerKey(game)
      wins.set(winner, (wins.get(winner) ?? 0) + 1)
    }
    return { match, games, event, wins, index: buildIndexes(dataset.data) } as const
  }, [dataset, corpus, id])

  if (dataset.status === 'loading' || corpus.status === 'loading') return <Skeleton shape="page" />
  // A failed load is not an unknown series: "No series called X" would blame the
  // reader's link for the network. This page had no failed branch at all.
  if (dataset.status === 'failed')
    return (
      <LoadFailure
        failures={[{ what: 'the dataset', error: dataset.error }]}
        onRetry={dataset.retry}
      />
    )
  if (corpus.status === 'failed')
    return (
      <LoadFailure failures={[{ what: 'the series', error: corpus.error }]} onRetry={corpus.retry} />
    )
  if (!prepared?.match) {
    return (
      <p className="text-fog-300">
        No series called <code>{id}</code>.{' '}
        <Link to="/" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const { match, games, event, wins, index } = prepared
  const firstDate = games[0]?.date_time_utc ?? match.date_time_utc
  const lastDate = games[games.length - 1]?.date_time_utc ?? match.date_time_utc

  if (games.length === 1) {
    return <Navigate to={`/games/${games[0]!.game_id}`} replace />
  }

  const eraId = event?.eras?.split(', ')[0] ?? ''
  const [a, b] = games.length > 0 ? [games[0]!.blue_team_key, games[0]!.red_team_key] : [0, 0]

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Eras', to: '/eras' },
          { label: eraId ? eraCopy(eraId).title : '—', to: eraId ? `/eras/${eraId}` : undefined },
          {
            label: event?.event_name ?? 'Event',
            to: event ? `/events/${event.event_id}` : undefined,
          },
          ...(event && match.tab
            ? [{ label: match.tab, to: phasePath(event.event_id, match.tab) }]
            : []),
          { label: `${teamName(index, a)} vs ${teamName(index, b)}` },
        ]}
      />

      <PageHeader
        eyebrow={match.best_of ? `best of ${match.best_of}` : 'format not stated'}
        title={<span title={match.match_name}>{stripDateSuffix(match.match_name) || 'Series'}</span>}
        aside={
          <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
            {dateRange(firstDate, lastDate)}
            <br />
            {count(games.length)} games
            {match.forfeit === 1 ? ' · forfeit' : ''}
          </p>
        }
      />

      {games.length === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 mt-6 rounded-xl border p-6 text-sm">
          This series is admitted but the corpus carries no game for it. A series that was scheduled
          and never played is a fact about the record, not a missing page.
        </p>
      ) : (
        <>
          <section
            aria-labelledby="series-score-heading"
            className="border-line mb-6 flex items-baseline justify-between gap-4 rounded-xl border px-5 py-4"
          >
            <h2 id="series-score-heading" className="sr-only">
              Series score
            </h2>
            <Link to={teamPath(index, a) ?? '#'} className="text-fog-100 hover:text-gold text-lg font-semibold">
              {teamName(index, a)}
            </Link>
            <span className="text-fog-300 font-mono tabular-nums">
              {wins.get(a) ?? 0} – {wins.get(b) ?? 0}
            </span>
            <Link
              to={teamPath(index, b) ?? '#'}
              className="text-fog-100 hover:text-gold text-right text-lg font-semibold"
            >
              {teamName(index, b)}
            </Link>
          </section>

          <ol className="divide-line border-line divide-y border-y">
            {games.map((game, position) => {
              const winner = winnerKey(game)
              return (
                <li key={game.game_key} className="grid gap-2 py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="text-fog-600 font-mono text-xs">Game {position + 1}</span>
                  <Link to={`/games/${game.game_id}`} className="hover:text-gold no-underline">
                    <span className="text-fog-100 font-medium">{teamName(index, winner)}</span>
                    <span className="text-fog-600"> won</span>
                  </Link>
                  <span className="text-fog-600 flex items-center gap-4 font-mono text-xs">
                    <span>{duration(game.duration_seconds)}</span>
                    <span>{patchLabel(index, game.patch_key)}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </>
  )
}
