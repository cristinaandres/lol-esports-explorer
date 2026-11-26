import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar, Circle, Line } from '@visx/shape'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { useState } from 'react'

import { intervalText, metricText } from '../../lib/answer'
import type { Interval, Unit } from '../../lib/answer'
import { count } from '../../lib/format'
import { DataTable } from '../DataTable'
import { ChartFrame } from './ChartFrame'

export type BucketPoint = {
  key: string
  label: string
  value: number
  n: number
  part: number | null
  interval: Interval | null
}

const WIDTH = 660
const HEIGHT = 250
const MARGIN = { top: 16, right: 16, bottom: 48, left: 56 }

/**
 * One column per season (or event), with the interval drawn through the estimate.
 *
 * The x axis is a band because a season is a label, not a distance. The table beside it
 * carries the same buckets and their `n`, so a column that looks tall cannot be a
 * twenty-game season hiding beside a three-hundred-game one.
 */
export function BucketColumns({
  title,
  caption,
  points,
  unit,
  min = 0,
  max = 1,
}: {
  title: string
  caption: string
  points: BucketPoint[]
  unit: Unit
  min?: number
  max?: number
}) {
  const [active, setActive] = useState<string | null>(null)
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<BucketPoint>()

  const x = scaleBand<string>({
    domain: points.map((point) => point.key),
    range: [MARGIN.left, WIDTH - MARGIN.right],
    padding: 0.35,
  })
  const y = scaleLinear({
    domain: [min, max],
    range: [HEIGHT - MARGIN.bottom, MARGIN.top],
    nice: true,
  })
  const bottom = y(min)
  const every = Math.max(1, Math.ceil(points.length / 10))
  const tickValues = points.filter((_, index) => index % every === 0).map((point) => point.key)
  const show = (point: BucketPoint) => {
    setActive(point.key)
    showTooltip({
      tooltipData: point,
      tooltipLeft: (x(point.key) ?? 0) + x.bandwidth() / 2,
      tooltipTop: y(point.value),
    })
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
            { key: 'bucket', label: 'Bucket', primary: true, render: (point) => point.label },
            { key: 'value', label: 'Value', align: 'right', render: (point) => metricText(point.value, unit) },
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
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label={title}>
          <Group className="text-fog-600">
            <AxisLeft
              left={MARGIN.left}
              scale={y}
              stroke="currentColor"
              tickStroke="currentColor"
              numTicks={4}
              tickFormat={(value) => metricText(Number(value), unit)}
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 10, textAnchor: 'end' })}
            />
            <AxisBottom
              top={HEIGHT - MARGIN.bottom}
              left={0}
              scale={x}
              stroke="currentColor"
              tickStroke="currentColor"
              tickValues={tickValues}
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 9, textAnchor: 'middle' })}
            />
          </Group>
          {points.map((point) => {
            const top = y(point.value)
            const center = (x(point.key) ?? 0) + x.bandwidth() / 2
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
                onMouseEnter={() => show(point)}
                onMouseMove={() => show(point)}
                onMouseLeave={hide}
                onFocus={() => show(point)}
                onBlur={hide}
              >
                <Bar
                  x={x(point.key) ?? 0}
                  y={top}
                  width={x.bandwidth()}
                  height={Math.max(1, bottom - top)}
                  className={isActive ? 'fill-gold' : 'fill-fog-600'}
                />
                {point.interval ? (
                  <>
                    <Line
                      from={{ x: center, y: y(point.interval.low) }}
                      to={{ x: center, y: y(point.interval.high) }}
                      strokeWidth={2}
                      className="stroke-fog-300"
                    />
                    <Circle cx={center} cy={y(point.interval.low)} r={2.5} className="fill-fog-300" />
                    <Circle cx={center} cy={y(point.interval.high)} r={2.5} className="fill-fog-300" />
                  </>
                ) : null}
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
              {tooltipData.interval ? ` · ${intervalText(tooltipData.interval, unit, tooltipData.n)}` : ''}
            </p>
            <p className="text-fog-500">n = {count(tooltipData.n)}</p>
          </TooltipWithBounds>
        ) : null}
      </div>
    </ChartFrame>
  )
}
