import type { Game, PlayerGame } from './types'

/**
 * One player's career, summed.
 *
 * The rule the whole site is built on applies here more sharply than anywhere
 * else: a measure is only as good as the rows that state it. Damage is recorded
 * on 15,870 of the 30,910 player rows, so a damage average is not "damage divided
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
  /** Sum divided by measured, or null when nothing was measured. */
  average: number | null
  /**
   * The earliest game on which this measure is stated, or null.
   *
   * Damage is recorded on 0% of the corpus before 2020 and on 100% from 2021, so
   * a career average is measured over a window, not over the whole career. The
   * page says which window instead of leaving the reader to wonder.
   */
  firstMeasured: string | null
}

export type EntityStat = { key: number; games: number; wins: number }

/**
 * A champion, in the role it was played in.
 *
 * 58 player-champion pairs in the corpus were played in two roles -- Perkz on
 * Kai'Sa mid and bot, Bwipo on Ornn bot and top -- so a champion is keyed by role
 * as well as by itself. Collapsing the two would merge two different jobs into one
 * win rate.
 */
export type ChampionStat = EntityStat & { role: string }

export type RoleStat = { role: string; games: number }

export type EventStat = { eventKey: number; games: number; wins: number; first: string }

/** One game a player appeared in, with what a filter needs to narrow it. */
export type Appearance = {
  game: Game
  row: PlayerGame
  /** The canonical competition of the game's event: 'Worlds', 'MSI', ... */
  competition: string
}

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
  champions: ChampionStat[]
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
    cs: { sum: 0, measured: 0, average: null, firstMeasured: null },
    gold: { sum: 0, measured: 0, average: null, firstMeasured: null },
    damage: { sum: 0, measured: 0, average: null, firstMeasured: null },
    vision: { sum: 0, measured: 0, average: null, firstMeasured: null },
  },
  champions: [],
  teams: [],
  roles: [],
  eras: [],
  firstGame: null,
  lastGame: null,
}

/**
 * The games a player appeared in, oldest first, each with its competition.
 *
 * Splitting this out from the summary is what makes filtering honest: a filter
 * narrows this list, and the summary is then computed over what is left, so no
 * figure can be reported over a set the page is not showing.
 */
export function appearancesFor(
  games: Game[],
  rows: PlayerGame[],
  playerKey: number,
  competitions: Map<number, string> = new Map(),
): Appearance[] {
  const byKey = new Map(games.map((game) => [game.game_key, game]))

  return rows
    .filter((row) => row.player_key === playerKey)
    .flatMap((row) => {
      const game = byKey.get(row.game_key)
      if (!game) return []
      return [{ game, row, competition: competitions.get(game.event_key) ?? 'Unknown' }]
    })
    .sort((a, b) => a.game.date_time_utc.localeCompare(b.game.date_time_utc))
}

export function careerFrom(appearances: Appearance[]): Career {
  if (appearances.length === 0) return EMPTY

  let kills = 0
  let deaths = 0
  let assists = 0
  let wins = 0

  const measures = {
    cs: { sum: 0, measured: 0, average: null as number | null, firstMeasured: null as string | null },
    gold: { sum: 0, measured: 0, average: null as number | null, firstMeasured: null as string | null },
    damage: { sum: 0, measured: 0, average: null as number | null, firstMeasured: null as string | null },
    vision: { sum: 0, measured: 0, average: null as number | null, firstMeasured: null as string | null },
  }

  const champions = new Map<string, ChampionStat>()
  const teams = new Map<number, EntityStat>()
  const roles = new Map<string, number>()
  const eraFirst = new Map<string, string>()

  for (const { row, game } of appearances) {
    const victory = won(game, row)

    kills += row.kills
    deaths += row.deaths
    assists += row.assists
    if (victory) wins += 1

    for (const key of ['cs', 'gold', 'damage', 'vision'] as const) {
      const value = row[key]
      if (value === null) continue
      measures[key].sum += value
      measures[key].measured += 1
      // Appearances are sorted by date, so the first stated value is the earliest.
      measures[key].firstMeasured ??= game.date_time_utc
    }

    bumpChampion(champions, row.role, row.champion_key, victory)
    bump(teams, row.team_key, victory)
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
    champions: [...champions.values()].sort(
      (a, b) => b.games - a.games || a.role.localeCompare(b.role) || a.key - b.key,
    ),
    teams: sortStats(teams),
    roles: [...roles.entries()]
      .map(([role, count]) => ({ role, games: count }))
      .sort((a, b) => b.games - a.games || a.role.localeCompare(b.role)),
    eras: [...eraFirst.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([era]) => era),
    firstGame: appearances[0]!.game.date_time_utc,
    lastGame: appearances[appearances.length - 1]!.game.date_time_utc,
  }
}

/**
 * How many games a champion needs before its win rate may rank it.
 *
 * Below this the page still lists the champion, in its own group, because the
 * win rate of one game is not a rate: it is that game. The same threshold that
 * phase 4 applies to a head-to-head applies here.
 */
export const MIN_GAMES_FOR_RATE = 5

/**
 * Win rate first, then games played, then key so the order is total.
 *
 * The rate is compared as the whole percentage the page prints, not as the raw
 * fraction. Two champions shown as "83%" must not be ordered by a difference the
 * reader cannot see: 5/6 is 83.3% and 34/41 is 82.9%, so ranking on the second
 * decimal would put the smaller sample first while both read "83%".
 */
export function rankByWinRate<T extends EntityStat>(stats: T[]): T[] {
  const rate = (stat: EntityStat) =>
    stat.games === 0 ? 0 : Math.round((stat.wins / stat.games) * 100)
  return [...stats].sort((a, b) => rate(b) - rate(a) || b.games - a.games || a.key - b.key)
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

function bumpChampion(
  target: Map<string, ChampionStat>,
  role: string,
  key: number,
  victory: boolean,
): void {
  const id = `${role}|${key}`
  const existing = target.get(id)
  if (existing) {
    existing.games += 1
    if (victory) existing.wins += 1
    return
  }
  target.set(id, { key, role, games: 1, wins: victory ? 1 : 0 })
}

/** Most played first, then by key, so the order never depends on insertion. */
function sortStats(stats: Map<number, EntityStat>): EntityStat[] {
  return [...stats.values()].sort((a, b) => b.games - a.games || a.key - b.key)
}

/**
 * The events a career covers, newest first.
 *
 * An event is not a filter here but a unit the reader thinks in: "which
 * competitions has this player been to" is a different question from "how many
 * games", and the page answers both.
 */
export function eventsOf(appearances: Appearance[]): EventStat[] {
  const events = new Map<number, EventStat>()

  for (const appearance of appearances) {
    const key = appearance.game.event_key
    const when = appearance.game.date_time_utc
    const won = appearance.row.side === 'blue' ? appearance.game.blue_win === 1 : appearance.game.blue_win === 0
    const existing = events.get(key)
    if (existing) {
      existing.games += 1
      if (won) existing.wins += 1
      if (when < existing.first) existing.first = when
      continue
    }
    events.set(key, { eventKey: key, games: 1, wins: won ? 1 : 0, first: when })
  }

  return [...events.values()].sort((a, b) => b.first.localeCompare(a.first))
}

/**
 * How many games "recent form" looks at.
 *
 * A reading habit, not a query: ten is about how much a viewer remembers of a team
 * they watch weekly. It is a constant so the page cannot quietly disagree with
 * itself about what recent means.
 */
export const RECENT_FORM = 10

/** The last N appearances in the current selection, newest first. */
export function recentForm(appearances: Appearance[], limit = RECENT_FORM): Appearance[] {
  return appearances.slice(-limit).reverse()
}

export type RoleSplit = {
  role: string
  career: Career
}

/**
 * A career split by role, ordered by games.
 *
 * 68 of the 1,140 players in the corpus played in more than one role, and averaging
 * them together describes nobody: Perkz reads as one 173-game career instead of 119
 * mid and 54 bot.
 */
export function byRole(appearances: Appearance[]): RoleSplit[] {
  const groups = new Map<string, Appearance[]>()

  for (const appearance of appearances) {
    const bucket = groups.get(appearance.row.role)
    if (bucket) bucket.push(appearance)
    else groups.set(appearance.row.role, [appearance])
  }

  return [...groups.entries()]
    .map(([role, rows]) => ({ role, career: careerFrom(rows) }))
    .sort((a, b) => b.career.games - a.career.games || a.role.localeCompare(b.role))
}
