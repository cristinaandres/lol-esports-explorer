import { Link } from 'react-router'

import { dayMonthYear, duration } from '../lib/format'
import { teamName, type Indexes } from '../lib/indexes'
import type { SeriesSummary } from '../lib/series'
import type { Match } from '../lib/types'

/**
 * A list of series, as rows.
 *
 * Shared by the event page and the phase page so the same series cannot be
 * described two ways: one row per series, the whole row a link, the games as chips
 * inside it.
 */
export function SeriesList({
  series,
  matches,
  index,
}: {
  series: SeriesSummary[]
  matches: Map<number, Match>
  index: Indexes
}) {
  return (
    <ol className="divide-line border-line divide-y border-y">
      {series.map((entry) => {
        const match = matches.get(entry.matchKey)
        const single = entry.games.length === 1
        const [a, b] = entry.teamKeys
        const scoreA = entry.wins.get(a) ?? 0
        const scoreB = entry.wins.get(b) ?? 0
        // The placeholder match has a row and no id, so the guard is on the id, not on the
        // row: without one there is no series page to link to, and the row reads as text.
        const href = single
          ? `/games/${entry.games[0]!.game_id}`
          : match?.match_id
            ? `/series/${match.match_id}`
            : null

        return (
          <li
            key={entry.matchKey}
            className="grid gap-2 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4"
          >
            <span className="text-fog-600 font-mono text-xs">{dayMonthYear(entry.firstDate)}</span>

            {href ? (
              <Link
                to={href}
                className="text-fog-100 hover:text-gold flex flex-wrap items-baseline gap-2 font-medium"
              >
                <span>{teamName(index, a)}</span>
                <span className="text-fog-300 font-normal tabular-nums">
                  {single ? 'vs' : `${scoreA} – ${scoreB}`}
                </span>
                <span>{teamName(index, b)}</span>
              </Link>
            ) : (
              <span className="text-fog-100 flex flex-wrap items-baseline gap-2 font-medium">
                <span>{teamName(index, a)}</span>
                <span className="text-fog-300 font-normal tabular-nums">{`${scoreA} – ${scoreB}`}</span>
                <span>{teamName(index, b)}</span>
              </span>
            )}
            <span className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-fog-600 shrink-0 text-xs">
                {match?.best_of ? `best of ${match.best_of}` : 'format not stated'}
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
              {single ? (
                <span className="text-fog-600 font-mono text-xs">
                  {duration(entry.games[0]!.duration_seconds)}
                </span>
              ) : (
                entry.games.map((game, position) => (
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
            </span>
          </li>
        )
      })}
    </ol>
  )
}
