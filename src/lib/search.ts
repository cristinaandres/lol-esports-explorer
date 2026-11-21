import { normalise } from './aliases'
import type { AliasKind, AliasRow, Champion, Player, Team } from './types'

/**
 * Finding an entity by any name it has ever had.
 *
 * The index holds one entry per current name and one per alias, so `mad lions`
 * finds Movistar KOI while `movistar koi` finds it too. Alias entries keep the
 * current name for display, which is what lets a result say *formerly MAD Lions*
 * instead of showing a name the reader will not find on the page.
 *
 * One entry per name per entity, not one per row. The bridge can state the same
 * name twice for one entity -- a wiki redirect and a pinned short name are both
 * evidence about the string "100T" -- and two rows for one name would make the
 * result depend on which row the artifact lists first. A name is an abbreviation
 * because someone stated it as one, not because that row happened to arrive first.
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
  const index = new Map<string, SearchEntry>()

  /**
   * Store a name, folding two rows that state the same one into a single entry.
   *
   * The key is the entity and the folded string, because two spellings that differ
   * only in case, accents or spacing are one name here as much as they are in
   * `namesFor`. A short-name row makes the name an abbreviation whether it is read
   * before or after a bridge row, which is the whole point: the artifact orders
   * rows by evidence, and a reader must not see that ordering.
   */
  const add = (entry: SearchEntry) => {
    const key = `${entry.kind}\u0000${entry.id}\u0000${normalise(entry.term)}`
    const existing = index.get(key)
    if (!existing) {
      index.set(key, entry)
      return
    }
    // A name the entity still goes by is described by that, not by its short
    // name: the current spelling wins, and "MVP" is not an abbreviation of MVP.
    const current = existing.current || entry.current
    const spelling = entry.current && !existing.current ? entry : existing
    index.set(key, {
      kind: spelling.kind,
      id: spelling.id,
      name: spelling.name,
      term: spelling.term,
      current,
      abbreviation: !current && (existing.abbreviation || entry.abbreviation),
    })
  }

  for (const player of players) {
    if (!player.player_id) continue
    add({ kind: 'player', id: player.player_id, name: player.player_name, term: player.player_name, current: true, abbreviation: false })
  }
  for (const team of teams) {
    if (!team.team_id) continue
    add({ kind: 'team', id: team.team_id, name: team.team_name, term: team.team_name, current: true, abbreviation: false })
  }
  for (const champion of champions) {
    if (!champion.champion_id) continue
    add({
      kind: 'champion',
      id: champion.champion_id,
      name: champion.champion_name,
      term: champion.champion_name,
      current: true,
      abbreviation: false,
    })
  }

  for (const alias of aliases) {
    add({
      kind: alias.kind,
      id: alias.entity_id,
      name: alias.entity_name,
      term: alias.alias_string,
      current: false,
      abbreviation: alias.evidence === 'shortname',
    })
  }

  return [...index.values()]
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
