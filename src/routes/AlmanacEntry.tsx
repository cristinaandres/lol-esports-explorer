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
import { orderRule, recordFor, seasonOptions, windowByKey, windowLabel } from '../lib/answer'
import type { End, QuestionArtifact, QuestionId, Unit } from '../lib/answer'
import { useQuestion } from '../lib/data'
import { count, dayMonthYear } from '../lib/format'
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
  const controls = (value: string) => (
    <TimeControls
      season={value}
      end={effectiveEnd}
      top={top}
      seasons={seasonOptions(artifact)}
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
        <div className="mb-8">{controls('all')}</div>
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-4 text-sm leading-relaxed">
          {season === 'all'
            ? 'This question has no all-games window.'
            : `Season ${season} is not published for this question.`}{' '}
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
        <div className="mb-8">{controls(season)}</div>
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
  const kdaColumns: Column<DotPoint>[] = [
    {
      key: 'kills',
      label: 'Kills',
      align: 'right',
      render: (point) =>
        point.components?.kills === null || point.components?.kills === undefined
          ? '—'
          : count(Number(point.components.kills)),
    },
    {
      key: 'deaths',
      label: 'Deaths',
      align: 'right',
      render: (point) =>
        point.components?.deaths === null || point.components?.deaths === undefined
          ? '—'
          : count(Number(point.components.deaths)),
    },
    {
      key: 'assists',
      label: 'Assists',
      align: 'right',
      render: (point) =>
        point.components?.assists === null || point.components?.assists === undefined
          ? '—'
          : count(Number(point.components.assists)),
    },
    {
      key: 'kp',
      label: 'Kill participation',
      align: 'right',
      render: (point) => (point.components?.kp ? String(point.components.kp) : '—'),
    },
  ]
  const killsColumns: Column<DotPoint>[] = [
    {
      key: 'kills',
      label: 'Kills',
      align: 'right',
      render: (point) =>
        point.components?.kills === null || point.components?.kills === undefined
          ? '—'
          : count(Number(point.components.kills)),
    },
  ]
  const teamKillsColumns: Column<DotPoint>[] = [
    {
      key: 'team_kills',
      label: 'Team kills',
      align: 'right',
      render: (point) =>
        point.components?.team_kills === null || point.components?.team_kills === undefined
          ? '—'
          : count(Number(point.components.team_kills)),
    },
  ]
  const extraColumns =
    artifact.id === 'champion-kda' || artifact.id === 'player-kda'
      ? kdaColumns
      : artifact.id === 'player-kills'
        ? killsColumns
        : artifact.id === 'player-kill-participation'
          ? teamKillsColumns
          : undefined
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
      />
    ) : null

  const binsChart =
    record.bins && record.bins.length > 0 ? (
      <Histogram
        title={artifact.id === 'unique-champions' ? 'The simulation' : 'The distribution'}
        caption={
          artifact.id === 'unique-champions'
            ? `${count(record.evidence.n)} simulated seasons; the answer above is the median and the 90% interval.`
            : `${count(record.evidence.n)} player-games in this window; the line marks ${record.marker?.label ?? 'the threshold'}.`
        }
        bins={record.bins.map((bin) => ({ key: bin.key, label: bin.label, count: bin.count }))}
        total={record.evidence.n}
        marker={record.marker ?? null}
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
      <div className="mb-8">{controls(season)}</div>

      <StatRow>
        <Stat label="Season" value={window.season === null ? 'All games' : String(window.season)} />
        <Stat label="Games" value={count(window.games)} />
        <Stat label="Events" value={count(window.events)} />
        <Stat label="Patches" value={patchText} />
        <Stat label="Cut" value={dayMonthYear(window.cut_date)} />
      </StatRow>

      <div className="mt-8">
        <Answer artifact={artifact} window={window} end={effectiveEnd} />
      </div>

      {artifact.family === 'top-1' ? (
        <p className="text-fog-600 mt-4 max-w-3xl text-xs leading-relaxed">
          {topLabel(top)}, {orderRule(effectiveEnd)}. The artifact stores up to{' '}
          {artifact.thresholds.top_max} candidates; a tie at the last place extends the list by one.
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
