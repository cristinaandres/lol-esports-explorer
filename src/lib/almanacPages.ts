/**
 * The per-question recipe: what a question's page says about its own shape.
 *
 * One row per question, and one question per row. The route reads this table and
 * nothing else: it never asks which id it is holding, so a page cannot grow a private
 * exception and the eighteen pages cannot drift apart. A new question is a spec change,
 * a pipeline row and a row here — the data test fails until the row exists, so a new
 * card cannot inherit another card's wording by accident.
 *
 * What is *not* here, on purpose: the chart a record draws. The chart is chosen from
 * the record's shape and verdict, and it is the subject of its own round; this table
 * freezes only the copy and the columns the page adds around it.
 *
 * Everything here is a decision, not a computation: the page prints numbers the
 * pipeline wrote, and this module decides what to call them.
 */

import type { QuestionId } from './answer'
import { count } from './format'

/**
 * A column the ranking table adds after the contract's four.
 *
 * `kind` decides the format, never the value: a `count` is printed as a whole number,
 * a `share` prints its value with its interval beside it, and a missing component is
 * an em dash rather than a zero.
 */
export type ColumnSpec = {
  /** The key in the candidate's `components`, as the pipeline wrote it. */
  key: string
  label: string
  kind: 'count' | 'share'
}

export type HistogramCopy = {
  title: string
  /** The caption under the bins; the total is the sum of the bins, not the answer's n. */
  caption: (total: number, marker: string) => string
  /** What one bin counts, printed in the table's heading. */
  unit: string
}

export type PageConfig = {
  /** What the census block counts, printed as its heading. */
  census: string
  /** The columns the top-K table adds; empty when the card adds none. */
  columns: ColumnSpec[]
  /** The bins histogram's copy. Required wherever a record carries bins. */
  histogram?: HistogramCopy
}

const KILLS: ColumnSpec = { key: 'kills', label: 'Kills', kind: 'count' }
const DEATHS: ColumnSpec = { key: 'deaths', label: 'Deaths', kind: 'count' }
const ASSISTS: ColumnSpec = { key: 'assists', label: 'Assists', kind: 'count' }
const TEAM_KILLS: ColumnSpec = { key: 'team_kills', label: 'Team kills', kind: 'count' }
const KILL_PARTICIPATION: ColumnSpec = {
  key: 'kp',
  label: 'Kill participation (95% CI)',
  kind: 'share',
}
const WINS: ColumnSpec = { key: 'wins', label: 'Wins', kind: 'count' }

const PLAYER_GAME_DISTRIBUTION: HistogramCopy = {
  title: 'The distribution',
  caption: (total, marker) =>
    `${count(total)} player-games in this window; the line marks ${marker}.`,
  unit: 'player-games',
}

const DURATION_DISTRIBUTION: HistogramCopy = {
  title: 'The distribution',
  caption: (total) =>
    `${count(total)} games with a stated duration; the line marks the shortest decile.`,
  unit: 'games',
}

export const PAGE_CONFIG: Record<QuestionId, PageConfig> = {
  'champion-presence': {
    census: 'Champions under 20 presences',
    columns: [],
  },
  'champion-win-rate': {
    census: 'Champions under 20 picks',
    columns: [],
  },
  'champion-kda': {
    census: 'Champions under 20 champion-games',
    columns: [KILLS, DEATHS, ASSISTS, TEAM_KILLS, KILL_PARTICIPATION],
  },
  'unique-champions': {
    census: 'Champions under the publication threshold',
    columns: [],
    histogram: {
      title: 'The simulation',
      caption: (total) =>
        `${count(total)} simulated seasons; the answer above is the median and the 90% interval.`,
      unit: 'simulations',
    },
  },
  'teemo-picked': {
    census: 'Presences of Teemo',
    columns: [],
  },
  'player-kda': {
    census: 'Players under 20 player-games',
    columns: [KILLS, DEATHS, ASSISTS, TEAM_KILLS, KILL_PARTICIPATION],
  },
  'player-kills': {
    census: 'Players under 20 player-games',
    columns: [KILLS],
  },
  'player-kill-participation': {
    census: 'Players under 20 player-games',
    columns: [TEAM_KILLS],
  },
  'player-damage': {
    census: 'Players under 20 player-games',
    columns: [],
  },
  'player-kills-threshold': {
    census: 'Player-games at 15 kills or more',
    columns: [],
    histogram: PLAYER_GAME_DISTRIBUTION,
  },
  'player-cs-threshold': {
    census: 'Player-games at 450 CS or more',
    columns: [],
    histogram: PLAYER_GAME_DISTRIBUTION,
  },
  'team-win-rate': {
    census: 'Teams under 20 team-games',
    columns: [WINS],
  },
  'team-kills': {
    census: 'Teams under 20 team-games',
    columns: [],
  },
  'team-gold': {
    census: 'Teams under 20 team-games',
    columns: [],
  },
  'game-length-32': {
    census: 'Games at or under 32:00',
    columns: [],
    histogram: {
      title: 'The distribution',
      caption: (total) =>
        `${count(total)} games with a stated duration; the line marks 32:00, and the share counts games at or under it.`,
      unit: 'games',
    },
  },
  'shortest-game': {
    census: 'The shortest decile, by side',
    columns: [],
    histogram: DURATION_DISTRIBUTION,
  },
  'finals-mvp-role': {
    census: 'Finals MVP awards by role',
    columns: [],
  },
  'region-knockouts': {
    census: 'Regions in knockouts',
    columns: [],
  },
}

export function pageConfig(id: QuestionId): PageConfig {
  return PAGE_CONFIG[id]
}
