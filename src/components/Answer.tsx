import { assertShape, limitsFor, sourceText, windowLabel } from '../lib/answer'
import type { AnswerRecord, End, Interval, QuestionArtifact, Window } from '../lib/answer'
import { count, dayMonthYear } from '../lib/format'

/**
 * One Almanac answer, and the only way one may be drawn.
 *
 * The headline, the evidence, the limits and the source are one block; there is no
 * branch of this component that renders a number without its `n`. The verdict is a
 * labelled chip, not a colour, and the limits are visible text rather than a hover:
 * a limit nobody reads is not a limit.
 *
 * The numbers come from the artifact. This component never computes an interval and
 * never derives a share; it prints the sentence the pipeline wrote and the window it
 * was measured on.
 */
export function Answer({
  artifact,
  window,
  end,
}: {
  artifact: QuestionArtifact
  window: Window
  end: End | null
}) {
  const record = end === 'worst' ? window.records.worst : window.records.best
  if (!record) return null

  // The contract is enforced at the seam, not only in the data test: a record that
  // reached here without its n, or with an interval on a small sample, is a defect.
  assertShape(record, artifact.family)

  const limits = limitsFor(artifact, record)

  return (
    <section
      aria-labelledby="answer-headline"
      className="border-line bg-ink-900/60 rounded-2xl border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p
          id="answer-headline"
          className="text-fog-100 text-2xl leading-tight font-semibold tracking-tight tabular-nums"
        >
          {record.headline.text}
        </p>
        <VerdictChip verdict={record.verdict} />
      </div>

      <dl className="border-line mt-5 grid gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-[6.5rem_1fr]">
        <dt className={LABEL_CLASS}>Evidence</dt>
        <dd className="text-fog-300 text-sm leading-relaxed">{evidenceText(artifact, window, record)}</dd>

        <dt className={LABEL_CLASS}>Limits</dt>
        <dd>
          <ul className="text-fog-300 space-y-1 text-sm leading-relaxed">
            {limits.map((limit) => (
              <li key={limit} className="flex gap-2">
                <span aria-hidden="true" className="text-fog-600">
                  ·
                </span>
                <span>{limit}</span>
              </li>
            ))}
          </ul>
        </dd>

        <dt className={LABEL_CLASS}>Source</dt>
        <dd className="text-fog-500 font-mono text-xs leading-relaxed break-all">
          {sourceText(artifact)}
        </dd>
      </dl>

      {record.census ? (
        <div className="border-line mt-5 border-t pt-4">
          <p className={LABEL_CLASS}>Census</p>
          <ul className="text-fog-300 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
            {record.census.map((row) => (
              <li key={row.name}>
                <span className="text-fog-100 font-medium">{row.name}</span>{' '}
                <span className="text-fog-500">
                  {count(row.count)} of {count(row.n)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {record.verification ? (
        <div className="border-line mt-5 border-t pt-4">
          <p className={LABEL_CLASS}>Why it is not verifiable</p>
          <pre className="bg-ink-950 text-fog-300 mt-2 overflow-x-auto rounded-lg p-3 font-mono text-xs leading-relaxed">
            <code>{record.verification.query}</code>
          </pre>
          <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[7rem_1fr]">
            <dt className={LABEL_CLASS}>Today</dt>
            <dd className="text-fog-300 leading-relaxed">{record.verification.result_today}</dd>
            <dt className={LABEL_CLASS}>Unblocked by</dt>
            <dd className="text-fog-300 leading-relaxed">{record.verification.unblocked_by}</dd>
          </dl>
        </div>
      ) : null}
    </section>
  )
}

const LABEL_CLASS = 'text-fog-600 text-[11px] font-medium tracking-[0.14em] uppercase'

/** The verdict as a labelled chip: colour never carries it alone. */
export function VerdictChip({ verdict }: { verdict: AnswerRecord['verdict'] }) {
  const chip = verdictChip(verdict)
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

function verdictChip(verdict: AnswerRecord['verdict']): { label: string; className: string } {
  switch (verdict) {
    case 'answered':
      return { label: 'Answered', className: 'border-gold/40 text-gold' }
    case 'insufficient_data':
      return { label: 'Insufficient data', className: 'border-line-bright text-fog-300' }
    case 'not_verifiable':
      return { label: 'Not verifiable', className: 'border-side-red/40 text-side-red' }
  }
}

function grainText(grain: AnswerRecord['evidence']['grain']): string {
  switch (grain) {
    case 'game':
      return 'games'
    case 'player-game':
      return 'player-games'
    case 'champion-game':
      return 'champion-games'
    case 'side':
      return 'side rows'
    case 'award':
      return 'awards'
  }
}

function methodText(interval: Interval | null): string {
  if (!interval) return 'no estimate'
  switch (interval.method) {
    case 'wilson':
      return 'Wilson 95%'
    case 'bootstrap-percentile':
      return 'bootstrap 95%'
    case 'simulation-percentile':
      return 'simulation 90%'
  }
}

/**
 * The evidence line, in the order a reader weighs it: what was measured, on how
 * many rows, by which method, over which window, as of when.
 *
 * It deliberately repeats the denominator the headline's `n` states. A reader who
 * skims the sentence and a reader who reads the line below it must meet the same
 * number, not two.
 */
export function evidenceText(artifact: QuestionArtifact, window: Window, record: AnswerRecord): string {
  const { evidence } = record
  const grain = grainText(evidence.grain)
  const bits: string[] = [evidence.metric]

  if (evidence.part !== null && evidence.denominator !== null) {
    const total =
      evidence.denominator === evidence.n
        ? `${count(evidence.n)} ${grain}`
        : `${count(evidence.denominator)} ${
            evidence.metric === 'kill participation' ? 'team kills' : 'denominator'
          } over ${count(evidence.n)} ${grain}`
    bits.push(`${count(evidence.part)} of ${total}`)
  } else if (record.headline.unit === 'count' && record.headline.interval?.method === 'simulation-percentile') {
    bits.push(`${count(evidence.n)} simulations`)
  } else if (record.verdict === 'answered') {
    bits.push(`${count(evidence.n)} ${grain}`)
  }

  bits.push(methodText(record.headline.interval))
  if (artifact.class === 'champions') bits.push(evidence.role ?? 'all roles')

  bits.push(windowLabel(window))
  if (window.patches === 'all patches') bits.push('all patches')
  else bits.push(window.patches.join(', '))
  bits.push(`cut ${dayMonthYear(window.cut_date)}`)

  return bits.join(' · ')
}
