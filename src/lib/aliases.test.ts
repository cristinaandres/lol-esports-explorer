import { describe, expect, it } from 'vitest'

import { indexByName, namesFor, normalise, resolve } from './aliases'
import type { AliasRow } from './types'

/**
 * Fixtures mirror the shapes the corpus actually contains, including the two that
 * are easiest to get wrong: an entity whose own name is also an alias row, and one
 * string that names two different entities.
 */

function alias(overrides: Partial<AliasRow> = {}): AliasRow {
  return {
    kind: 'team',
    alias_string: 'MAD Lions',
    entity_id: 'tm-koi',
    entity_name: 'Movistar KOI',
    valid_from: '2020-09-25',
    valid_to: '2023-10-26',
    evidence: 'registry;redirect;observed',
    ...overrides,
  }
}

const bridge: AliasRow[] = [
  alias({ alias_string: 'Movistar KOI', valid_from: '2025-07-03', valid_to: '2026-10-31' }),
  alias({ alias_string: 'MAD Lions' }),
  alias({ alias_string: 'MAD Lions KOI', valid_from: '2024-09-25', valid_to: '2024-10-07' }),
  alias({ alias_string: 'MKOI', valid_from: null, valid_to: null, evidence: 'redirect' }),
  alias({ alias_string: 'Splyce', valid_from: '2016-09-30', valid_to: '2019-10-27' }),
  alias({
    kind: 'team',
    alias_string: 'MAD Team',
    entity_id: 'tm-mad',
    entity_name: 'MAD Team',
    valid_from: '2018-07-05',
    valid_to: '2019-07-06',
  }),
  alias({ kind: 'champion', alias_string: 'Nunu &amp; Willump', entity_id: 'ch-nunu', entity_name: 'Nunu & Willump', valid_from: '2011-06-18', valid_to: '2025-06-30' }),
  alias({ kind: 'player', alias_string: 'APA', entity_id: 'pl-apa', entity_name: 'APA', valid_from: null, valid_to: null }),
  alias({ kind: 'player', alias_string: 'APA', entity_id: 'pl-frozen', entity_name: 'Frozen', valid_from: null, valid_to: null }),
]

describe('normalise', () => {
  it('folds case and spacing', () => {
    expect(normalise('  MAD   Lions ')).toBe('mad lions')
  })

  it('folds accents, so a typed name matches a spelled one', () => {
    expect(normalise('Jankos')).toBe(normalise('Jankós'))
  })

  it('repairs the HTML entity the source left in a champion name', () => {
    expect(normalise('Nunu &amp; Willump')).toBe(normalise('Nunu & Willump'))
  })
})

describe('resolve', () => {
  it('finds the entity a name belongs to', () => {
    expect(resolve(bridge, 'MAD Lions')).toEqual([
      {
        kind: 'team',
        entityId: 'tm-koi',
        entityName: 'Movistar KOI',
        matched: 'MAD Lions',
        stated: true,
      },
    ])
  })

  it('ignores case and spacing, because nobody types a name exactly', () => {
    expect(resolve(bridge, '  mad lions  ')[0]?.entityId).toBe('tm-koi')
  })

  it('keeps two organisations apart even when their names rhyme', () => {
    expect(resolve(bridge, 'MAD Team')[0]?.entityId).toBe('tm-mad')
    expect(resolve(bridge, 'MAD Lions')[0]?.entityId).not.toBe('tm-mad')
  })

  it('returns every match when one string names two entities', () => {
    const matches = resolve(bridge, 'APA')
    expect(matches.map((match) => match.entityId).sort()).toEqual(['pl-apa', 'pl-frozen'])
  })

  it('prefers the dated row when a redirect and a rename reach the same entity', () => {
    const withRedirect: AliasRow[] = [
      alias({ alias_string: 'MKOI', valid_from: '2025-01-01', valid_to: '2025-06-01' }),
      alias({ alias_string: 'MKOI', valid_from: null, valid_to: null }),
    ]
    expect(resolve(withRedirect, 'MKOI')[0]?.stated).toBe(true)
  })

  it('matches a name with no stated window, because search must find it', () => {
    expect(resolve(bridge, 'MKOI')[0]?.entityId).toBe('tm-koi')
    expect(resolve(bridge, 'MKOI')[0]?.stated).toBe(false)
  })

  it('returns nothing for an empty query rather than everything', () => {
    expect(resolve(bridge, '')).toEqual([])
    expect(resolve(bridge, '   ')).toEqual([])
  })

  it('returns nothing for a name the bridge does not know', () => {
    expect(resolve(bridge, 'Fnatic')).toEqual([])
  })
})

describe('namesFor', () => {
  it('lists the dated names an entity played under, oldest first', () => {
    expect(namesFor(bridge, 'team', 'tm-koi').map((row) => row.alias_string)).toEqual([
      'Splyce',
      'MAD Lions',
      'MAD Lions KOI',
    ])
  })

  it('never repeats the entity’s own current name', () => {
    const names = namesFor(bridge, 'team', 'tm-koi').map((row) => row.alias_string)
    expect(names).not.toContain('Movistar KOI')
  })

  it('leaves undated redirects out of the list a page would print', () => {
    const names = namesFor(bridge, 'team', 'tm-koi').map((row) => row.alias_string)
    expect(names).not.toContain('MKOI')
  })

  it('returns an empty list for an entity that never had another name', () => {
    expect(namesFor([alias({ alias_string: 'Splyce', entity_id: 'tm-x', entity_name: 'Splyce' })], 'team', 'tm-x')).toEqual([])
  })

  it('does not mix kinds', () => {
    expect(namesFor(bridge, 'player', 'tm-koi')).toEqual([])
  })
})

describe('indexByName', () => {
  it('groups rows by the normalised name, keeping collisions together', () => {
    const index = indexByName(bridge)
    expect(index.get('apa')).toHaveLength(2)
    expect(index.get('mad lions')).toHaveLength(1)
  })
})
