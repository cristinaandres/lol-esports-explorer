/**
 * The Answer contract, in one pure module.
 *
 * The pipeline writes the sentence and the numbers; the browser prints them and never
 * recomputes an interval. These functions are the seam between the two: `assertShape`
 * rejects a record that cannot be drawn honestly, and `formatAnswer` is the reference
 * formatter the pipeline's text is checked against.
 *
 * The types here are the artifact's shape, not the component's props. A record that
 * cannot fill them cannot be published — that is the point of a contract.
 */

export const ANSWER_CLASSES = ['champions', 'players', 'teams', 'events'] as const
export type AnswerClass = (typeof ANSWER_CLASSES)[number]

export const ANSWER_FAMILIES = ['top-1', 'yes-no', 'count', 'categorical'] as const
export type AnswerFamily = (typeof ANSWER_FAMILIES)[number]

export const QUESTION_IDS = [
  'champion-presence',
  'champion-win-rate',
  'champion-kda',
  'unique-champions',
  'teemo-picked',
  'player-kda',
  'player-kills',
  'player-kill-participation',
  'player-damage',
  'player-kills-threshold',
  'player-cs-threshold',
  'team-win-rate',
  'team-kills',
  'team-gold',
  'game-length-32',
  'shortest-game',
  'finals-mvp-role',
  'region-knockouts',
] as const
export type QuestionId = (typeof QUESTION_IDS)[number]

export type Verdict = 'answered' | 'insufficient_data' | 'not_verifiable'
export type End = 'best' | 'worst'
export type Unit = 'share' | 'per-game' | 'count' | 'kda' | 'seconds'
export type Grain = 'game' | 'player-game' | 'side' | 'award' | 'champion-game'
export type IntervalMethod = 'wilson' | 'bootstrap-percentile' | 'simulation-percentile'
export type Bucket = 'season' | 'event' | 'era' | 'month'

export type Interval = {
  level: 0.95 | 0.9
  low: number
  high: number
  method: IntervalMethod
}

export type Headline = {
  /** The sentence the pipeline wrote: number, interval and n, never a bare number. */
  text: string
  value: number | null
  unit: Unit | null
  n: number
  interval: Interval | null
}

export type Evidence = {
  metric: string
  value: number | null
  /** The numerator of a share; null for a ratio or a count. */
  part: number | null
  n: number
  denominator: number | null
  grain: Grain
  /** The role the answer is scoped to, or null for all roles. */
  role: string | null
}

export type Candidate = {
  name: string
  path: string
  metric: number
  part: number | null
  n: number
  interval: Interval | null
  lower_bound: number
  upper_bound: number
  /** Question-specific columns the pipeline preformatted (KDA's kills, deaths, assists, KP). */
  components?: Record<string, string | number | null>
}

export type CensusRow = {
  name: string
  count: number
  n: number
}

export type Verification = {
  query: string
  result_today: string
  unblocked_by: string
}

export type AnswerRecord = {
  end: End | null
  verdict: Verdict
  headline: Headline
  evidence: Evidence
  candidates?: Candidate[]
  census?: CensusRow[]
  verification?: Verification
  /** The K the record was assembled for. */
  top?: number
  /** Window-specific limits, added to the artifact's shared list. */
  limits?: string[]
  /** The 10,000 replications of a simulation, or a distribution, binned for its histogram. */
  bins?: { key: string; label: string; count: number }[]
  /** The bin a threshold falls in, so the histogram can mark it. */
  marker?: { key: string; label: string } | null
}

export type Window = {
  key: string
  label: string
  season: number | null
  date_from: string
  date_to: string
  cut_date: string
  patches: string[] | 'all patches'
  games: number
  events: number
  records: {
    best: AnswerRecord | null
    worst: AnswerRecord | null
  }
}

export type SeriesPoint = {
  bucket: Bucket
  label: string
  value: number
  part: number | null
  n: number
  denominator: number | null
  interval: Interval | null
}

export type Thresholds = {
  min_n: number
  top_k: number
  top_max: number
  resamples: number
  /** The fixed seed the bootstrap and the simulation were run with. */
  seed: number
}

export type Source = {
  view: string
  artifact: string
  /** The pin's manifestSha256; the artifact's own hash lives in meta.json. */
  sha256: string
}

export type QuestionArtifact = {
  id: QuestionId
  class: AnswerClass
  family: AnswerFamily
  question: string
  thresholds: Thresholds
  source: Source
  limits: string[]
  windows: Window[]
  series: SeriesPoint[]
}

export type AlmanacCard = {
  id: QuestionId
  class: AnswerClass
  family: AnswerFamily
  question: string
  verdict: Verdict
  headline: Headline
  artifact: string
}

export type AlmanacIndex = {
  thresholds: Thresholds
  cards: AlmanacCard[]
}

const PERCENT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const PERCENT_TENTH = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
const PERCENT_HUNDREDTH = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
const COUNT = new Intl.NumberFormat('en-GB')

/** 0.638 -> 64; 0.013 -> 1.3; 0.0013 -> 0.13. The number without its % sign. */
export function percentNumber(value: number): string {
  const scaled = value * 100
  if (scaled >= 10) return PERCENT.format(scaled)
  if (scaled >= 1) return PERCENT_TENTH.format(scaled)
  return PERCENT_HUNDREDTH.format(scaled)
}

/** 0.638 -> '64%'. */
export function percentOf(value: number): string {
  return `${percentNumber(value)}%`
}

function valueText(value: number, unit: Unit | null): string {
  switch (unit) {
    case 'share':
      return percentOf(value)
    case 'kda':
      return value.toFixed(2)
    case 'per-game':
      return value < 100 ? value.toFixed(1) : COUNT.format(Math.round(value))
    case 'count':
      return COUNT.format(Math.round(value))
    case 'seconds':
      return `${COUNT.format(Math.round(value))} s`
    default:
      return String(value)
  }
}

/** The value as the table and the axis print it. The component uses this, not a formula. */
export function metricText(value: number, unit: Unit | null): string {
  return valueText(value, unit)
}

function boundText(value: number, unit: Unit | null): string {
  switch (unit) {
    case 'share':
      return percentNumber(value)
    case 'kda':
      return value.toFixed(2)
    case 'per-game':
      return value < 100 ? value.toFixed(1) : COUNT.format(Math.round(value))
    case 'count':
      return COUNT.format(Math.round(value))
    case 'seconds':
      return COUNT.format(Math.round(value))
    default:
      return String(value)
  }
}

/**
 * The interval, printed with its level.
 *
 * A share prints `95% CI: 57–70%` — one % at the end, because it is one interval. A
 * ratio prints both bounds to the same precision as the value. A simulation prints
 * its replication count instead of pretending to a confidence level it does not have.
 */
export function intervalText(interval: Interval, unit: Unit | null, n: number): string {
  if (interval.method === 'simulation-percentile') {
    return `${Math.round(interval.level * 100)}% of ${COUNT.format(n)} simulations`
  }
  const level = `${Math.round(interval.level * 100)}%`
  if (unit === 'share') {
    return `${level} CI: ${percentNumber(interval.low)}–${percentNumber(interval.high)}%`
  }
  return `${level} CI: ${boundText(interval.low, unit)}–${boundText(interval.high, unit)}`
}

/**
 * The reference sentence: `64% (95% CI: 57–70%, n=232)`.
 *
 * The pipeline writes the same sentence into `headline.text`; this function is what
 * the tests compare it against, so a structured number and its sentence cannot drift.
 * The component prints `headline.text`, never a value recomputed here.
 */
export function formatAnswer(record: AnswerRecord): string {
  const { headline } = record
  if (record.verdict !== 'answered' || headline.value === null) return headline.text
  const interval = headline.interval
  if (!interval) return `${valueText(headline.value, headline.unit)} (n=${COUNT.format(headline.n)})`
  if (headline.unit === 'count') {
    return `${valueText(interval.low, headline.unit)}–${valueText(interval.high, headline.unit)} (${intervalText(interval, headline.unit, headline.n)})`
  }
  return `${valueText(headline.value, headline.unit)} (${intervalText(interval, headline.unit, headline.n)}, n=${COUNT.format(headline.n)})`
}

export function verdictOf(record: AnswerRecord): Verdict {
  return record.verdict
}

/** The order a ranking is printed in, in the words the page prints. */
export function orderRule(end: End | null): string {
  return end === 'worst' ? 'ordered by the upper bound' : 'ordered by the lower bound'
}

function isSorted(candidates: Candidate[], end: End | null): boolean {
  const key = end === 'worst' ? 'upper_bound' : 'lower_bound'
  const direction = end === 'worst' ? 1 : -1
  for (let index = 1; index < candidates.length; index += 1) {
    if ((candidates[index][key] - candidates[index - 1][key]) * direction < 0) return false
  }
  return true
}

const ENTITY_PATH = /^\/(players|teams|champions)\//

/**
 * Reject a record that cannot be drawn honestly.
 *
 * The rules are structural on purpose: a small sample cannot acquire an interval, a
 * named question cannot appear without its verification, a share cannot lose its
 * denominator, and a ranking cannot be printed in an order its own rule did not
 * produce. A caller that catches this is allowed to show an error; a caller that
 * ignores it is the defect.
 */
export function assertShape(record: AnswerRecord, family: AnswerFamily): void {
  const { headline, evidence } = record
  if (!Number.isInteger(headline.n) || headline.n < 0) {
    throw new Error('answer: headline.n must be a non-negative integer')
  }
  if (!Number.isInteger(evidence.n) || evidence.n < 0) {
    throw new Error('answer: evidence.n must be a non-negative integer')
  }

  if (headline.interval) {
    const { level, low, high, method } = headline.interval
    if (!(low <= high)) throw new Error('answer: interval.low must not exceed interval.high')
    if (method === 'simulation-percentile' && level !== 0.9) {
      throw new Error('answer: a simulation interval is published at 90%')
    }
    if (method !== 'simulation-percentile' && level !== 0.95) {
      throw new Error('answer: a Wilson or bootstrap interval is published at 95%')
    }
    if (headline.value !== null && (headline.value < low || headline.value > high)) {
      throw new Error('answer: the point estimate must lie inside its interval')
    }
  }

  if (record.verdict === 'not_verifiable') {
    if (!record.verification) throw new Error('answer: not_verifiable needs a verification block')
    if (headline.value !== null) throw new Error('answer: not_verifiable must not print an answer value')
    if (headline.interval) throw new Error('answer: not_verifiable must not print an interval')
    return
  }

  if (record.verdict === 'insufficient_data') {
    if (headline.interval) throw new Error('answer: insufficient_data must not print an interval')
    if (!record.census || record.census.length === 0) {
      throw new Error('answer: insufficient_data must keep its counts visible as a census')
    }
    return
  }

  if (headline.value === null) throw new Error('answer: answered needs a headline value')
  if (headline.unit === 'share') {
    if (evidence.part === null || evidence.denominator === null) {
      throw new Error('answer: a share needs its part and its denominator')
    }
    if (evidence.part > evidence.denominator) {
      throw new Error('answer: a share part cannot exceed its denominator')
    }
  }

  if (family === 'top-1') {
    const candidates = record.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('answer: an answered top-1 needs candidates')
    }
    const top = record.top ?? 5
    if (candidates.length > top + 1) {
      throw new Error('answer: candidates cannot exceed the K plus its tie')
    }
    if (!isSorted(candidates, record.end)) {
      throw new Error(`answer: candidates must be ${orderRule(record.end)}`)
    }
    for (const candidate of candidates) {
      if (!ENTITY_PATH.test(candidate.path)) {
        throw new Error(`answer: candidate path ${candidate.path} is not an entity route`)
      }
      if (candidate.lower_bound > candidate.upper_bound) {
        throw new Error('answer: a candidate lower bound must not exceed its upper bound')
      }
    }
  }
}

/** The shared limits plus the record's own, capped at the contract's four. */
export function limitsFor(artifact: QuestionArtifact, record: AnswerRecord): string[] {
  const limits = [...artifact.limits, ...(record.limits ?? [])]
  if (limits.length > 4) throw new Error('answer: at most four limits are published')
  return limits
}

/** 'Season 2025' or 'All games', from the artifact's window. */
export function windowLabel(window: Window): string {
  return window.season === null ? 'All games' : `Season ${window.season}`
}

export function windowByKey(artifact: QuestionArtifact, key: string): Window | undefined {
  return artifact.windows.find((window) => window.key === key)
}

export function defaultWindow(artifact: QuestionArtifact): Window {
  return artifact.windows.find((window) => window.key === 'all') ?? artifact.windows[0]
}

/** The seasons the artifact carries, newest first, for the entry page's control. */
export function seasonOptions(artifact: QuestionArtifact): { value: string; label: string }[] {
  return artifact.windows
    .filter((window) => window.season !== null)
    .map((window) => ({ value: String(window.season), label: windowLabel(window) }))
    .sort((a, b) => Number(b.value) - Number(a.value))
}

/** The record for an end, or the only end when the card has one. */
export function recordFor(window: Window, end: End | null): AnswerRecord | null {
  if (end === 'worst') return window.records.worst
  return window.records.best
}

export function sourceText(artifact: QuestionArtifact): string {
  const pin = artifact.source.sha256.slice(0, 8)
  return `${artifact.source.view} · ${artifact.source.artifact} · pin ${pin}…`
}
