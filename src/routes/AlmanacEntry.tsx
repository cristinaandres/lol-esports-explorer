import { useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Answer } from '../components/Answer'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { BucketColumns, Histogram, IntervalBar, IntervalDotPlot, TimeControls } from '../components/charts'
import type { BucketPoint, DotPoint } from '../components/charts'
import { LoadFailure } from '../components/LoadFailure'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Skeleton'
import { Stat, StatRow } from '../components/Stat'
import type { Column } from '../components/DataTable'
import { pageConfig } from '../lib/almanacPages'
import type { ColumnSpec } from '../lib/almanacPages'
import {
  candidateSlice,
  classLabel,
  familyLabel,
  hasWorst,
  isQuestionId,
  parseEnd,
  parseSeason,
  parseTop,
  rangeFor,
  seriesRange,
  topLabel,
  updateParams,
  windowFor,
} from '../lib/almanac'
import { orderRule, percentNumber, percentOf, recordFor, seasonOptions, windowByKey, windowLabel } from '../lib/answer'
import type { End, QuestionArtifact, QuestionId, Unit } from '../lib/answer'
import { useQuestion } from '../lib/data'
import { count, dayMonthYear, stripDateSuffix } from '../lib/format'
import NotFound from './NotFound'

/**
 * One question's page: the Answer, then the evidence the Answer is a summary of.
 *
 * The route owns the URL and the fetch; the view is pure so a test can render it
 * with the committed artifact. The controls are query parameters, so a view is a
 * link: `?season=2025&end=worst&top=10`.
 */
export default function AlmanacEntryRoute() {
  const { id } = useParams()
  if (!isQuestionId(id)) return <NotFound />
  return <KnownEntry id={id} />
}

function KnownEntry({ id }: { id: QuestionId }) {
  const state = useQuestion(id)
  const [params, setParams] = useSearchParams()

  if (state.status === 'loading') return <Skeleton shape="page" />
  if (state.status === 'failed')
    return <LoadFailure failures={[{ what: 'this question', error: state.error }]} onRetry={state.retry} />

  return (
    <AlmanacEntryView
      artifact={state.data}
      season={parseSeason(params.get('season'))}
      end={parseEnd(params.get('end'))}
      top={parseTop(params.get('top'))}
      onChange={(patch) => setParams(updateParams(params, patch))}
    />
  )
}

export function AlmanacEntryView({
  artifact,
  season,
  end,
  top,
  onChange,
}: {
  artifact: QuestionArtifact
  season: string
  end: End | null
  top: number
  onChange: (patch: { season?: string; end?: End; top?: number }) => void
}) {
  const worst = hasWorst(artifact)
  const effectiveEnd: End | null = worst ? end : null
  const window = windowFor(artifact, season)
  const config = pageConfig(artifact.id)
  const seasons = seasonOptions(artifact)
  const controlRow = seasons.length > 0 || worst || artifact.family === 'top-1'
  const carried = seasons.length
    ? `It carries ${seasons[seasons.length - 1].label} to ${seasons[0].label}, and all games.`
    : 'It carries all games only.'
  const [answerOpen, setAnswerOpen] = useState(false)
  const answerId = useId()
  const controls = (value: string) => (
    <TimeControls
      season={value}
      end={effectiveEnd}
      top={top}
      seasons={seasons}
      ends={worst ? ['best', 'worst'] : ['best']}
      showTop={artifact.family === 'top-1'}
      onChange={onChange}
    />
  )
  const header = (
    <>
      <Breadcrumbs items={[{ label: 'The Almanac', to: '/almanac' }, { label: artifact.question }]} />
      <PageHeader
        eyebrow={`${classLabel(artifact.class)} · ${familyLabel(artifact.family)}`}
        title={artifact.question}
        lead="One record from a window of the past: the number, its interval, the sample and the sentences that say what it does not license. The window is a season, and the cut date is part of the answer."
      />
    </>
  )

  if (!window) {
    return (
      <>
        {header}
        {controlRow ? <div className="mb-8">{controls('all')}</div> : null}
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-4 text-sm leading-relaxed">
          {season === 'all'
            ? 'This question has no all-games window.'
            : `Season ${season} is not published for this question. ${carried}`}{' '}
          <Link className="text-gold" to={`/almanac/${artifact.id}`}>
            Open all games
          </Link>
          .
        </p>
      </>
    )
  }

  const record = recordFor(window, effectiveEnd)
  if (!record) {
    return (
      <>
        {header}
        {controlRow ? <div className="mb-8">{controls(season)}</div> : null}
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-4 text-sm leading-relaxed">
          This window has no record for that end.
        </p>
      </>
    )
  }

  const unit: Unit = record.headline.unit ?? 'share'
  const patchText = window.patches === 'all patches' ? 'All patches' : window.patches.join(', ')
  const windowText = `${windowLabel(window)} · ${count(window.games)} games · ${patchText} · cut ${dayMonthYear(window.cut_date)}`
  const leader = artifact.family === 'top-1' ? windowByKey(artifact, 'all')?.records.best?.candidates?.[0]?.name : null
  const points = record.candidates
    ? candidateSlice(record, effectiveEnd, top).map((candidate) => ({
        key: candidate.path,
        label: candidate.name,
        value: candidate.metric,
        low: candidate.lower_bound,
        high: candidate.upper_bound,
        n: candidate.n,
        part: candidate.part,
        interval: candidate.interval,
        href: candidate.path,
        components: candidate.components,
      }))
    : []
  const bounds = rangeFor(
    points.flatMap((point) => [point.low, point.high]),
    unit,
  )
  const extraColumns = columnsFor(config.columns)
  const seriesPoints: BucketPoint[] = artifact.series.map((point) => ({
    key: point.label,
    label: point.label,
    value: point.value,
    n: point.n,
    part: point.part,
    interval: point.interval,
  }))
  const seriesBounds = seriesRange(artifact.series, unit)

  const rule = orderRule(effectiveEnd)
  const ruleLabel = rule.charAt(0).toUpperCase() + rule.slice(1)
  const chart =
    record.verdict === 'answered' && points.length > 0 ? (
      <IntervalDotPlot
        title={`${topLabel(top)} · ${windowLabel(window)}`}
        caption={`${windowText}. ${ruleLabel}; n is each candidate's sample.${
          points.length > top ? ' A tie at the last place extends the list by one.' : ''
        }`}
        points={points}
        unit={unit}
        min={bounds.min}
        max={bounds.max}
        extraColumns={extraColumns}
      />
    ) : record.verdict === 'answered' &&
      record.headline.unit === 'share' &&
      record.headline.value !== null &&
      record.headline.interval ? (
      <IntervalBar
        title={record.evidence.metric}
        caption={`${windowText}. The bar is the 95% interval; the dot is the estimate.`}
        label={record.evidence.metric}
        value={record.headline.value}
        n={record.headline.n}
        unit="share"
        interval={record.headline.interval}
        min={0}
        max={1}
      />
    ) : record.verdict === 'insufficient_data' &&
      artifact.family === 'categorical' &&
      record.census &&
      record.census.length > 0 ? (
      <Histogram
        title="The census by group"
        caption={`${windowText}. A census, not an estimate.`}
        bins={record.census.map((row) => ({ key: row.name, label: row.name, count: row.count }))}
        total={record.evidence.n}
        unitLabel="awards"
      />
    ) : null

  const binTotal = record.bins?.reduce((sum, bin) => sum + bin.count, 0) ?? 0
  const binsChart =
    record.bins && record.bins.length > 0 ? (
      <Histogram
        title={config.histogram?.title ?? 'The distribution'}
        caption={
          config.histogram
            ? config.histogram.caption(binTotal, record.marker?.label ?? 'the threshold')
            : `${count(binTotal)} rows in this window; the line marks ${record.marker?.label ?? 'the threshold'}.`
        }
        bins={record.bins.map((bin) => ({ key: bin.key, label: bin.label, count: bin.count }))}
        total={binTotal}
        marker={record.marker ?? null}
        unitLabel={config.histogram?.unit ?? 'rows'}
      />
    ) : null

  const seriesChart =
    effectiveEnd !== 'worst' && record.verdict === 'answered' && seriesPoints.length > 0 ? (
      <BucketColumns
        title="By season"
        caption={
          artifact.family === 'count'
            ? 'Observed distinct champions per season; the answer above is the simulation over the season’s games.'
            : `${
                leader ? `${leader}, the all-games leader, across` : 'The same question across'
              } the seasons that reached n ≥ 20. Every point carries its own interval and sample.`
        }
        points={seriesPoints}
        unit={unit}
        min={seriesBounds.min}
        max={seriesBounds.max}
      />
    ) : null

  return (
    <>
      {header}
      {controlRow ? <div className="mb-8">{controls(season)}</div> : null}

      <StatRow>
        <Stat label="Season" value={window.season === null ? 'All games' : String(window.season)} />
        <Stat label="Games" value={count(window.games)} />
        <Stat label="Events" value={count(window.events)} />
        <Stat label="Patches" value={patchText} />
        <Stat label="Cut" value={dayMonthYear(window.cut_date)} />
      </StatRow>

      <div className="mt-8">
        <button
          type="button"
          aria-expanded={answerOpen}
          aria-controls={answerId}
          onClick={() => setAnswerOpen((open) => !open)}
          className="border-line bg-ink-900 hover:border-line-bright hover:bg-ink-850 flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors"
        >
          <span className="flex flex-col gap-1">
            <span className="text-fog-100 text-sm font-semibold tracking-tight">
              {answerOpen ? 'Hide the answer' : 'Show the answer'}
            </span>
            <span className="text-fog-500 text-xs">
              {record.verdict === 'not_verifiable'
                ? 'Why this cannot be answered, the query that shows it, and what would unblock it.'
                : 'The number, its interval and its sample; the evidence, the limits and the source.'}
            </span>
          </span>
          <span aria-hidden="true" className="text-fog-600 font-mono text-sm">
            {answerOpen ? '−' : '+'}
          </span>
        </button>
        {record.verdict === 'not_verifiable' ? null : (
          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            An estimate is published from {artifact.thresholds.min_n} games up; below that the
            answer keeps the counts as a census.
          </p>
        )}
        <div id={answerId} hidden={!answerOpen} className="mt-4">
          <Answer
            artifact={artifact}
            window={window}
            end={effectiveEnd}
            censusTitle={config.census}
          />
        </div>
      </div>

      {artifact.family === 'top-1' ? (
        <p className="text-fog-600 mt-4 max-w-3xl text-xs leading-relaxed">
          {topLabel(top)}, {orderRule(effectiveEnd)}. The artifact stores up to{' '}
          {artifact.thresholds.top_max} candidates; a tie at the last place extends the list by one.
        </p>
      ) : null}

      {record.citation ? (
        <p className="text-fog-500 mt-4 max-w-3xl text-sm">
          Record holder:{' '}
          <Link
            className="text-fog-100 hover:text-gold underline-offset-2 hover:underline"
            to={record.citation.path}
          >
            {stripDateSuffix(record.citation.label)}
          </Link>{' '}
          · {record.citation.detail}
        </p>
      ) : null}

      {chart}
      {binsChart}
      {seriesChart}

      <p className="text-fog-600 mt-10 max-w-3xl text-xs leading-relaxed">
        The cards on <Link to="/almanac">the index</Link> carry the all-games headline. A shared
        link carries its season, its end and its K.
      </p>
    </>
  )
}

/**
 * The recipe's columns, as the table wants them.
 *
 * Every column prints the pipeline's numbers and nothing else: a count as a count, a
 * share with its interval beside it and never on its own. A component the record does
 * not carry is an em dash, because this site prints absence as absence, not as zero.
 */
function columnsFor(specs: ColumnSpec[]): Column<DotPoint>[] {
  return specs.map((spec) => ({
    key: spec.key,
    label: spec.label,
    align: 'right',
    render: (point) => componentText(point, spec),
  }))
}

/**
 * One cell of the ranking table.
 *
 * A count prints as a count. A share prints its interval beside it, and names its own
 * sample when that sample is not the row's: kill participation is measured on the
 * games that state side kills, which can be fewer than the champion's games. A
 * component the record does not carry is an em dash — absence is never a zero, and a
 * share is never printed without the interval that qualifies it.
 */
function componentText(point: DotPoint, spec: ColumnSpec): string {
  const value = point.components?.[spec.key]
  if (value === null || value === undefined) return '—'
  if (spec.kind === 'count') return count(value)

  const low = point.components?.[`${spec.key}_low`]
  const high = point.components?.[`${spec.key}_high`]
  if (low === null || low === undefined || high === null || high === undefined) return '—'

  const sample = point.components?.[`${spec.key}_n`]
  const own = sample === null || sample === undefined || sample === point.n ? '' : `, n=${count(sample)}`
  return `${percentOf(value)} (${percentNumber(low)}–${percentNumber(high)}%${own})`
}
