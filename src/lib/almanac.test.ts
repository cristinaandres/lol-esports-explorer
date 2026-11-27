import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  candidateSlice,
  canonicalParams,
  classLabel,
  familyLabel,
  groupByClass,
  hasWorst,
  isQuestionId,
  parseEnd,
  parseSeason,
  parseTop,
  questionHref,
  rangeFor,
  seriesRange,
  updateParams,
  windowFor,
} from './almanac'
import type { AlmanacIndex } from './answer'
import { championWinRate, presence } from './answerFixtures'

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

describe('the class grouping', () => {
  it('groups the committed index into the four classes, in order', () => {
    const index = read<AlmanacIndex>('almanac.json')
    const groups = groupByClass(index.cards)
    expect(groups.map((group) => [group.cls, group.cards.length])).toEqual([
      ['champions', 5],
      ['players', 6],
      ['teams', 3],
      ['events', 4],
    ])
    expect(groups.flatMap((group) => group.cards)).toHaveLength(18)
  })

  it('has a label for every class and family', () => {
    expect(classLabel('champions')).toBe('Champions')
    expect(familyLabel('top-1')).toBe('Top-K')
    expect(familyLabel('yes-no')).toBe('Share')
    expect(familyLabel('count')).toBe('Count')
    expect(familyLabel('categorical')).toBe('Census')
  })
})

describe('the URL', () => {
  it('reads a season, an end and a K', () => {
    expect(parseSeason('2025')).toBe('2025')
    expect(parseSeason('all')).toBe('all')
    expect(parseSeason(null)).toBe('all')
    // A season the page does not carry is kept as written, so the page refuses it
    // instead of quietly answering for the whole corpus under a narrower link.
    expect(parseSeason('25')).toBe('25')
    expect(parseSeason('nope')).toBe('nope')
    // A whitespace-only value is an empty parameter, not a season called " ".
    expect(parseSeason(' ')).toBe('all')
    expect(parseTop('10')).toBe(10)
    expect(parseTop('20')).toBe(20)
    expect(parseTop('7')).toBe(5)
    expect(parseTop(null)).toBe(5)
    expect(parseEnd('worst')).toBe('worst')
    expect(parseEnd('best')).toBeNull()
    expect(parseEnd(null)).toBeNull()
  })

  it('leaves defaults out of a canonical link', () => {
    expect(canonicalParams('all', null, 5).toString()).toBe('')
    expect(canonicalParams('2025', 'worst', 10).toString()).toBe('season=2025&end=worst&top=10')
  })

  it('applies one control without rewriting the others', () => {
    const current = new URLSearchParams('season=2025&end=worst&top=10')
    expect(updateParams(current, { season: 'all' }).toString()).toBe('end=worst&top=10')
    expect(updateParams(current, { end: 'best' }).toString()).toBe('season=2025&top=10')
    expect(updateParams(current, { top: 5 }).toString()).toBe('season=2025&end=worst')
    expect(updateParams(current, { season: '2024' }).toString()).toBe('season=2024&end=worst&top=10')
  })

  it('recognises the catalogue and nothing else', () => {
    expect(isQuestionId('champion-presence')).toBe(true)
    expect(isQuestionId('champion-presence ')).toBe(false)
    expect(isQuestionId(undefined)).toBe(false)
    expect(questionHref('teemo-picked')).toBe('/almanac/teemo-picked')
  })
})

describe('the window', () => {
  it('resolves a season, and says nothing for a season it does not carry', () => {
    expect(windowFor(presence, '2025')?.season).toBe(2025)
    expect(windowFor(presence, 'all')?.key).toBe('all')
    expect(windowFor(presence, '2019')).toBeUndefined()
  })

  it('knows which cards have a worst end', () => {
    expect(hasWorst(presence)).toBe(false)
    expect(hasWorst(championWinRate)).toBe(true)
  })
})

describe('the sliced ranking', () => {
  it('slices to the K the reader asked for', () => {
    const best = championWinRate.windows[0].records.best!
    expect(candidateSlice(best, null, 1)).toHaveLength(1)
    const worst = championWinRate.windows[0].records.worst!
    expect(candidateSlice(worst, 'worst', 1)).toHaveLength(1)
  })

  it('extends the list by one on a tie at the last place', () => {
    const best = structuredClone(championWinRate.windows[0].records.best!)
    best.candidates![1].lower_bound = best.candidates![0].lower_bound
    expect(candidateSlice(best, null, 1)).toHaveLength(2)

    const worst = structuredClone(championWinRate.windows[0].records.worst!)
    worst.candidates![1].upper_bound = worst.candidates![0].upper_bound
    expect(candidateSlice(worst, 'worst', 1)).toHaveLength(2)
  })
})

describe('the axis', () => {
  it('uses the share scale for a share and the data for a ratio', () => {
    expect(rangeFor([0.2, 0.8], 'share')).toEqual({ min: 0, max: 1 })
    expect(rangeFor([2, 4], 'kda')).toEqual({ min: 0, max: 4.2 })
    expect(rangeFor([], 'count')).toEqual({ min: 0, max: 1 })
  })

  it('includes a series interval so a whisker stays inside', () => {
    expect(
      seriesRange([{ value: 0.5, interval: { low: 0.4, high: 0.6 } }], 'share'),
    ).toEqual({ min: 0, max: 1 })
    const series = seriesRange([{ value: 72, interval: null }], 'count')
    expect(series.min).toBe(0)
    expect(series.max).toBeCloseTo(75.6)
  })
})
