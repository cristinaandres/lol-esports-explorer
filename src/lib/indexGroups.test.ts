import { describe, expect, it } from 'vitest'

import { groupIndexEntries, parseIndexSort, ROLE_ORDER, type IndexEntry } from './indexGroups'

const entry = (name: string, games: number, role: string | null = 'Mid'): IndexEntry => ({
  id: `id-${name}`,
  name,
  games,
  role,
})

describe('parseIndexSort', () => {
  it('reads the two sorts and falls back to name for anything else', () => {
    expect(parseIndexSort('role')).toBe('role')
    expect(parseIndexSort('name')).toBe('name')
    expect(parseIndexSort(null)).toBe('name')
    expect(parseIndexSort('')).toBe('name')
    expect(parseIndexSort('Role')).toBe('name')
    expect(parseIndexSort('region')).toBe('name')
  })
})

describe('groupIndexEntries by name', () => {
  it('groups by initial, A to Z, with # last', () => {
    const groups = groupIndexEntries(
      [entry('Zed', 2), entry('Ahri', 5), entry('#1 Fan', 1), entry('Annie', 3)],
      'name',
    )
    expect(groups.map((group) => group.label)).toEqual(['#', 'A', 'Z'])
    expect(groups[1]?.items.map((row) => row.name)).toEqual(['Ahri', 'Annie'])
  })

  it('orders inside a group by games, then name, so a tie cannot swap', () => {
    const groups = groupIndexEntries([entry('Zed', 4), entry('Zoe', 4), entry('Ziggs', 9)], 'name')
    expect(groups[0]?.items.map((row) => row.name)).toEqual(['Ziggs', 'Zed', 'Zoe'])
  })
})

describe('groupIndexEntries by role', () => {
  it('orders the groups by draft order, not alphabetically', () => {
    const groups = groupIndexEntries(
      [
        entry('A', 1, 'Support'),
        entry('B', 1, 'Top'),
        entry('C', 1, 'Mid'),
        entry('D', 1, 'Bot'),
        entry('E', 1, 'Jungle'),
      ],
      'role',
    )
    expect(groups.map((group) => group.label)).toEqual([...ROLE_ORDER])
  })

  it('puts an unknown role before the entities with no role, and both after the five', () => {
    const groups = groupIndexEntries(
      [entry('A', 1, 'Support'), entry('B', 1, 'Coach'), entry('C', 1, null)],
      'role',
    )
    expect(groups.map((group) => group.label)).toEqual(['Support', 'Coach', 'Unknown'])
  })

  it('keeps a champion that played two roles in the one it played most', () => {
    // Rammus on the pin: Top 4, Jungle 4 — the pipeline decides Top, and the index
    // groups by that decision rather than re-deriving it.
    const groups = groupIndexEntries([entry('Rammus', 8, 'Top'), entry('Ahri', 288, 'Mid')], 'role')
    expect(groups.find((group) => group.label === 'Top')?.items.map((row) => row.name)).toEqual([
      'Rammus',
    ])
  })

  it('never drops a row: the group counts add up to the input', () => {
    const entries = [entry('A', 1, 'Top'), entry('B', 1, null), entry('C', 1, 'Coach')]
    const total = groupIndexEntries(entries, 'role').reduce((sum, group) => sum + group.items.length, 0)
    expect(total).toBe(entries.length)
  })
})
