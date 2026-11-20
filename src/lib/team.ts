import type { Game, PlayerGame } from './types'

/**
 * A team's record, built from the games it played.
 *
 * There is no team-season table in the corpus and no roster table: a team is the
 * two sides of the games that name it, and a roster is the players who appear in
 * those games. That is a fact about who played, not about who was signed, and the
 * page says so rather than implying a transfer history the model cannot know.
 */

export type TeamAppearance = {
  game: Game
  side: 'blue' | 'red'
  won: boolean
  competition: string
}

export type TeamSummary = {
  games: number
  wins: number
  /** Side preference is an era property as much as a team one, so it is split. */
  blue: { games: number; wins: number }
  red: { games: number; wins: number }
  events: { eventKey: number; games: number; wins: number }[]
  firstGame: string | null
  lastGame: string | null
}

export type RosterEntry = {
  playerKey: number
  games: number
  first: string
  last: string
}

export function teamAppearancesFor(
  games: Game[],
  competitions: Map<number, string>,
  teamKey: number,
): TeamAppearance[] {
  return games
    .flatMap((game) => {
      const side: 'blue' | 'red' | null =
        game.blue_team_key === teamKey ? 'blue' : game.red_team_key === teamKey ? 'red' : null
      if (!side) return []
      const won = side === 'blue' ? game.blue_win === 1 : game.blue_win === 0
      return [{ game, side, won, competition: competitions.get(game.event_key) ?? 'Unknown' }]
    })
    .sort((a, b) => a.game.date_time_utc.localeCompare(b.game.date_time_utc))
}

export function teamSummaryFrom(appearances: TeamAppearance[]): TeamSummary {
  if (appearances.length === 0) {
    return {
      games: 0,
      wins: 0,
      blue: { games: 0, wins: 0 },
      red: { games: 0, wins: 0 },
      events: [],
      firstGame: null,
      lastGame: null,
    }
  }

  let wins = 0
  const blue = { games: 0, wins: 0 }
  const red = { games: 0, wins: 0 }
  const events = new Map<number, { eventKey: number; games: number; wins: number }>()

  for (const appearance of appearances) {
    const bucket = appearance.side === 'blue' ? blue : red
    bucket.games += 1
    if (appearance.won) {
      wins += 1
      bucket.wins += 1
    }

    const eventKey = appearance.game.event_key
    const event = events.get(eventKey) ?? { eventKey, games: 0, wins: 0 }
    event.games += 1
    if (appearance.won) event.wins += 1
    events.set(eventKey, event)
  }

  return {
    games: appearances.length,
    wins,
    blue,
    red,
    events: [...events.values()].sort((a, b) => b.games - a.games || a.eventKey - b.eventKey),
    firstGame: appearances[0]!.game.date_time_utc,
    lastGame: appearances[appearances.length - 1]!.game.date_time_utc,
  }
}

/**
 * Who played for this team, over the games in scope.
 *
 * Only rows belonging to the team *and* to a game in the list count, so a player
 * who appeared against this team is not mistaken for one who played for it.
 */
export function rosterFrom(playerGames: PlayerGame[], appearances: TeamAppearance[]): RosterEntry[] {
  const inScope = new Map(appearances.map((appearance) => [appearance.game.game_key, appearance]))
  const players = new Map<number, RosterEntry>()

  for (const row of playerGames) {
    const appearance = inScope.get(row.game_key)
    if (!appearance || row.team_key !== teamOf(appearance)) continue

    const when = appearance.game.date_time_utc
    const existing = players.get(row.player_key)
    if (existing) {
      existing.games += 1
      if (when < existing.first) existing.first = when
      if (when > existing.last) existing.last = when
      continue
    }
    players.set(row.player_key, { playerKey: row.player_key, games: 1, first: when, last: when })
  }

  return [...players.values()].sort((a, b) => b.games - a.games || a.playerKey - b.playerKey)
}

/** The team's own key for one appearance, taken from the side it was on. */
function teamOf(appearance: TeamAppearance): number {
  return appearance.side === 'blue'
    ? appearance.game.blue_team_key
    : appearance.game.red_team_key
}

/**
 * The players who appeared in one game for this team.
 *
 * "Current" is defined as the team's most recent game in the current selection:
 * the corpus has no roster table and no contract dates, so the last game is the
 * only evidence of who is on the team right now. A substitution appears as two
 * players in the same role, which is a fact about that game, not an error.
 */
export function rosterOfGame(
  playerGames: PlayerGame[],
  appearance: TeamAppearance | undefined,
): RosterEntry[] {
  if (!appearance) return []
  const team = teamOf(appearance)

  return playerGames
    .filter((row) => row.game_key === appearance.game.game_key && row.team_key === team)
    .map((row) => ({
      playerKey: row.player_key,
      games: 1,
      first: appearance.game.date_time_utc,
      last: appearance.game.date_time_utc,
    }))
    .sort((a, b) => a.playerKey - b.playerKey)
}

export type GameTeamStat = { teamKey: number; games: number; wins: number }

/**
 * Every team in a set of games, with its record.
 *
 * Both sides of every game count, so the games column sums to twice the number of
 * games — which is what makes the event page's team list reconcile with the series
 * below it instead of being a separate claim.
 */
export function teamsOfGames(games: Game[]): GameTeamStat[] {
  const teams = new Map<number, GameTeamStat>()

  const add = (teamKey: number, won: boolean) => {
    if (teamKey === 0) return
    const existing = teams.get(teamKey)
    if (existing) {
      existing.games += 1
      if (won) existing.wins += 1
      return
    }
    teams.set(teamKey, { teamKey, games: 1, wins: won ? 1 : 0 })
  }

  for (const game of games) {
    add(game.blue_team_key, game.blue_win === 1)
    add(game.red_team_key, game.blue_win === 0)
  }

  return [...teams.values()].sort((a, b) => b.games - a.games || a.teamKey - b.teamKey)
}
