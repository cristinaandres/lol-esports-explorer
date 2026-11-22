import type { EventRow, HonourRow, Player } from './types'

/**
 * The distinctions the source states, read rather than derived.
 *
 * `titles.ts` infers a championship from the bracket and says so; this module does
 * the opposite and keeps the source's words. The two are never merged: a reader can
 * see that Faker won Worlds 2024 (derived) and that the source named him Finals MVP
 * (stated), and the pages say which is which.
 *
 * Ordering is a rule, not a default, because an artifact order is not a reading order
 * and a page that changes its mind between renders is a page a reader cannot cite:
 *
 *   - a player's distinctions run newest event first, the order a career reads in;
 *   - within one event, a title that says MVP comes before one that does not, so a
 *     six-row MSI 2016 puts the MVP above the five All Pro places;
 *   - then the title as the source spells it, then the player's name.
 */

/** A distinction with the event it belongs to, for sorting and for display. */
export type DatedDistinction = HonourRow & { event: EventRow | undefined }

/** `MVP`, `Finals MVP`, `MSI MVP`, `Tournament MVP` -- the source states many words. */
export function isMvpTitle(title: string): boolean {
  return /\bmvp\b/i.test(title)
}

function byTitleThenPlayer(a: HonourRow, b: HonourRow, players: Map<number, Player>): number {
  const mvp = Number(isMvpTitle(b.title)) - Number(isMvpTitle(a.title))
  if (mvp !== 0) return mvp
  if (a.title !== b.title) return a.title.localeCompare(b.title)
  const aName = players.get(a.player_key)?.player_name ?? ''
  const bName = players.get(b.player_key)?.player_name ?? ''
  return aName.localeCompare(bName)
}

function withEvents(
  rows: readonly HonourRow[],
  events: Map<number, EventRow>,
): DatedDistinction[] {
  return rows.map((row) => ({ ...row, event: events.get(row.event_key) }))
}

/** The order a career or a club list reads in: newest event first. */
function byEventThenTitle(
  players: Map<number, Player>,
): (a: DatedDistinction, b: DatedDistinction) => number {
  return (a, b) => {
    // The event's date is the primary key of the list; the title rule only decides
    // inside one event, where the dates are equal.
    const date = (b.event?.date_start ?? '').localeCompare(a.event?.date_start ?? '')
    return date !== 0 ? date : byTitleThenPlayer(a, b, players)
  }
}

/**
 * One player's distinctions, newest event first.
 *
 * An event the index cannot resolve sorts last rather than being dropped: a
 * distinction is a stated fact, and a page that silently lost one would be saying
 * the source never stated it. The page renders the event's name only when it
 * resolves, which is the link rule, not a data rule.
 */
export function distinctionsForPlayer(
  rows: readonly HonourRow[],
  playerKey: number,
  events: Map<number, EventRow>,
  players: Map<number, Player>,
): DatedDistinction[] {
  return withEvents(
    rows.filter((row) => row.player_key === playerKey),
    events,
  ).sort(byEventThenTitle(players))
}

/**
 * The distinctions the source states for players at one team, newest event first.
 *
 * The team is the one the source names *at that event*, so an award follows the club
 * the player was playing for rather than the club on the roster today: a distinction
 * is a statement about one tournament. Key 0 is the unknown member and has no page,
 * so it resolves to no list rather than a list under "Unknown".
 */
export function distinctionsForTeam(
  rows: readonly HonourRow[],
  teamKey: number,
  events: Map<number, EventRow>,
  players: Map<number, Player>,
): DatedDistinction[] {
  if (teamKey === 0) return []
  return withEvents(
    rows.filter((row) => row.team_key === teamKey),
    events,
  ).sort(byEventThenTitle(players))
}

/** One event's distinctions: MVP-named titles first, then the rest, then by name. */
export function distinctionsForEvent(
  rows: readonly HonourRow[],
  eventKey: number,
  players: Map<number, Player>,
): HonourRow[] {
  return rows
    .filter((row) => row.event_key === eventKey)
    .sort((a, b) => byTitleThenPlayer(a, b, players))
}

/** A competition's distinctions, grouped the way the Titles section groups titles. */
export type DistinctionGroup = {
  competition: string
  distinctions: DatedDistinction[]
}

/**
 * Group a player's distinctions by the competition the event belongs to.
 *
 * Groups run in the order `Titles` already prints them -- most distinctions first,
 * then by name -- so the two sections of one page do not disagree about where Worlds
 * goes. An event with no competition (the index cannot resolve it) groups under
 * `Unknown` rather than vanishing.
 */
export function groupByCompetition(distinctions: readonly DatedDistinction[]): DistinctionGroup[] {
  const groups = new Map<string, DatedDistinction[]>()
  for (const distinction of distinctions) {
    const competition = distinction.event?.competition ?? 'Unknown'
    const bucket = groups.get(competition)
    if (bucket) bucket.push(distinction)
    else groups.set(competition, [distinction])
  }
  return [...groups.entries()]
    .map(([competition, rows]) => ({ competition, distinctions: rows }))
    .sort(
      (a, b) =>
        b.distinctions.length - a.distinctions.length || a.competition.localeCompare(b.competition),
    )
}
