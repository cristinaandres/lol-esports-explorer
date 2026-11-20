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

export function championRecord(
  games: Game[],
  playerGames: PlayerGame[],
  bans: DraftSlot[],
  championKey: number,
): ChampionRecord {
  const byKey = new Map(games.map((game) => [game.game_key, game]))

  const eras = new Map<string, { games: number; from: string }>()
  for (const game of games) {
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
    games: games.length,
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
