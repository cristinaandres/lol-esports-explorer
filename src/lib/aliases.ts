import type { AliasKind, AliasRow } from './types'

/**
 * The alias bridge, read: the names an entity played under.
 *
 * Only the ones the source dates. An entity with no dated former name returns an
 * empty list, not its own current name and not a list of wiki redirects.
 *
 * The other question the bridge answers -- which entity a typed string names --
 * belongs to `search.ts`, which builds one index over current names and aliases
 * and searches it. A second exact-name lookup here would answer the same
 * question quietly, with a different ranking.
 */

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
 * as" does not need to repeat its title, and that name is the page's heading. The
 * comparison is on the normalised form, not the raw string: the bridge carries
 * "Nunu &amp; Willump" against the entity name "Nunu & Willump", which is the same
 * name with an HTML entity left in it, and a raw comparison would print it as a
 * former name. Accents and case fold for the same reason -- a name that changed
 * only in its diacritics did not change.
 *
 * Undated redirects are excluded too: they are searchable, but a team page listing
 * nine spellings of its name stops being a page about the team.
 */
export function namesFor(aliases: AliasRow[], kind: AliasKind, entityId: string): AliasRow[] {
  const seen = new Set<string>()

  return aliases
    .filter((row) => row.kind === kind && row.entity_id === entityId)
    .filter((row) => normalise(row.alias_string) !== normalise(row.entity_name))
    .filter((row) => row.valid_from !== null)
    .sort((a, b) => (a.valid_from ?? '').localeCompare(b.valid_from ?? ''))
    .filter((row) => {
      // The bridge lists "BeBe", "bebe" and "bebe (Chang Bo-Wei)" as three dated
      // names. Two of those are the same name, so the list a page prints collapses
      // them; the first window is the one kept, because it is the earliest the
      // name is dated.
      const key = normalise(row.alias_string)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

