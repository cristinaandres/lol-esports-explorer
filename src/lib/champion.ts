import type { DraftSlot, Game, PlayerGame } from './types'

/**
 * A champion's record, era by era.
 *
 * The denominator is the games played in the era, not the games where the champion
 * appears: "picked in 120 of 1,325 games" is a presence rate, while "picked in 120
 * of 120" would only say it was always picked by someone. A champion released
 * mid-corpus therefore shows no presence before its first game, which is correct
 * and is not the same fact as zero.
 */

export type ChampionEra = {
  era: string
  /** Games played in the era, whatever the champion did. The denominator. */
  games: number
  /** Distinct games in which this champion was picked. */
  picked: number
  /** Distinct games in which this champion was banned. */
  banned: number
  /** Games where it was picked and the picking side won. */
  won: number
  /** Earliest game of the era in the corpus, for ordering. */
  from: string
}

export type ChampionRecord = {
  games: number
  picked: number
  banned: number
  won: number
  firstPicked: string | null
  eras: ChampionEra[]
}

/**
 * @param since  The champion's release date, `YYYY-MM-DD`. Games before it are
 *   excluded from every figure, denominator included: a champion cannot be picked
 *   before it exists, so counting those games would report a presence rate the
 *   champion was never eligible for. Pass null when the date is unknown and the
 *   caller accepts the whole corpus as the denominator.
 */
export function championRecord(
  games: Game[],
  playerGames: PlayerGame[],
  bans: DraftSlot[],
  championKey: number,
  since: string | null = null,
): ChampionRecord {
  const eligible = since
    ? games.filter((game) => game.date_time_utc.slice(0, 10) >= since)
    : games
  const byKey = new Map(eligible.map((game) => [game.game_key, game]))

  const eras = new Map<string, { games: number; from: string }>()
  for (const game of eligible) {
    const created = eras.get(game.era)
    if (!created) {
      eras.set(game.era, { games: 1, from: game.date_time_utc })
      continue
    }
    created.games += 1
    if (game.date_time_utc < created.from) created.from = game.date_time_utc
  }

  const pickedByEra = new Map<string, Set<number>>()
  const bannedByEra = new Map<string, Set<number>>()
  const wonByEra = new Map<string, Set<number>>()

  let firstPicked: string | null = null

  for (const row of playerGames) {
    if (row.champion_key !== championKey) continue
    const game = byKey.get(row.game_key)
    if (!game) continue

    add(pickedByEra, game.era, row.game_key)
    const won = row.side === 'blue' ? game.blue_win === 1 : game.blue_win === 0
    if (won) add(wonByEra, game.era, row.game_key)
    if (!firstPicked || game.date_time_utc < firstPicked) firstPicked = game.date_time_utc
  }

  for (const slot of bans) {
    if (slot.champion_key !== championKey) continue
    const game = byKey.get(slot.game_key)
    if (!game) continue
    add(bannedByEra, game.era, slot.game_key)
  }

  const rows: ChampionEra[] = [...eras.entries()]
    .map(([era, meta]) => {
      const picked = pickedByEra.get(era)?.size ?? 0
      return {
        era,
        games: meta.games,
        from: meta.from,
        picked,
        banned: bannedByEra.get(era)?.size ?? 0,
        won: wonByEra.get(era)?.size ?? 0,
      }
    })
    .sort((a, b) => a.from.localeCompare(b.from))

  const picked = rows.reduce((total, era) => total + era.picked, 0)
  const banned = rows.reduce((total, era) => total + era.banned, 0)

  return {
    games: eligible.length,
    picked,
    banned,
    won: rows.reduce((total, era) => total + era.won, 0),
    firstPicked,
    eras: rows,
  }
}

/**
 * Games in which the champion appeared at all: picked or banned.
 *
 * An era figure is the sum of both, but the two are also reported apart, because a
 * champion banned in most of its games was respected, not played.
 */
export function presenceOf(era: ChampionEra): number {
  return era.picked + era.banned
}

function add(target: Map<string, Set<number>>, era: string, gameKey: number): void {
  const bucket = target.get(era)
  if (bucket) bucket.add(gameKey)
  else target.set(era, new Set([gameKey]))
}

export type ChampionUser = { key: number; games: number; wins: number }

/**
 * Who picks this champion.
 *
 * Players only. The teams that picked it are already on every game page that fields
 * it, and a list of them answered a question nobody asked: who plays a champion is a
 * question about players.
 */
export function championPlayers(
  games: Game[],
  playerGames: PlayerGame[],
  championKey: number,
): ChampionUser[] {
  const byKey = new Map(games.map((game) => [game.game_key, game]))
  const players = new Map<number, ChampionUser>()

  for (const row of playerGames) {
    if (row.champion_key !== championKey) continue
    const game = byKey.get(row.game_key)
    if (!game) continue
    bump(players, row.player_key, row.side === 'blue' ? game.blue_win === 1 : game.blue_win === 0)
  }

  return [...players.values()].sort((a, b) => b.games - a.games || a.key - b.key)
}

function bump(target: Map<number, ChampionUser>, key: number, won: boolean): void {
  const existing = target.get(key)
  if (existing) {
    existing.games += 1
    if (won) existing.wins += 1
    return
  }
  target.set(key, { key, games: 1, wins: won ? 1 : 0 })
}

export type ChampionRoleStat = {
  role: string
  picks: number
  wins: number
  kills: number
  deaths: number
  assists: number
}

/**
 * The roles a champion is picked in, with the figures that make the difference mean
 * something.
 *
 * A role count alone says "it was played mid 293 times"; it does not say whether it
 * won there. A champion played in two roles is two answers to where it fits, and the
 * site already splits a player's career that way — the champion page should read the
 * same.
 */
export function championRoleStats(
  games: Game[],
  playerGames: PlayerGame[],
  championKey: number,
): ChampionRoleStat[] {
  const byKey = new Map(games.map((game) => [game.game_key, game]))
  const roles = new Map<string, ChampionRoleStat>()

  for (const row of playerGames) {
    if (row.champion_key !== championKey) continue
    const game = byKey.get(row.game_key)
    if (!game) continue

    const won = row.side === 'blue' ? game.blue_win === 1 : game.blue_win === 0
    const entry = roles.get(row.role) ?? {
      role: row.role,
      picks: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    }
    entry.picks += 1
    if (won) entry.wins += 1
    entry.kills += row.kills
    entry.deaths += row.deaths
    entry.assists += row.assists
    roles.set(row.role, entry)
  }

  return [...roles.values()].sort((a, b) => b.picks - a.picks || a.role.localeCompare(b.role))
}

/** KDA for one role, summed first and divided once, floored at one death. */
export function roleKda(entry: ChampionRoleStat): number {
  return (entry.kills + entry.assists) / Math.max(1, entry.deaths)
}
