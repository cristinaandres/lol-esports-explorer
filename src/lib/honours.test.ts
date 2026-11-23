import { describe, expect, it } from 'vitest'

import {
  distinctionsForEvent,
  distinctionsForPlayer,
  groupByCompetition,
  isMvpTitle,
} from './honours'
import type { EventRow, HonourRow, Player } from './types'

const event = (event_key: number, event_name: string, date_start: string, competition: string): EventRow =>
  ({
    event_key,
    event_id: `ev-${event_key}`,
    event_name,
    league: competition,
    competition,
    region: 'International',
    year: Number(date_start.slice(0, 4)),
    date_start,
    games: 1,
    series: 1,
    teams: 2,
    players: 10,
    first_date: date_start,
    last_date: date_start,
    blue_wins: 1,
    games_duration_stated: 1,
    avg_duration_seconds: 1,
    eras: null,
    coverage_games: 1,
    team_complete: 1,
    draft_complete: 1,
    player_complete: 1,
  }) as EventRow

const player = (player_key: number, player_name: string): Player => ({
  player_key,
  player_id: `pl-${player_key}`,
  player_name,
  overview_page: null,
  games: 1,
  primary_role: 'Mid',
  last_team_key: 0,
  last_game_year: null,
})

const honour = (
  player_key: number,
  event_key: number,
  title: string,
  team_key = 0,
): HonourRow => ({
  player_key,
  event_key,
  team_key,
  title,
  type: 'Season Award',
  source_page: 'a page',
  place: null,
  place_number: null,
})

const events = new Map([
  [1, event(1, 'Worlds 2024', '2024-09-25', 'Worlds')],
  [2, event(2, 'MSI 2016', '2016-05-04', 'MSI')],
  [3, event(3, 'MSI 2024', '2024-05-01', 'MSI')],
])
const players = new Map([1, 2, 3, 4].map((key) => [key, player(key, `Player ${key}`)]))

describe('isMvpTitle', () => {
  it('recognises every MVP wording the source uses, and no All-Pro place', () => {
    expect(['MVP', 'Finals MVP', 'MSI MVP', 'Tournament MVP'].every(isMvpTitle)).toBe(true)
    expect(isMvpTitle('All Pro Team')).toBe(false)
  })
})

describe('distinctionsForPlayer', () => {
  const rows = [
    honour(1, 2, 'MVP', 10),
    honour(1, 1, 'Finals MVP', 20),
    honour(1, 3, 'Most Valuable Player', 30),
    honour(2, 2, 'All Pro Team', 10),
  ]

  it('runs newest event first, whatever order the artifact came in', () => {
    const mine = distinctionsForPlayer(rows, 1, events, players)
    expect(mine.map((row) => row.event?.event_name)).toEqual([
      'Worlds 2024',
      'MSI 2024',
      'MSI 2016',
    ])
  })

  it('carries the event row, so a page can name and link it without a second lookup', () => {
    const [first] = distinctionsForPlayer(rows, 1, events, players)
    expect(first?.event?.event_id).toBe('ev-1')
    expect(first?.team_key).toBe(20)
  })

  it('puts an MVP above an All-Pro place at the same event', () => {
    const mine = distinctionsForPlayer(rows, 2, events, players)
    expect(mine.map((row) => row.title)).toEqual(['All Pro Team'])
    const both = distinctionsForPlayer(
      [...rows, honour(2, 2, 'MVP', 10)],
      2,
      events,
      players,
    )
    expect(both.map((row) => row.title)).toEqual(['MVP', 'All Pro Team'])
  })

  it('returns nothing for a player the source says nothing about', () => {
    expect(distinctionsForPlayer(rows, 99, events, players)).toEqual([])
  })

  it('keeps a distinction whose event the index cannot resolve, sorted last', () => {
    // A stated fact is not dropped because this build cannot name its event.
    const mine = distinctionsForPlayer([...rows, honour(1, 404, 'MVP')], 1, events, players)
    expect(mine).toHaveLength(4)
    expect(mine.at(-1)?.event).toBeUndefined()
  })
})

describe('distinctionsForEvent', () => {
  it('puts the MVP first and the All-Pro places after it', () => {
    const rows = [
      honour(3, 2, 'All Pro Team'),
      honour(2, 2, 'All Pro Team'),
      honour(1, 2, 'MVP'),
      honour(4, 3, 'Finals MVP'),
    ]
    const awards = distinctionsForEvent(rows, 2, players)
    expect(awards.map((row) => row.title)).toEqual(['MVP', 'All Pro Team', 'All Pro Team'])
    expect(awards.map((row) => row.player_key)).toEqual([1, 2, 3])
  })

  it('returns nothing for an event that states no distinction', () => {
    expect(distinctionsForEvent([], 3, players)).toEqual([])
    expect(distinctionsForEvent([honour(1, 2, 'MVP')], 3, players)).toEqual([])
  })
})

describe('groupByCompetition', () => {
  it('groups by the event\'s competition, most distinctions first, then by name', () => {
    const rows = [
      honour(1, 1, 'Finals MVP'),
      honour(1, 3, 'Most Valuable Player'),
      honour(1, 2, 'MVP'),
    ]
    const groups = groupByCompetition(distinctionsForPlayer(rows, 1, events, players))
    expect(groups.map((group) => group.competition)).toEqual(['MSI', 'Worlds'])
    expect(groups[0]?.distinctions).toHaveLength(2)
  })

  it('files an unresolvable event under Unknown rather than losing it', () => {
    const groups = groupByCompetition(distinctionsForPlayer([honour(1, 404, 'MVP')], 1, events, players))
    expect(groups).toEqual([
      { competition: 'Unknown', distinctions: [expect.objectContaining({ title: 'MVP' })] },
    ])
  })

  it('returns no group for a player with no distinction', () => {
    expect(groupByCompetition([])).toEqual([])
  })
})
