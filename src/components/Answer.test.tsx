import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Answer, evidenceText } from './Answer'
import { championKda, championWinRate, presence, regions, teemo } from '../lib/answerFixtures'

describe('the Answer block', () => {
  it('renders the four blocks together, with the limits in the DOM', () => {
    const window = presence.windows[1]
    const html = renderToStaticMarkup(<Answer artifact={presence} window={window} end={null} censusTitle="Champions under 20 presences" />)

    expect(html).toContain('64% (95% CI: 57–70%, n=232)')
    expect(html).toContain('148 of 232 games')
    expect(html).toContain('Season 2025')
    expect(html).toContain('cut 9 Nov 2025')
    expect(html).toContain('Answered')

    // The limits are visible text, not a title attribute or a hover.
    for (const limit of presence.limits) expect(html).toContain(`>${limit}<`)
    expect(html).toContain('pin f919082a')
  })

  it('writes the evidence line in the order a reader weighs it', () => {
    const window = presence.windows[1]
    expect(evidenceText(presence, window, window.records.best!)).toBe(
      'presence · 148 of 232 games · Wilson 95% · all roles · Season 2025 · 25.05, 25.13, 25.2 · cut 9 Nov 2025',
    )
  })

  it('keeps the champion KDA’s components and its method visible', () => {
    const window = championKda.windows[0]
    const html = renderToStaticMarkup(<Answer artifact={championKda} window={window} end={null} censusTitle="Champions under 20 champion-games" />)

    expect(html).toContain('8.44 (95% CI: 5.25–14.95, n=21)')
    expect(html).toContain('bootstrap 95%')
    expect(html).toContain('champion-games')
    expect(html).toContain('all roles')
  })

  it('renders the other end of a two-ended card', () => {
    const html = renderToStaticMarkup(
      <Answer
        artifact={championWinRate}
        window={championWinRate.windows[0]}
        end="worst"
        censusTitle="Champions under 20 picks"
      />,
    )
    expect(html).toContain('33% (95% CI: 22–46%, n=61)')
    expect(html).toContain('Answered')
  })

  it('renders insufficient data with its census and without an interval', () => {
    const html = renderToStaticMarkup(
      <Answer artifact={teemo} window={teemo.windows[0]} end={null} censusTitle="Presences of Teemo" />,
    )
    expect(html).toContain('Insufficient data')
    expect(html).toContain('4 of 3,091 games')
    expect(html).toContain('Presences of Teemo')
    expect(html).toContain('Teemo')
    expect(html).not.toContain('95% CI')
  })

  it('renders the verification query and the unblocking decision, and no answer', () => {
    const html = renderToStaticMarkup(
      <Answer artifact={regions} window={regions.windows[0]} end={null} censusTitle="Regions in knockouts" />,
    )
    expect(html).toContain('Not verifiable')
    expect(html).toContain('select count(distinct tab)')
    expect(html).toContain('73 distinct tab labels')
    expect(html).toContain('Unblocked by')
    expect(html).not.toContain('95% CI')
  })

  it('renders nothing for an end the card does not publish', () => {
    const html = renderToStaticMarkup(<Answer
        artifact={presence}
        window={presence.windows[1]}
        end="worst"
        censusTitle="Champions under 20 presences"
      />)
    expect(html).toBe('')
  })
})
