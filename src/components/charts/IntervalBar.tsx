import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { Circle, Line } from '@visx/shape'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { useState } from 'react'

import { intervalText, metricText } from '../../lib/answer'
import type { Interval, Unit } from '../../lib/answer'
import { count } from '../../lib/format'
import { DataTable } from '../DataTable'
import { ChartFrame } from './ChartFrame'

const WIDTH = 660
const HEIGHT = 112
const MARGIN = { top: 22, right: 28, bottom: 38, left: 160 }

/**
 * One share, with its interval: the yes/no family's whole answer.
 *
 * A single point on a dot plot would suggest a ranking of one; a bar from the start of
 * the scale to the estimate, with the interval drawn through it, says what the number
 * is. The table below is the same record, so the tooltip never owns the only copy.
 */
export function IntervalBar({
  title,
  caption,
  label,
  value,
  n,
  unit,
  interval,
  min = 0,
  max = 1,
}: {
  title: string
  caption: string
  label: string
  value: number
  n: number
  unit: Unit
  interval: Interval
  min?: number
  max?: number
}) {
  const [active, setActive] = useState(false)
  const { tooltipOpen, showTooltip, hideTooltip } = useTooltip<null>()
  const x = scaleLinear({ domain: [min, max], range: [MARGIN.left, WIDTH - MARGIN.right], nice: true })
  const center = MARGIN.top + (HEIGHT - MARGIN.top - MARGIN.bottom) / 2

  const enter = () => {
    setActive(true)
    showTooltip({ tooltipData: null, tooltipLeft: x(value), tooltipTop: center })
  }
  const leave = () => {
    setActive(false)
    hideTooltip()
  }

  return (
    <ChartFrame
      title={title}
      caption={caption}
      table={
        <DataTable
          columns={[
            { key: 'metric', label: 'Metric', primary: true, render: () => label },
            { key: 'value', label: 'Value', align: 'right', render: () => metricText(value, unit) },
            { key: 'interval', label: '95% interval', align: 'right', render: () => intervalText(interval, unit, n) },
            { key: 'n', label: 'n', align: 'right', render: () => count(n) },
          ]}
          rows={[{ key: 'value' }]}
          rowKey={(row) => row.key}
          activeKey={active ? 'value' : null}
          onRowHover={(key) => {
            if (key === null) leave()
            else enter()
          }}
        />
      }
    >
      <div className="relative">
        <svg width={WIDTH} height={HEIGHT} role="img" aria-label={`${title}: ${metricText(value, unit)}`}>
          <Group className="text-fog-600">
            <AxisBottom
              top={HEIGHT - MARGIN.bottom}
              left={0}
              scale={x}
              stroke="currentColor"
              tickStroke="currentColor"
              numTicks={5}
              tickFormat={(tick) => metricText(Number(tick), unit)}
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 10, textAnchor: 'middle' })}
            />
          </Group>
          <g
            tabIndex={0}
            role="img"
            aria-label={`${label}: ${metricText(value, unit)}, ${intervalText(interval, unit, n)}, n=${count(n)}`}
            className="focus-visible:outline-gold cursor-pointer outline-none"
            onMouseEnter={enter}
            onMouseMove={enter}
            onMouseLeave={leave}
            onFocus={enter}
            onBlur={leave}
          >
            <rect
              x={x(min)}
              y={center - 9}
              width={Math.max(1, x(value) - x(min))}
              height={18}
              className="fill-gold"
              fillOpacity={0.18}
            />
            <Line
              from={{ x: x(interval.low), y: center }}
              to={{ x: x(interval.high), y: center }}
              strokeWidth={active ? 4 : 3}
              className={active ? 'stroke-gold' : 'stroke-fog-600'}
            />
            <Circle cx={x(value)} cy={center} r={active ? 7 : 5} className={active ? 'fill-gold' : 'fill-fog-100'} />
            <text
              x={MARGIN.left - 10}
              y={center}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-fog-300 text-[11px]"
            >
              {label}
            </text>
            <text
              x={x(value) + 10}
              y={center}
              dominantBaseline="middle"
              className="fill-fog-100 text-[11px] tabular-nums"
            >
              {metricText(value, unit)}
            </text>
          </g>
        </svg>
        {tooltipOpen ? (
          <TooltipWithBounds
            top={center - 34}
            left={x(value)}
            className="bg-ink-850 border-line text-fog-100 pointer-events-none rounded-lg border p-2 text-xs shadow-lg"
          >
            <p className="font-medium">{label}</p>
            <p className="text-fog-300 tabular-nums">
              {metricText(value, unit)} · {intervalText(interval, unit, n)}
            </p>
            <p className="text-fog-500">n = {count(n)}</p>
          </TooltipWithBounds>
        ) : null}
      </div>
    </ChartFrame>
  )
}
