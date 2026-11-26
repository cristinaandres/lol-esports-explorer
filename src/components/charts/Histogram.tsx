import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar, Line } from '@visx/shape'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { useState } from 'react'

import { count } from '../../lib/format'
import { Ratio } from '../Ratio'
import { DataTable } from '../DataTable'
import { ChartFrame } from './ChartFrame'

export type HistogramBin = {
  key: string
  label: string
  count: number
}

const WIDTH = 660
const HEIGHT = 250
const MARGIN = { top: 12, right: 16, bottom: 48, left: 52 }

/**
 * A distribution, one bar per bin.
 *
 * The table beside it carries the same bins and each bin's share of the total, so a
 * reader can check the shape against the numbers. The x labels are the pipeline's, not
 * a formatting guess made here: a bin is a range and the model's unit decides how it
 * reads.
 */
export function Histogram({
  title,
  caption,
  bins,
  total,
  marker = null,
}: {
  title: string
  caption: string
  bins: HistogramBin[]
  total: number
  marker?: { key: string; label: string } | null
}) {
  const [active, setActive] = useState<string | null>(null)
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<HistogramBin>()

  const x = scaleBand<string>({
    domain: bins.map((bin) => bin.key),
    range: [MARGIN.left, WIDTH - MARGIN.right],
    padding: 0.12,
  })
  const y = scaleLinear({
    domain: [0, Math.max(1, ...bins.map((bin) => bin.count))],
    range: [HEIGHT - MARGIN.bottom, MARGIN.top],
    nice: true,
  })
  const every = Math.max(1, Math.ceil(bins.length / 8))
  const tickValues = bins.filter((_, index) => index % every === 0).map((bin) => bin.key)
  const show = (bin: HistogramBin) => {
    setActive(bin.key)
    showTooltip({
      tooltipData: bin,
      tooltipLeft: (x(bin.key) ?? 0) + x.bandwidth() / 2,
      tooltipTop: y(bin.count),
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
            { key: 'bin', label: 'Bin', primary: true, render: (bin) => bin.label },
            { key: 'count', label: 'Games', align: 'right', render: (bin) => count(bin.count) },
            {
              key: 'share',
              label: 'Share',
              align: 'right',
              render: (bin) => <Ratio part={bin.count} total={total} />,
            },
          ]}
          rows={bins}
          rowKey={(bin) => bin.key}
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
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 10, textAnchor: 'end' })}
            />
            <AxisBottom
              top={HEIGHT - MARGIN.bottom}
              left={0}
              scale={x}
              stroke="currentColor"
              tickStroke="currentColor"
              tickValues={tickValues}
              tickLabelProps={() => ({ fill: 'currentColor', fontSize: 9, textAnchor: 'end' })}
            />
          </Group>
          {marker && x(marker.key) !== undefined ? (
            <g>
              <Line
                from={{ x: x(marker.key) ?? 0, y: MARGIN.top }}
                to={{ x: x(marker.key) ?? 0, y: HEIGHT - MARGIN.bottom }}
                strokeWidth={2}
                strokeDasharray="4 4"
                className="stroke-gold"
              />
              <text x={(x(marker.key) ?? 0) + 4} y={MARGIN.top - 2} className="fill-gold text-[10px]">
                {marker.label}
              </text>
            </g>
          ) : null}
          {bins.map((bin) => {
            const top = y(bin.count)
            const isActive = active === bin.key
            return (
              <g
                key={bin.key}
                tabIndex={0}
                role="img"
                aria-label={`${bin.label}: ${count(bin.count)} of ${count(total)} games`}
                className="focus-visible:outline-gold cursor-pointer outline-none"
                onMouseEnter={() => show(bin)}
                onMouseMove={() => show(bin)}
                onMouseLeave={hide}
                onFocus={() => show(bin)}
                onBlur={hide}
              >
                <Bar
                  x={x(bin.key) ?? 0}
                  y={top}
                  width={x.bandwidth()}
                  height={HEIGHT - MARGIN.bottom - top}
                  className={isActive ? 'fill-gold' : 'fill-fog-600'}
                />
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
              {count(tooltipData.count)} of {count(total)} games
            </p>
          </TooltipWithBounds>
        ) : null}
      </div>
    </ChartFrame>
  )
}
