import type { Appearance } from './career'
import type { Game, Match } from './types'

/**
 * Tournament titles, derived rather than stored.
 *
 * The model carries no "event champion" column: it has series and games, and the
 * curated layer's `winnerTeamId` never reached the dimensional model. A champion
 * is therefore derived, by a rule that has to be stated because it is an inference
 * and not a fact:
 *
 *   1. An event's final is the **single** series whose name says Finals and not
 *      Semifinals or Quarterfinals.
 *   2. The champion is the team that won more games in it.
 *
 * Validated against the corpus: the rule reproduces Worlds 2015, 2016, 2017, 2019,
 * 2021, 2022, 2023 and 2024, and MSI 2016, 2023 and 2024, which are known.
 *
 * It deliberately awards nothing where the condition fails. Twelve events name
 * several series Finals — the Rift Rivals relays, where a region wins and no single
 * team does — and one carries no final at all. Saying "no title we can name" is
 * better than naming the wrong team.
 */

export type Championship = {
  eventKey: number
  teamKey: number
  wins: number
  losses: number
  date: string
  finalName: string
}

/** A series whose name says Finals, and not the round that merely ends in it. */
export function isFinalName(name: string): boolean {
  const lower = name.toLowerCase()
  if (!/\bfinals?\b/.test(lower)) return false
  return !/(semi|quarter)finals?/.test(lower)
}

export function championships(games: Game[], matches: Match[]): Map<number, Championship> {
  const finals = new Map<number, Match[]>()
  for (const match of matches) {
    if (match.match_key === 0 || !isFinalName(match.match_name)) continue
    const bucket = finals.get(match.event_key)
    if (bucket) bucket.push(match)
    else finals.set(match.event_key, [match])
  }

  const result = new Map<number, Championship>()

  for (const [eventKey, candidates] of finals) {
    // More than one series named Finals on the same event: the winner is a region
    // or a relay, and naming one team would be wrong.
    if (candidates.length !== 1) continue
    const final = candidates[0]!

    const wins = new Map<number, number>()
    let played = 0
    for (const game of games) {
      if (game.match_key !== final.match_key) continue
      const winner = game.blue_win === 1 ? game.blue_team_key : game.red_team_key
      wins.set(winner, (wins.get(winner) ?? 0) + 1)
      played += 1
    }
    if (played === 0) continue

    const ranked = [...wins.entries()].sort((a, b) => b[1] - a[1])
    const [best, second] = ranked
    if (!best) continue
    // A drawn final has no champion we can name.
    if (second && second[1] === best[1]) continue

    result.set(eventKey, {
      eventKey,
      teamKey: best[0],
      wins: best[1],
      losses: played - best[1],
      date: final.date_time_utc,
      finalName: final.match_name,
    })
  }

  return result
}

/** The titles won by one team, newest first. */
export function titlesForTeam(champs: Map<number, Championship>, teamKey: number): Championship[] {
  return [...champs.values()]
    .filter((title) => title.teamKey === teamKey)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * The titles a player won: events where their team won the final and they appeared
 * for that team.
 *
 * Appearing in the event is the strongest evidence the corpus carries. A player
 * signed but never fielded leaves no row, so they earn no title here — a limit of
 * the data, not a judgement about their contribution.
 */
export function titlesForPlayer(
  champs: Map<number, Championship>,
  appearances: Appearance[],
): Championship[] {
  const won = new Map<number, Championship>()

  for (const appearance of appearances) {
    const title = champs.get(appearance.game.event_key)
    if (!title) continue
    if (title.teamKey !== appearance.row.team_key) continue
    won.set(title.eventKey, title)
  }

  return [...won.values()].sort((a, b) => b.date.localeCompare(a.date))
}
