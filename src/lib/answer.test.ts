import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertShape,
  defaultWindow,
  formatAnswer,
  limitsFor,
  orderRule,
  QUESTION_IDS,
  recordFor,
  seasonOptions,
  windowByKey,
  windowLabel,
} from './answer'
import type { AnswerRecord } from './answer'
import {
  championKda,
  championWinRate,
  finalsMvp,
  presence,
  regions,
  teemo,
  uniqueChampions,
} from './answerFixtures'

const clone = <T,>(value: T): T => structuredClone(value)

describe('the reference sentence', () => {
  it('writes the share with its interval and its n', () => {
    const record = presence.windows[1].records.best!
    expect(formatAnswer(record)).toBe('64% (95% CI: 57–70%, n=232)')
    expect(record.headline.text).toBe(formatAnswer(record))
  })

  it('writes a ratio to two decimals', () => {
    const record = championKda.windows[0].records.best!
    expect(formatAnswer(record)).toBe('8.44 (95% CI: 5.25–14.95, n=21)')
  })

  it('writes a simulation as a range with its replication count', () => {
    const record = uniqueChampions.windows[0].records.best!
    expect(formatAnswer(record)).toBe('61–79 (90% of 10,000 simulations)')
  })

  it('writes both ends of a two-ended card', () => {
    expect(formatAnswer(championWinRate.windows[0].records.best!)).toBe(
      '72% (95% CI: 57–83%, n=43)',
    )
    expect(formatAnswer(championWinRate.windows[0].records.worst!)).toBe(
      '33% (95% CI: 22–46%, n=61)',
    )
  })

  it('keeps the verdict words for a record that is not an estimate', () => {
    expect(formatAnswer(teemo.windows[0].records.best!)).toBe(
      'Insufficient data: Teemo was picked in 4 of 3,091 games.',
    )
    expect(formatAnswer(regions.windows[0].records.best!)).toContain('Not verifiable')
  })
})

describe('the shape', () => {
  it('accepts every family and every verdict', () => {
    expect(() => assertShape(presence.windows[1].records.best!, 'top-1')).not.toThrow()
    expect(() => assertShape(championKda.windows[0].records.best!, 'top-1')).not.toThrow()
    expect(() => assertShape(championWinRate.windows[0].records.worst!, 'top-1')).not.toThrow()
    expect(() => assertShape(teemo.windows[0].records.best!, 'yes-no')).not.toThrow()
    expect(() => assertShape(uniqueChampions.windows[0].records.best!, 'count')).not.toThrow()
    expect(() => assertShape(finalsMvp.windows[0].records.best!, 'categorical')).not.toThrow()
    expect(() => assertShape(regions.windows[0].records.best!, 'categorical')).not.toThrow()
  })

  it('rejects a headline without a sample size', () => {
    const record = clone(presence.windows[1].records.best!) as AnswerRecord
    ;(record.headline as { n: number }).n = -1
    expect(() => assertShape(record, 'top-1')).toThrow(/headline.n/)
  })

  it('rejects a share without its part', () => {
    const record = clone(presence.windows[1].records.best!)
    record.evidence.part = null
    expect(() => assertShape(record, 'top-1')).toThrow(/part and its denominator/)
  })

  it('rejects an insufficient record that acquired an interval', () => {
    const record = clone(teemo.windows[0].records.best!)
    record.headline.interval = { level: 0.95, low: 0.0003, high: 0.003, method: 'wilson' }
    expect(() => assertShape(record, 'yes-no')).toThrow(/must not print an interval/)
  })

  it('rejects a not-verifiable record that prints a value', () => {
    const record = clone(regions.windows[0].records.best!)
    record.headline.value = 0.5
    expect(() => assertShape(record, 'categorical')).toThrow(/must not print an answer value/)
  })

  it('rejects a worst end ordered like a best one', () => {
    const record = clone(championWinRate.windows[0].records.worst!)
    record.candidates!.reverse()
    expect(() => assertShape(record, 'top-1')).toThrow(/upper bound/)
  })

  it('rejects a candidate that points at a route the site does not have', () => {
    const record = clone(presence.windows[1].records.best!)
    record.candidates![0].path = '/events/1'
    expect(() => assertShape(record, 'top-1')).toThrow(/entity route/)
  })

  it('rejects an interval published at the wrong level', () => {
    const record = clone(presence.windows[1].records.best!)
    record.headline.interval = { level: 0.9, low: 0.574, high: 0.697, method: 'wilson' }
    expect(() => assertShape(record, 'top-1')).toThrow(/95%/)
  })
})

describe('the windows', () => {
  it('names a season and the corpus', () => {
    expect(windowLabel(presence.windows[0])).toBe('All games')
    expect(windowLabel(presence.windows[1])).toBe('Season 2025')
  })

  it('resolves a window and defaults to all games', () => {
    expect(windowByKey(presence, 'season:2025')?.season).toBe(2025)
    expect(windowByKey(presence, 'season:1999')).toBeUndefined()
    expect(defaultWindow(presence).key).toBe('all')
  })

  it('lists the seasons newest first', () => {
    expect(seasonOptions(presence)).toEqual([{ value: '2025', label: 'Season 2025' }])
  })

  it('picks the end and refuses an end the card does not have', () => {
    expect(recordFor(presence.windows[1], null)?.verdict).toBe('answered')
    expect(recordFor(presence.windows[1], 'worst')).toBeNull()
    expect(recordFor(championWinRate.windows[0], 'worst')?.end).toBe('worst')
  })

  it('prints the order rule the record was assembled by', () => {
    expect(orderRule('best')).toBe('ordered by the lower bound')
    expect(orderRule('worst')).toBe('ordered by the upper bound')
    expect(orderRule(null)).toBe('ordered by the lower bound')
  })

  it('combines the shared limits with the record’s own and caps them at four', () => {
    expect(limitsFor(presence, presence.windows[1].records.best!)).toHaveLength(3)
    const artifact = clone(presence)
    artifact.limits.push('one too many', 'and another')
    expect(() => limitsFor(artifact, artifact.windows[1].records.best!)).toThrow(/at most four/)
  })
})

describe('the published schema', () => {
  const schema = JSON.parse(
    readFileSync(join(import.meta.dirname, '../../public/schema/answer.json'), 'utf-8'),
  ) as {
    properties: { id: { enum: string[] } }
    $defs: Record<string, unknown>
  }

  it('names exactly the catalogue, in the catalogue’s order', () => {
    expect(schema.properties.id.enum).toEqual([...QUESTION_IDS])
  })

  it('defines the three record branches and the two window shapes', () => {
    expect(schema.$defs.record).toBeDefined()
    expect(schema.$defs.top1Record).toBeDefined()
    expect(schema.$defs.window).toBeDefined()
    expect(schema.$defs.top1Window).toBeDefined()
    expect(schema.$defs.verification).toBeDefined()
  })
})
