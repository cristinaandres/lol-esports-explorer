import { describe, expect, it } from 'vitest'

import { buildSearchIndex, resultPath, search } from './search'
import type { AliasRow, Champion, Player, Team } from './types'

const players: Player[] = [
  { player_key: 1, player_id: 'pl-apa', player_name: 'APA', overview_page: '', games: 0, primary_role: 'Mid', last_team_key: 0, last_game_year: null },
  { player_key: 2, player_id: 'pl-frozen', player_name: 'Frozen', overview_page: '', games: 0, primary_role: 'Mid', last_team_key: 0, last_game_year: null },
]
const teams: Team[] = [
  { team_key: 1, team_id: 'tm-koi', team_name: 'Movistar KOI', overview_page: '', region: 'EMEA', games: 0, short_name: 'KOI' },
  { team_key: 2, team_id: 'tm-mad', team_name: 'MAD Team', overview_page: '', region: 'LMS', games: 0, short_name: null },
  // "illum" prefixes this name and sits inside "Nunu & Willump", so one query
  // reaches both ranks and the order between them can be asserted.
  { team_key: 3, team_id: 'tm-illum', team_name: 'Illuminar Gaming', overview_page: '', region: 'EMEA', games: 0, short_name: null },
]
const champions: Champion[] = [
  { champion_key: 1, champion_id: 'ch-nunu', champion_name: 'Nunu & Willump', riot_key: 20, games: 0, release_date: '2009-02-21', primary_role: 'Mid' },
]

const aliases: AliasRow[] = [
  {
    kind: 'team',
    alias_string: 'MAD Lions',
    entity_id: 'tm-koi',
    entity_name: 'Movistar KOI',
    valid_from: '2020-09-25',
    valid_to: '2023-10-26',
    evidence: 'registry',
  },
  {
    kind: 'team',
    alias_string: 'MKOI',
    entity_id: 'tm-koi',
    entity_name: 'Movistar KOI',
    valid_from: null,
    valid_to: null,
    evidence: 'redirect',
  },
  {
    kind: 'team',
    alias_string: 'KC',
    entity_id: 'tm-koi',
    entity_name: 'Movistar KOI',
    valid_from: null,
    valid_to: null,
    evidence: 'shortname',
  },
  {
    kind: 'player',
    alias_string: 'APA',
    entity_id: 'pl-frozen',
    entity_name: 'Frozen',
    valid_from: '2019-01-01',
    valid_to: '2020-01-01',
    evidence: 'handle',
  },
]

const index = buildSearchIndex(players, teams, champions, aliases)

describe('search', () => {
  it('finds an entity by the name it plays under today', () => {
    const [first] = search(index, 'Movistar KOI')
    expect(first).toMatchObject({ kind: 'team', id: 'tm-koi', name: 'Movistar KOI', current: true })
  })

  it('finds it by a former name and says which one matched', () => {
    const [first] = search(index, 'mad lions')
    expect(first).toMatchObject({ id: 'tm-koi', matched: 'MAD Lions', current: false })
  })

  it('keeps two organisations apart when their names rhyme', () => {
    const results = search(index, 'MAD')
    expect(results.map((result) => result.id).sort()).toEqual(['tm-koi', 'tm-mad'])
  })

  it('returns one result per entity when both its name and an alias match', () => {
    const results = search(index, 'movistar')
    expect(results.map((result) => result.id)).toEqual(['tm-koi'])
    expect(results[0]?.current).toBe(true)
  })

  it('puts an exact current name above an alias of another entity', () => {
    // "APA" is both a player and a former handle of Frozen.
    const results = search(index, 'APA')
    expect(results[0]).toMatchObject({ id: 'pl-apa', current: true })
    expect(results.map((result) => result.id)).toContain('pl-frozen')
  })

  it('ignores case, accents and spacing', () => {
    expect(search(index, '  mad   lions ')[0]?.id).toBe('tm-koi')
  })

  it('ranks a prefix above a match in the middle of a name', () => {
    // Both halves of the claim, against one query: "illum" starts Illuminar
    // Gaming and is buried in Nunu & Willump. Asserting only that something
    // matched would pass with the two ranks the wrong way round.
    const results = search(index, 'illum')
    expect(results.map((result) => result.name)).toEqual(['Illuminar Gaming', 'Nunu & Willump'])
  })

  it('finds a name by a string from the middle of it', () => {
    // "willump" prefixes nothing in the index; it is only ever inside a name.
    expect(search(index, 'willump').map((result) => result.id)).toEqual(['ch-nunu'])
  })

  it('returns nothing for an empty query rather than everything', () => {
    expect(search(index, '')).toEqual([])
    expect(search(index, '   ')).toEqual([])
  })

  it('returns nothing when nothing matches', () => {
    expect(search(index, 'zzzz')).toEqual([])
  })

  it('marks a short name as an abbreviation, not a former name', () => {
    const [result] = search(index, 'KC')
    expect(result).toMatchObject({ id: 'tm-koi', matched: 'KC', abbreviation: true, current: false })
  })

  it('does not mark a rename as an abbreviation', () => {
    const [result] = search(index, 'mad lions')
    expect(result?.abbreviation).toBe(false)
  })

  it('honours the limit', () => {
    expect(search(index, 'a', 2)).toHaveLength(2)
  })
})

describe('search index with duplicate rows for one name', () => {
  // The artifact's real shape, reduced: the alias bridge carries "100T" as an
  // undated redirect and the model's short names carry it again as a short name,
  // and the redirect sorts first. Before the index merged rows by name, the
  // redirect won the tie and the result said "formerly 100T".
  const duplicateTeams: Team[] = [
    { team_key: 1, team_id: 'tm-100', team_name: '100 Thieves', overview_page: '', region: 'NA', games: 0, short_name: '100T' },
    { team_key: 2, team_id: 'tm-mvp', team_name: 'MVP', overview_page: '', region: 'KR', games: 0, short_name: 'MVP' },
  ]
  const duplicateAliases: AliasRow[] = [
    {
      kind: 'team',
      alias_string: '100T',
      entity_id: 'tm-100',
      entity_name: '100 Thieves',
      valid_from: null,
      valid_to: null,
      evidence: 'redirect',
    },
    {
      kind: 'team',
      alias_string: '100T',
      entity_id: 'tm-100',
      entity_name: '100 Thieves',
      valid_from: null,
      valid_to: null,
      evidence: 'shortname',
    },
    {
      kind: 'team',
      alias_string: 'MVP',
      entity_id: 'tm-mvp',
      entity_name: 'MVP',
      valid_from: null,
      valid_to: null,
      evidence: 'shortname',
    },
  ]
  const duplicateIndex = buildSearchIndex([], duplicateTeams, [], duplicateAliases)

  it('keeps one entry for a name that two rows state', () => {
    const entries = duplicateIndex.filter(
      (entry) => entry.id === 'tm-100' && entry.term === '100T',
    )
    expect(entries).toHaveLength(1)
  })

  it('is an abbreviation once any row for the name says so, whichever came first', () => {
    expect(search(duplicateIndex, '100t')[0]).toMatchObject({
      id: 'tm-100',
      name: '100 Thieves',
      matched: '100T',
      current: false,
      abbreviation: true,
    })
  })

  it('describes a name the entity still goes by as current, not as a short name', () => {
    // "MVP" is the team's name before it is the team's abbreviation; a chip beside
    // it would read "MVP MVP".
    expect(search(duplicateIndex, 'MVP')[0]).toMatchObject({ id: 'tm-mvp', current: true, abbreviation: false })
  })
})

describe('resultPath', () => {
  it('routes each kind to its page', () => {
    expect(resultPath({ kind: 'player', id: 'pl-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/players/pl-1')
    expect(resultPath({ kind: 'team', id: 'tm-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/teams/tm-1')
    expect(resultPath({ kind: 'champion', id: 'ch-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/champions/ch-1')
  })
})
