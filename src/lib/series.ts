import type { Game } from './types'

/**
 * Grouping an event's games into what a reader actually watched.
 *
 * Two thirds of the corpus is best-of-one (1,455 of 1,964 played series), so a
 * series level that every event passes through would be a level learned for
 * nothing. This module decides which games form a series and which stand alone.
 */

export type SeriesSummary = {
  matchKey: number
  games: Game[]
  /** The two teams, in the order they first appear on the blue and red sides. */
  teamKeys: [number, number]
  /** Wins per team key. */
  wins: Map<number, number>
  firstDate: string
}

export type GroupedGames = {
  series: SeriesSummary[]
  /** Games with no series: 42 in the corpus. */
  orphans: Game[]
}

const byDate = (a: Game, b: Game) => a.date_time_utc.localeCompare(b.date_time_utc)

export function groupGamesBySeries(games: Game[]): GroupedGames {
  const grouped = new Map<number, Game[]>()
  const orphans: Game[] = []

  for (const game of [...games].sort(byDate)) {
    if (game.match_key === 0) {
      orphans.push(game)
      continue
    }
    const bucket = grouped.get(game.match_key)
    if (bucket) bucket.push(game)
    else grouped.set(game.match_key, [game])
  }

  const series: SeriesSummary[] = []
  for (const [matchKey, rows] of grouped) {
    series.push({
      matchKey,
      games: rows,
      teamKeys: teamsOf(rows),
      wins: winsOf(rows),
      firstDate: rows[0]!.date_time_utc,
    })
  }
  series.sort((a, b) => a.firstDate.localeCompare(b.firstDate))

  return { series, orphans }
}

function teamsOf(games: Game[]): [number, number] {
  const first = games[0]!
  return [first.blue_team_key, first.red_team_key]
}

function winsOf(games: Game[]): Map<number, number> {
  const wins = new Map<number, number>()
  for (const game of games) {
    const winner = game.blue_win === 1 ? game.blue_team_key : game.red_team_key
    wins.set(winner, (wins.get(winner) ?? 0) + 1)
  }
  return wins
}
