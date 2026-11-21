import { describe, expect, it } from 'vitest'

import { namesFor, normalise } from './aliases'
import type { AliasRow } from './types'

/**
 * Fixtures mirror the shape the corpus actually contains most often: an entity
 * whose own name is also an alias row, and a champion whose source spelling
 * carries an HTML entity.
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
  alias({ kind: 'champion', alias_string: 'Nunu &amp; Willump', entity_id: 'ch-nunu', entity_name: 'Nunu & Willump', valid_from: '2011-06-18', valid_to: '2025-06-30' }),
  alias({ kind: 'champion', alias_string: 'Nunu', entity_id: 'ch-nunu', entity_name: 'Nunu & Willump', valid_from: '2009-02-21', valid_to: null }),
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

  it('treats the current name with an HTML entity in it as the same name', () => {
    // The bridge carries "Nunu &amp; Willump" against the entity "Nunu & Willump".
    // Raw string equality calls those different and would print the current name
    // as a former one.
    const rows = namesFor(bridge, 'champion', 'ch-nunu').map((row) => row.alias_string)
    expect(rows).toEqual(['Nunu'])
  })

  it('leaves undated redirects out of the list a page would print', () => {
    const names = namesFor(bridge, 'team', 'tm-koi').map((row) => row.alias_string)
    expect(names).not.toContain('MKOI')
  })

  it('returns an empty list for an entity that never had another name', () => {
    expect(namesFor([alias({ alias_string: 'Splyce', entity_id: 'tm-x', entity_name: 'Splyce' })], 'team', 'tm-x')).toEqual([])
  })

  it('collapses spellings that differ only in case', () => {
    const rows = namesFor(bridge, 'team', 'tm-koi').map((row) => row.alias_string)
    const rows2 = namesFor(
      [alias({ alias_string: 'beBe', valid_from: '2013-01-01' }), alias({ alias_string: 'BeBe', valid_from: '2014-01-01' })],
      'team',
      'tm-koi',
    ).map((row) => row.alias_string)
    expect(rows2).toEqual(['beBe'])
    expect(rows).toEqual(['Splyce', 'MAD Lions', 'MAD Lions KOI'])
  })

  it('does not mix kinds', () => {
    expect(namesFor(bridge, 'player', 'tm-koi')).toEqual([])
  })
})
