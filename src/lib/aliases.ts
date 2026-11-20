import type { AliasKind, AliasRow } from './types'

/**
 * The alias bridge, read.
 *
 * Two questions, and the difference between them is the whole point of this
 * module:
 *
 *  - **Which names did this entity play under?** Only the ones the source dates.
 *    An entity with no dated former name returns an empty list, not its own
 *    current name and not a list of wiki redirects.
 *  - **Which entity does this typed string belong to?** Every row counts here,
 *    redirects included, and the answer is a list because a name can be shared
 *    ("APA" names two different players in this corpus).
 *
 * The bridge itself carries 3,791 rows for 1,554 entities, so neither answer can
 * be read straight off a scan of the table: both are indexed once by the caller.
 */

export type Resolution = {
  kind: AliasKind
  entityId: string
  entityName: string
  /** The alias string that matched, spelled as the source spells it. */
  matched: string
  /** True when the source states a window in which the name was in use. */
  stated: boolean
}

/**
 * Fold a name to a comparison key.
 *
 * Case, accents, repeated spaces and the HTML entity the source left in one
 * champion's name ("Nunu &amp; Willump") all vary between a page title and what a
 * person types, and none of that variation is meaningful.
 */
export function normalise(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The names an entity is known to have played under, oldest first.
 *
 * The entity's own current name is excluded, because a page that lists "also known
 * as" does not need to repeat its title. Undated redirects are excluded too: they
 * are searchable, but a team page listing nine spellings of its name stops being a
 * page about the team.
 */
export function namesFor(aliases: AliasRow[], kind: AliasKind, entityId: string): AliasRow[] {
  return aliases
    .filter((row) => row.kind === kind && row.entity_id === entityId)
    .filter((row) => row.alias_string !== row.entity_name)
    .filter((row) => row.valid_from !== null)
    .sort((a, b) => (a.valid_from ?? '').localeCompare(b.valid_from ?? ''))
}

/**
 * Every entity a typed string names.
 *
 * Returns a list, and an empty one for an empty query. When the same string
 * reaches one entity through a redirect and through a dated rename, the dated row
 * wins, because that is the one a reader can be shown.
 */
export function resolve(aliases: AliasRow[], query: string): Resolution[] {
  const needle = normalise(query)
  if (!needle) return []

  const found = new Map<string, Resolution>()
  for (const row of aliases) {
    if (normalise(row.alias_string) !== needle) continue
    const key = `${row.kind}:${row.entity_id}`
    const stated = row.valid_from !== null
    const existing = found.get(key)
    if (existing && (existing.stated || !stated)) continue
    found.set(key, {
      kind: row.kind,
      entityId: row.entity_id,
      entityName: row.entity_name,
      matched: row.alias_string,
      stated,
    })
  }

  return [...found.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.entityName.localeCompare(b.entityName),
  )
}

/** Group rows by the entity they describe, so a page can index the bridge once. */
export function indexByName(aliases: AliasRow[]): Map<string, AliasRow[]> {
  const index = new Map<string, AliasRow[]>()
  for (const row of aliases) {
    const key = normalise(row.alias_string)
    const bucket = index.get(key)
    if (bucket) bucket.push(row)
    else index.set(key, [row])
  }
  return index
}
