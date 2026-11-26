import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { Interval } from '../../lib/answer'
import { BucketColumns } from './BucketColumns'
import { Histogram } from './Histogram'
import { IntervalBar } from './IntervalBar'
import { IntervalDotPlot } from './IntervalDotPlot'
import { TimeControls } from './TimeControls'

const wilson = (low: number, high: number): Interval => ({ level: 0.95, low, high, method: 'wilson' })

const points = [
  {
    key: 'azir',
    label: 'Azir',
    value: 0.638,
    low: 0.574,
    high: 0.697,
    n: 232,
    part: 148,
    interval: wilson(0.574, 0.697),
    href: '/champions/ch-1',
  },
  {
    key: 'poppy',
    label: 'Poppy',
    value: 0.578,
    low: 0.514,
    high: 0.639,
    n: 232,
    part: 134,
    interval: wilson(0.514, 0.639),
    href: '/champions/ch-2',
  },
]

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('the chart layer', () => {
  it('draws the top-K with its table, the same numbers in both', () => {
    const html = render(
      <IntervalDotPlot
        title="Presence, season 2025"
        caption="Ordered by the lower bound; the line is the 95% interval. n = 232 games."
        points={points}
        unit="share"
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('Azir')
    expect(html).toContain('64%')
    expect(html).toContain('95% CI: 57–70%')
    expect(html).toContain('232')
    expect(html).toContain('Ordered by the lower bound')
  })

  it('draws one share with its interval', () => {
    const html = render(
      <IntervalBar
        title="Teemo, all games"
        caption="Teemo was picked in 4 of the 3,091 games. n = 3,091 games."
        label="Teemo"
        value={0.0013}
        n={3091}
        unit="share"
        interval={wilson(0.0003, 0.003)}
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('Teemo')
    expect(html).toContain('3,091')
    expect(html).toContain('0.13%')
  })

  it('draws a histogram with each bin’s share of the total', () => {
    const html = render(
      <Histogram
        title="Game length"
        caption="A game is counted once, not once per side. n = 3,084 games with a stated duration."
        bins={[
          { key: 'fast', label: '≤ 32:00', count: 1513 },
          { key: 'slow', label: '> 32:00', count: 1571 },
        ]}
        total={3084}
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('≤ 32:00')
    expect(html).toContain('1,513')
    expect(html).toContain('3,084')
    expect(html).toContain('49%')
  })

  it('draws a column per bucket with its interval', () => {
    const html = render(
      <BucketColumns
        title="Presence by season"
        caption="One column per season; the line is the 95% interval."
        points={[
          { key: '2024', label: '2024', value: 0.61, n: 208, part: 127, interval: wilson(0.545, 0.676) },
          { key: '2025', label: '2025', value: 0.638, n: 232, part: 148, interval: wilson(0.574, 0.697) },
        ]}
        unit="share"
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('2025')
    expect(html).toContain('64%')
  })

  it('offers the season, the end and the ranking as controls', () => {
    const html = renderToStaticMarkup(
      <TimeControls
        season="2025"
        end="best"
        top={10}
        seasons={[{ value: '2025', label: 'Season 2025' }]}
        ends={['best', 'worst']}
        onChange={() => undefined}
      />,
    )

    expect(html).toContain('All games')
    expect(html).toContain('Season 2025')
    expect(html).toContain('Worst')
    expect(html).toContain('Top 10')
    expect(html).toContain('Top 20')
  })
})
