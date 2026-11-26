import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Circle, Line } from '@visx/shape'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { useState } from 'react'
import { Link } from 'react-router'

import { intervalText, metricText } from '../../lib/answer'
import type { Interval, Unit } from '../../lib/answer'
import { count } from '../../lib/format'
import { DataTable } from '../DataTable'
import { ChartFrame } from './ChartFrame'

export type DotPoint = {
  key: string
  label: string
  value: number
  low: number
  high: number
  n: number
  part: number | null
  interval: Interval | null
  href?: string
}

const WIDTH = 660
const ROW = 34
const MARGIN = { top: 12, right: 28, bottom: 38, left: 150 }

/**
 * The top-K dot plot: the estimate is a dot, the interval a line through it.
 *
 * Ordered by the bound the caller passed, never by the point estimate. Hovering or
 * focusing a mark opens the same numbers the table below carries, so the tooltip is a
 * convenience rather than the only place a value lives. The table highlights the row the
 * mark points at, and the reverse, because comparing a list to a plot is the interaction
 * this card exists for.
 */
export function IntervalDotPlot({
  title,
  caption,
  points,
  unit,
  min = 0,
  max = 1,
}: {
  title: string
  caption: string
  points: DotPoint[]
  unit: Unit
  min?: number
  max?: number
}) {
  const [active, setActive] = useState<string | null>(null)
  const height = Math.max(120, points.length * ROW + MARGIN.top + MARGIN.bottom)
  const x = scaleLinear({ domain: [min, max], range: [MARGIN.left, WIDTH - MARGIN.right], nice: true })
  const y = scaleBand<string>({
    domain: points.map((point) => point.key),
    range: [MARGIN.top, height - MARGIN.bottom],
    padding: 0.28,
  })
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<DotPoint>()

  const show = (point: DotPoint, left: number, top: number) => {
    setActive(point.key)
    showTooltip({ tooltipData: point, tooltipLeft: left, tooltipTop: top })
  }
  const hide = () => {
    setActive(null)
    hideTooltip()
  }

  return (
    <ChartFrame
      title={title}
      caption={caption}
      table={
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Candidate',
              primary: true,
              render: (point) =>
                point.href ? (
                  <Link className="text-fog-100 hover:text-gold underline-offset-2 hover:underline" to={point.href}>
                    {point.label}
                  </Link>
                ) : (
                  point.label
                ),
            },
            {
              key: 'value',
              label: 'Value',
              align: 'right',
              render: (point) => metricText(point.value, unit),
            },
            {
              key: 'interval',
              label: '95% interval',
              align: 'right',
              render: (point) => (point.interval ? intervalText(point.interval, unit, point.n) : '—'),
            },
            { key: 'n', label: 'n', align: 'right', render: (point) => count(point.n) },
          ]}
          rows={points}
          rowKey={(point) => point.key}
          activeKey={active}
          onRowHover={(key) => setActive(key === null ? null : String(key))}
        />
      }
    >
      <div className="relative">
        <svg width={WIDTH} height={height} role="img" aria-label={title}>
          <Group className="text-fog-600">
            <AxisBottom
              top={height - MARGIN.bottom}
              left={0}
              scale={x}
              stroke="currentColor"
              tickStroke="currentColor"
              numTicks={5}
              tickFormat={(value) => metricText(Number(value), unit)}
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 10, textAnchor: 'middle' })}
            />
          </Group>
          {points.map((point) => {
            const top = y(point.key) ?? 0
            const center = top + y.bandwidth() / 2
            const isActive = active === point.key
            return (
              <g
                key={point.key}
                tabIndex={0}
                role="img"
                aria-label={`${point.label}: ${metricText(point.value, unit)}${
                  point.interval ? `, ${intervalText(point.interval, unit, point.n)}` : ''
                }, n=${count(point.n)}`}
                className="focus-visible:outline-gold cursor-pointer outline-none"
                onMouseEnter={() => show(point, x(point.value), center)}
                onMouseMove={() => show(point, x(point.value), center)}
                onMouseLeave={hide}
                onFocus={() => show(point, x(point.value), center)}
                onBlur={hide}
              >
                <Line
                  from={{ x: x(point.low), y: center }}
                  to={{ x: x(point.high), y: center }}
                  strokeWidth={isActive ? 3 : 2}
                  className={isActive ? 'stroke-gold' : 'stroke-fog-600'}
                />
                <Circle
                  cx={x(point.value)}
                  cy={center}
                  r={isActive ? 6 : 4.5}
                  className={isActive ? 'fill-gold' : 'fill-fog-300'}
                />
                <text
                  x={MARGIN.left - 10}
                  y={center}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-fog-300 text-[11px]"
                >
                  {point.label}
                </text>
                <text
                  x={x(point.value) + 9}
                  y={center}
                  dominantBaseline="middle"
                  className="fill-fog-500 text-[10px] tabular-nums"
                >
                  {metricText(point.value, unit)}
                </text>
              </g>
            )
          })}
        </svg>
        {tooltipOpen && tooltipData ? (
          <TooltipWithBounds
            top={tooltipTop}
            left={tooltipLeft}
            className="bg-ink-850 border-line text-fog-100 pointer-events-none rounded-lg border p-2 text-xs shadow-lg"
          >
            <p className="font-medium">{tooltipData.label}</p>
            <p className="text-fog-300 tabular-nums">
              {metricText(tooltipData.value, unit)}
              {tooltipData.interval
                ? ` · ${intervalText(tooltipData.interval, unit, tooltipData.n)}`
                : ''}
            </p>
            <p className="text-fog-500">n = {count(tooltipData.n)}</p>
            {tooltipData.href ? (
              <Link className="text-gold mt-1 inline-block underline-offset-2 hover:underline" to={tooltipData.href}>
                Open
              </Link>
            ) : null}
          </TooltipWithBounds>
        ) : null}
      </div>
    </ChartFrame>
  )
}
