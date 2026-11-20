import { normalise } from './aliases'
import type { AliasKind, AliasRow, Champion, Player, Team } from './types'

/**
 * Finding an entity by any name it has ever had.
 *
 * The index holds one entry per current name and one per alias, so `mad lions`
 * finds Movistar KOI while `movistar koi` finds it too. Alias entries keep the
 * current name for display, which is what lets a result say *formerly MAD Lions*
 * instead of showing a name the reader will not find on the page.
 */

export type SearchEntry = {
  kind: AliasKind
  /** The natural id, which is what the route needs. */
  id: string
  /** The name the entity is known by today. */
  name: string
  /** The string this entry matches on. */
  term: string
  /** False when the term is an alias rather than the current name. */
  current: boolean
  /**
   * True when the term is the abbreviation the game client shows, not a name the
   * entity used to have. "KC" is not a former name of Karmine Corp; it is the same
   * name, shortened, so a result must not say "formerly KC".
   */
  abbreviation: boolean
}

export type SearchResult = {
  kind: AliasKind
  id: string
  name: string
  /** The alias that matched, when it was not the current name. */
  matched: string
  current: boolean
  abbreviation: boolean
}

export function buildSearchIndex(
  players: Player[],
  teams: Team[],
  champions: Champion[],
  aliases: AliasRow[],
): SearchEntry[] {
  const index: SearchEntry[] = []

  for (const player of players) {
    if (!player.player_id) continue
    index.push({ kind: 'player', id: player.player_id, name: player.player_name, term: player.player_name, current: true, abbreviation: false })
  }
  for (const team of teams) {
    if (!team.team_id) continue
    index.push({ kind: 'team', id: team.team_id, name: team.team_name, term: team.team_name, current: true, abbreviation: false })
  }
  for (const champion of champions) {
    if (!champion.champion_id) continue
    index.push({
      kind: 'champion',
      id: champion.champion_id,
      name: champion.champion_name,
      term: champion.champion_name,
      current: true,
      abbreviation: false,
    })
  }

  for (const alias of aliases) {
    index.push({
      kind: alias.kind,
      id: alias.entity_id,
      name: alias.entity_name,
      term: alias.alias_string,
      current: false,
      abbreviation: alias.evidence === 'shortname',
    })
  }

  return index
}

/**
 * Rank a query: exact, then prefix, then anywhere in the string.
 *
 * A current name beats an alias at the same rank, because the page a reader lands
 * on is titled with the current name and an alias hit should not outrank the thing
 * it is an alias of.
 */
function rank(entry: SearchEntry, needle: string): number {
  const term = normalise(entry.term)
  if (term === needle) return entry.current ? 0 : 1
  if (term.startsWith(needle)) return entry.current ? 2 : 3
  if (term.includes(needle)) return entry.current ? 4 : 5
  return Number.POSITIVE_INFINITY
}

/**
 * Results for a query, grouped later by the caller.
 *
 * One entry per entity: a team whose current name and an alias both match appears
 * once, with the best match kept. An empty query returns nothing rather than
 * everything, because a search box that lists the world on focus is a directory,
 * not a search.
 */
export function search(index: SearchEntry[], query: string, limit = 10): SearchResult[] {
  const needle = normalise(query)
  if (needle.length === 0) return []

  const best = new Map<string, { entry: SearchEntry; rank: number }>()

  for (const entry of index) {
    const score = rank(entry, needle)
    if (!Number.isFinite(score)) continue
    const key = `${entry.kind}:${entry.id}`
    const existing = best.get(key)
    if (!existing || score < existing.rank) best.set(key, { entry, rank: score })
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.entry.kind.localeCompare(b.entry.kind) ||
        a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, limit)
    .map(({ entry }) => ({
      kind: entry.kind,
      id: entry.id,
      name: entry.name,
      matched: entry.term,
      current: entry.current,
      abbreviation: entry.abbreviation,
    }))
}

/** The route for a result. */
export function resultPath(result: SearchResult): string {
  const prefix = result.kind === 'player' ? 'players' : result.kind === 'team' ? 'teams' : 'champions'
  return `/${prefix}/${result.id}`
}
