/**
 * The Almanac's pure rules: which class a card belongs to, how a URL names a
 * window, and how a stored ranking is sliced to the K the reader asked for.
 *
 * The routes own the fetching and the query string; this module owns the decisions
 * that must not be duplicated between them, so the index and the entry page cannot
 * disagree about what `?top=10` means.
 */

import { ANSWER_CLASSES, QUESTION_IDS, windowByKey } from './answer'
import type {
  AlmanacCard,
  AnswerClass,
  AnswerFamily,
  AnswerRecord,
  Candidate,
  End,
  QuestionArtifact,
  QuestionId,
  Unit,
  Window,
} from './answer'

export const DEFAULT_TOP = 5
export const TOP_OPTIONS = [5, 10, 20] as const
export type Top = (typeof TOP_OPTIONS)[number]

export const CLASS_META: Record<AnswerClass, { title: string; blurb: string }> = {
  champions: {
    title: 'Champions',
    blurb: 'What the draft says about the champions in it: presence, win rate, KDA and the pool.',
  },
  players: {
    title: 'Players',
    blurb: 'KDA, kills, participation, damage and the thresholds a player-game crosses.',
  },
  teams: {
    title: 'Teams',
    blurb: 'Win rate, kills and gold, measured on the side rows a game states.',
  },
  events: {
    title: 'Events',
    blurb: 'Game length, the shortest game, the Finals MVP role and the regions that do not resolve.',
  },
}

export const FAMILY_LABELS: Record<AnswerFamily, string> = {
  'top-1': 'Top-K',
  'yes-no': 'Share',
  count: 'Count',
  categorical: 'Census',
}

export function classLabel(value: AnswerClass): string {
  return CLASS_META[value].title
}

export function familyLabel(value: AnswerFamily): string {
  return FAMILY_LABELS[value]
}

/** The four class sections, in the order the site reads them. */
export function groupByClass(
  cards: AlmanacCard[],
): { cls: AnswerClass; title: string; blurb: string; cards: AlmanacCard[] }[] {
  return ANSWER_CLASSES.map((cls) => ({
    cls,
    ...CLASS_META[cls],
    cards: cards.filter((card) => card.class === cls),
  })).filter((group) => group.cards.length > 0)
}

export function isQuestionId(value: string | undefined): value is QuestionId {
  return value !== undefined && (QUESTION_IDS as readonly string[]).includes(value)
}

export function questionHref(id: QuestionId): string {
  return `/almanac/${id}`
}

/** `?season=2025` is a year; no parameter is the whole corpus. */
export function parseSeason(value: string | null): string {
  if (!value || value === 'all') return 'all'
  return /^\d{4}$/.test(value) ? value : 'all'
}

export function parseTop(value: string | null): Top {
  const parsed = Number(value)
  return (TOP_OPTIONS as readonly number[]).includes(parsed) ? (parsed as Top) : DEFAULT_TOP
}

export function parseEnd(value: string | null): End | null {
  return value === 'worst' ? 'worst' : null
}

export function hasWorst(artifact: QuestionArtifact): boolean {
  return artifact.windows.some((window) => window.records.worst !== null)
}

export function windowFor(artifact: QuestionArtifact, season: string): Window | undefined {
  return windowByKey(artifact, season === 'all' ? 'all' : `season:${season}`)
}

export function topLabel(top: number): string {
  return `Top ${top}`
}

/**
 * The stored ranking sliced to the K the reader asked for.
 *
 * The pipeline stores up to twenty candidates; the view shows five, ten or twenty.
 * A tie at the last place is included by one, as R6 says, and the record was stored
 * with room for that one.
 */
export function candidateSlice(record: AnswerRecord, end: End | null, top: number): Candidate[] {
  const candidates = record.candidates ?? []
  if (candidates.length === 0) return []
  const limit = Math.min(top, candidates.length)
  const chosen = candidates.slice(0, limit)
  const last = chosen[chosen.length - 1]
  const edge = end === 'worst' ? last.upper_bound : last.lower_bound
  for (const candidate of candidates.slice(limit)) {
    const value = end === 'worst' ? candidate.upper_bound : candidate.lower_bound
    if (value === edge && chosen.length < limit + 1) chosen.push(candidate)
    else break
  }
  return chosen
}

/** The axis a chart needs, from the values it draws and the unit it speaks. */
export function rangeFor(values: number[], unit: Unit | null): { min: number; max: number } {
  if (unit === 'share') return { min: 0, max: 1 }
  const maximum = Math.max(0, ...values)
  if (maximum === 0) return { min: 0, max: 1 }
  return { min: 0, max: maximum * 1.05 }
}

/** The series' own range, including its intervals so a whisker cannot leave the axis. */
export function seriesRange(
  points: { value: number; interval: { low: number; high: number } | null }[],
  unit: Unit | null,
): { min: number; max: number } {
  const values = points.flatMap((point) =>
    point.interval ? [point.value, point.interval.low, point.interval.high] : [point.value],
  )
  return rangeFor(values, unit)
}

/** The URL a shared view should canonicalise to: defaults are left out. */
export function canonicalParams(season: string, end: End | null, top: number): URLSearchParams {
  const params = new URLSearchParams()
  if (season !== 'all') params.set('season', season)
  if (end === 'worst') params.set('end', 'worst')
  if (top !== DEFAULT_TOP) params.set('top', String(top))
  return params
}

/** One control's change, applied without rewriting the parameters it did not touch. */
export function updateParams(
  current: URLSearchParams,
  patch: { season?: string; end?: End; top?: number },
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (patch.season !== undefined) {
    if (patch.season === 'all') next.delete('season')
    else next.set('season', patch.season)
  }
  if (patch.end !== undefined) {
    if (patch.end === 'worst') next.set('end', 'worst')
    else next.delete('end')
  }
  if (patch.top !== undefined) {
    if (patch.top === DEFAULT_TOP) next.delete('top')
    else next.set('top', String(patch.top))
  }
  return next
}
