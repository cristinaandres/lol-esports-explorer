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
    expect(html).toContain('Team kills')
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

  it('shows the team win rate with its wins', () => {
    const artifact = read('almanac-team-win-rate.json')
    const record = artifact.windows[0].records.best!
    const html = render(artifact, 'all')

    expect(html).toContain('Wins')
    expect(html).toContain(record.candidates![0].name)
    expect(html).toContain(count(Number(record.candidates![0].components!.wins)))
    expect(html).toContain('Teams under 20 team-games')
    expect(html).toContain(record.census![0].name)
  })

  it('switches the team win rate to the worst end', () => {
    const artifact = read('almanac-team-win-rate.json')
    const record = artifact.windows[0].records.worst!
    const html = render(artifact, 'all', 'worst')

    expect(html).toContain(record.headline.text)
    expect(html).toContain(record.candidates![0].name)
    expect(html).toContain('ordered by the upper bound')
  })

  it('shows the team measures with their stated-row denominators', () => {
    const kills = read('almanac-team-kills.json')
    const killsRecord = kills.windows[0].records.best!
    const killsHtml = render(kills, 'all')
    expect(killsHtml).toContain(killsRecord.candidates![0].name)
    expect(killsHtml).toContain(count(killsRecord.candidates![0].n))
    expect(killsHtml).toContain('side rows')

    const gold = read('almanac-team-gold.json')
    const goldRecord = gold.windows[0].records.best!
    const goldHtml = render(gold, 'all')
    expect(goldHtml).toContain(goldRecord.candidates![0].name)
    expect(goldHtml).toContain(goldRecord.headline.text)
    expect(goldHtml).toContain(count(goldRecord.candidates![0].n))
    expect(goldHtml).toContain('side rows')
  })

  it('shows the 32:00 share with its duration distribution marked', () => {
    const artifact = read('almanac-game-length-32.json')
    const html = render(artifact, 'all')

    expect(html).toContain('49% (95% CI: 47–51%, n=3,084)')
    expect(html).toContain('The distribution')
    expect(html).toContain('32:00')
    expect(html).toContain('1,513')
    expect(html).toContain('3,084')
  })

  it('cites the shortest game and splits the decile by side', () => {
    const artifact = read('almanac-shortest-game.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Record holder:')
    expect(html).toContain('Invictus Gaming vs T1')
    expect(html).toContain('961 s')
    expect(html).toContain('Blue side')
    expect(html).toContain('Red side')
    expect(html).toContain('shortest decile')
  })

  it('renders the Finals MVP census as a labelled bar, not an estimate', () => {
    const artifact = read('almanac-finals-mvp-role.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Insufficient data')
    expect(html).toContain('Finals MVP')
    expect(html).toContain('Mid')
    expect(html).toContain('Finals MVP awards by role')
    expect(html).toContain('The census by group')
    expect(html).toContain('awards')
    expect(html).not.toContain('95% CI')
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

    expect(html).toContain('Champions under 20 picks')
    expect(html).toContain(record.census![0].name)
    expect(html).toContain(`${record.census![0].count} of ${record.census![0].n}`)
  })

  it('renders insufficient data with its census and without an interval', () => {
    const artifact = read('almanac-teemo-picked.json')
    const html = render(artifact, 'all')

    expect(html).toContain('Insufficient data')
    expect(html).toContain('4 of 3,091 games with Teemo')
    expect(html).toContain('Presences of Teemo')
    expect(html).toContain('Teemo')
    expect(html).not.toContain('95% CI')
  })

  it('keeps the answer behind one visible button, with its text still in the page', () => {
    const artifact = read('almanac-champion-presence.json')
    const html = render(artifact, '2025')

    expect(html).toContain('Show the answer')
    expect(html).toContain('aria-expanded="false"')
    // The number, the evidence, the limits and the source are in the DOM together: the
    // click reveals them, it never fetches or derives them.
    expect(html).toContain('64% (95% CI: 57–70%, n=232)')
    expect(html).toContain('Limits')
    expect(html).toContain('Source')
  })

  it('states the publication rule on the page, not only in the data', () => {
    const artifact = read('almanac-champion-presence.json')
    const html = render(artifact, '2025')

    expect(html).toContain('An estimate is published from 20 games up')
  })

  it('refuses a season it cannot read instead of answering for the whole corpus', () => {
    const artifact = read('almanac-champion-presence.json')
    const html = render(artifact, '25')

    expect(html).toContain('Season 25 is not published')
    // The page names the seasons it does carry, rather than leaving the reader to guess.
    expect(html).toContain('It carries Season 2011 to Season 2026, and all games.')
    expect(html).not.toContain('64% (95% CI: 57–70%, n=232)')
  })

  it('offers no control when the card has nothing to change', () => {
    const region = read('almanac-region-knockouts.json')
    const html = render(region, 'all')

    expect(html).not.toContain('<select')
    expect(html).toContain('Not verifiable')
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
