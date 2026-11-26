import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { End, QuestionArtifact } from '../lib/answer'
import { count } from '../lib/format'
import { AlmanacEntryView } from './AlmanacEntry'

const read = (name: string): QuestionArtifact =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as QuestionArtifact

function render(artifact: QuestionArtifact, season: string, end: End | null = null, top = 5): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AlmanacEntryView artifact={artifact} season={season} end={end} top={top} onChange={() => undefined} />
    </MemoryRouter>,
  )
}

describe('the Almanac entry page', () => {
  it('renders the season, its patches, its cut and the top five', () => {
    const artifact = read('almanac-champion-presence.json')
    const html = render(artifact, '2025')

    expect(html).toContain('64% (95% CI: 57–70%, n=232)')
    expect(html).toContain('Season 2025')
    expect(html).toContain('25.05, 25.13, 25.2')
    expect(html).toContain('cut 9 Nov 2025')
    expect(html).toContain('Top 5')
    expect(html).toContain('ordered by the lower bound')
    expect(html).toContain('Answered')
    expect(html).toContain('Azir')
    expect(html).toContain('Yunara')
    expect(html).toContain('Poppy')
    expect(html).toContain('Rakan')
    expect(html).toContain('By season')
    expect(html).toContain('232')
  })

  it('slices the stored ranking to the K the URL asks for', () => {
    const artifact = read('almanac-champion-presence.json')
    const window = artifact.windows.find((item) => item.key === 'season:2025')!
    const tenth = window.records.best!.candidates![9].name
    const html = render(artifact, '2025', null, 10)

    expect(html).toContain('Top 10')
    expect(html).toContain(tenth)
  })

  it('switches to the worst end and orders it by the upper bound', () => {
    const artifact = read('almanac-champion-win-rate.json')
    const record = artifact.windows[0].records.worst!
    const html = render(artifact, 'all', 'worst')

    expect(html).toContain(record.headline.text)
    expect(html).toContain('Malphite')
    expect(html).toContain('ordered by the upper bound')
    expect(html).not.toContain('By season')
  })

  it('says so when the season is not published, and offers all games', () => {
    const artifact = read('almanac-champion-presence.json')
    const html = render(artifact, '1999')

    expect(html).toContain('Season 1999 is not published')
    expect(html).toContain('Open all games')
    expect(html).not.toContain('64% (95% CI')
  })

  it('shows the champion KDA with kills, deaths, assists and kill participation', () => {
    const artifact = read('almanac-champion-kda.json')
    const html = render(artifact, '2025')

    expect(html).toContain('8.44 (95% CI:')
    expect(html).toContain('Kills')
    expect(html).toContain('Deaths')
    expect(html).toContain('Assists')
    expect(html).toContain('Kill participation')
    expect(html).toContain('Senna')
    expect(html).toContain('208')
  })

  it('shows the player kills rate with its total beside it', () => {
    const artifact = read('almanac-player-kills.json')
    const record = artifact.windows[0].records.best!
    const html = render(artifact, 'all')

    expect(html).toContain('Kills')
    expect(html).toContain(record.candidates![0].name)
    expect(html).toContain(count(Number(record.candidates![0].components!.kills)))
  })

  it('shows the kill-participation denominator', () => {
    const artifact = read('almanac-player-kill-participation.json')
    const record = artifact.windows[0].records.best!
    const html = render(artifact, 'all')

    expect(html).toContain('Team kills')
    expect(html).toContain(record.candidates![0].name)
    expect(html).toContain(count(Number(record.candidates![0].components!.team_kills)))
  })

  it('shows the player KDA with its kills, deaths and assists', () => {
    const artifact = read('almanac-player-kda.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Kills')
    expect(html).toContain('Deaths')
    expect(html).toContain('Assists')
    expect(html).toContain('Kill participation')
  })

  it('shows the threshold distributions with the threshold marked', () => {
    const kills = read('almanac-player-kills-threshold.json')
    const cs = read('almanac-player-cs-threshold.json')

    const killsHtml = render(kills, 'all')
    expect(killsHtml).toContain('The distribution')
    expect(killsHtml).toContain('15 kills')
    expect(killsHtml).toContain('0.16%')
    expect(killsHtml).toContain('49')

    const csHtml = render(cs, 'all')
    expect(csHtml).toContain('450 CS')
    expect(csHtml).toContain('1.3%')
    expect(csHtml).toContain('401')
  })

  it('shows the unique-champion simulation as a distribution', () => {
    const artifact = read('almanac-unique-champions.json')
    const record = artifact.windows.find((item) => item.key === 'season:2025')!.records.best!
    const html = render(artifact, '2025')

    expect(html).toContain('The simulation')
    expect(html).toContain('10,000 simulated seasons')
    expect(html).toContain(record.headline.text)
    expect(record.bins!.length).toBeGreaterThan(1)
    expect(html).toContain(record.bins![0].label)
  })

  it('keeps the under-20-pick champions visible as a census', () => {
    const artifact = read('almanac-champion-win-rate.json')
    const record = artifact.windows.find((item) => item.key === 'season:2025')!.records.best!
    const html = render(artifact, '2025')

    expect(html).toContain('Census')
    expect(html).toContain(record.census![0].name)
    expect(html).toContain(`${record.census![0].count} of ${record.census![0].n}`)
  })

  it('renders insufficient data with its census and without an interval', () => {
    const artifact = read('almanac-teemo-picked.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Insufficient data')
    expect(html).toContain('4 of 3,091 games with Teemo')
    expect(html).toContain('Census')
    expect(html).toContain('Teemo')
    expect(html).not.toContain('95% CI')
  })

  it('renders the region verification and no answer number', () => {
    const artifact = read('almanac-region-knockouts.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Not verifiable')
    expect(html).toContain('select count(distinct tab)')
    expect(html).toContain('Unblocked by')
    expect(html).not.toContain('95% CI')
  })
})
