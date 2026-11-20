import type { Game, PlayerGame } from './types'

/**
 * One player's career, summed.
 *
 * The rule the whole site is built on applies here more sharply than anywhere
 * else: a measure is only as good as the rows that state it. Damage is recorded
 * on 15,910 of the 30,910 player rows, so a damage average is not "damage divided
 * by games" -- that would divide by games the source never measured. Every
 * measure therefore carries its own denominator, and the page prints both.
 *
 * Nothing here reads polarity of side as strength: a win is the player's side
 * matching the game's winning side, whatever that side happens to be.
 */

export type MeasureSummary = {
  sum: number
  /** How many appearances state this measure. Never assume it equals games. */
  measured: number
  /** Sum divided by `measured`, or null when nothing was measured. */
  average: number | null
}

export type EntityStat = { key: number; games: number; wins: number }
export type RoleStat = { role: string; games: number }

export type Career = {
  games: number
  wins: number
  losses: number
  kills: number
  deaths: number
  assists: number
  /** (kills + assists) / max(1, deaths), summed first and then divided. */
  kda: number | null
  /** Per-game averages of kills, deaths and assists; they are stated on every row. */
  averages: { kills: number | null; deaths: number | null; assists: number | null }
  /** The measures that can be absent, each with the rows that state it. */
  measures: { cs: MeasureSummary; gold: MeasureSummary; damage: MeasureSummary; vision: MeasureSummary }
  champions: EntityStat[]
  teams: EntityStat[]
  roles: RoleStat[]
  /** Distinct eras the player appears in, oldest first. */
  eras: string[]
  firstGame: string | null
  lastGame: string | null
}

const EMPTY: Career = {
  games: 0,
  wins: 0,
  losses: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  kda: null,
  averages: { kills: null, deaths: null, assists: null },
  measures: {
    cs: { sum: 0, measured: 0, average: null },
    gold: { sum: 0, measured: 0, average: null },
    damage: { sum: 0, measured: 0, average: null },
    vision: { sum: 0, measured: 0, average: null },
  },
  champions: [],
  teams: [],
  roles: [],
  eras: [],
  firstGame: null,
  lastGame: null,
}

export function careerFor(games: Game[], rows: PlayerGame[], playerKey: number): Career {
  const byKey = new Map(games.map((game) => [game.game_key, game]))

  const appearances = rows
    .filter((row) => row.player_key === playerKey)
    .flatMap((row) => {
      const game = byKey.get(row.game_key)
      return game ? [{ row, game }] : []
    })
    .sort((a, b) => a.game.date_time_utc.localeCompare(b.game.date_time_utc))

  if (appearances.length === 0) return EMPTY

  let kills = 0
  let deaths = 0
  let assists = 0
  let wins = 0

  const measures = {
    cs: { sum: 0, measured: 0, average: null as number | null },
    gold: { sum: 0, measured: 0, average: null as number | null },
    damage: { sum: 0, measured: 0, average: null as number | null },
    vision: { sum: 0, measured: 0, average: null as number | null },
  }

  const champions = new Map<number, EntityStat>()
  const teams = new Map<number, EntityStat>()
  const roles = new Map<string, number>()
  const eraFirst = new Map<string, string>()

  for (const { row, game } of appearances) {
    kills += row.kills
    deaths += row.deaths
    assists += row.assists
    if (won(game, row)) wins += 1

    for (const key of ['cs', 'gold', 'damage', 'vision'] as const) {
      const value = row[key]
      if (value === null) continue
      measures[key].sum += value
      measures[key].measured += 1
    }

    bump(champions, row.champion_key, won(game, row))
    bump(teams, row.team_key, won(game, row))
    roles.set(row.role, (roles.get(row.role) ?? 0) + 1)

    const seen = eraFirst.get(game.era)
    if (!seen || game.date_time_utc < seen) eraFirst.set(game.era, game.date_time_utc)
  }

  for (const measure of Object.values(measures)) {
    measure.average = measure.measured > 0 ? measure.sum / measure.measured : null
  }

  const between = appearances.length
  const total = kills + assists

  return {
    games: between,
    wins,
    losses: between - wins,
    kills,
    deaths,
    assists,
    kda: total / Math.max(1, deaths),
    averages: {
      kills: kills / between,
      deaths: deaths / between,
      assists: assists / between,
    },
    measures,
    champions: sortStats(champions),
    teams: sortStats(teams),
    roles: [...roles.entries()]
      .map(([role, count]) => ({ role, games: count }))
      .sort((a, b) => b.games - a.games || a.role.localeCompare(b.role)),
    eras: [...eraFirst.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([era]) => era),
    firstGame: appearances[0]!.game.date_time_utc,
    lastGame: appearances[appearances.length - 1]!.game.date_time_utc,
  }
}

/** A win is the player's side matching the side the game records as winning. */
function won(game: Game, row: PlayerGame): boolean {
  return row.side === 'blue' ? game.blue_win === 1 : game.blue_win === 0
}

function bump(target: Map<number, EntityStat>, key: number, victory: boolean): void {
  const existing = target.get(key)
  if (existing) {
    existing.games += 1
    if (victory) existing.wins += 1
    return
  }
  target.set(key, { key, games: 1, wins: victory ? 1 : 0 })
}

/** Most played first, then by key, so the order never depends on insertion. */
function sortStats(stats: Map<number, EntityStat>): EntityStat[] {
  return [...stats.values()].sort((a, b) => b.games - a.games || a.key - b.key)
}
