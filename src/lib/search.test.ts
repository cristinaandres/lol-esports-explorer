import { describe, expect, it } from 'vitest'

import { buildSearchIndex, resultPath, search } from './search'
import type { AliasRow, Champion, Player, Team } from './types'

const players: Player[] = [
  { player_key: 1, player_id: 'pl-apa', player_name: 'APA', overview_page: '', games: 0 },
  { player_key: 2, player_id: 'pl-frozen', player_name: 'Frozen', overview_page: '', games: 0 },
]
const teams: Team[] = [
  { team_key: 1, team_id: 'tm-koi', team_name: 'Movistar KOI', overview_page: '', region: 'EMEA', games: 0, short_name: 'KOI' },
  { team_key: 2, team_id: 'tm-mad', team_name: 'MAD Team', overview_page: '', region: 'LMS', games: 0, short_name: null },
]
const champions: Champion[] = [
  { champion_key: 1, champion_id: 'ch-nunu', champion_name: 'Nunu & Willump', riot_key: 20, games: 0, release_date: '2009-02-21' },
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

  it('matches the middle of a name, ranked below a prefix', () => {
    const results = search(index, 'illum')
    expect(results.length).toBeGreaterThan(0)
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

describe('resultPath', () => {
  it('routes each kind to its page', () => {
    expect(resultPath({ kind: 'player', id: 'pl-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/players/pl-1')
    expect(resultPath({ kind: 'team', id: 'tm-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/teams/tm-1')
    expect(resultPath({ kind: 'champion', id: 'ch-1', name: '', matched: '', current: true, abbreviation: false })).toBe('/champions/ch-1')
  })
})
