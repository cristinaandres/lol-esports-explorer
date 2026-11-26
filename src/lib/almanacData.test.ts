import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertShape, limitsFor, QUESTION_IDS } from './answer'
import type { AlmanacIndex, QuestionArtifact, QuestionId } from './answer'
import type { Meta } from './types'

/**
 * The Almanac's data contract, over the committed artifacts rather than fixtures.
 *
 * A fixture proves the component reads a record; this proves the record the browser
 * downloads is one the site is allowed to draw: every source is the pin, every
 * verdict keeps its shape, every window states its patches and its cut, and every
 * ranking is ordered by the rule its end claims.
 */

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

const index = read<AlmanacIndex>('almanac.json')
const meta = read<Meta>('meta.json')
const SEASONS = Array.from({ length: 16 }, (_, position) => 2011 + position)
const TWO_ENDED: QuestionId[] = ['champion-win-rate', 'champion-kda', 'team-win-rate']
const CLASS_COUNTS: Record<string, number> = { champions: 5, players: 6, teams: 3, events: 4 }

describe('the Almanac artifacts', () => {
  it('publishes exactly the catalogue, in its classes', () => {
    expect(index.cards.map((card) => card.id)).toEqual([...QUESTION_IDS])
    for (const [cls, count] of Object.entries(CLASS_COUNTS)) {
      expect(index.cards.filter((card) => card.class === cls)).toHaveLength(count)
    }
    for (const card of index.cards) expect(meta.artifacts[card.artifact]).toBeTypeOf('string')
    expect(meta.artifacts['almanac.json']).toBeTypeOf('string')
  })

  it('validates every window and every record', () => {
    for (const card of index.cards) {
      const artifact = read<QuestionArtifact>(card.artifact)
      expect(artifact.id).toBe(card.id)
      expect(artifact.class).toBe(card.class)
      expect(artifact.family).toBe(card.family)
      expect(artifact.source.artifact).toBe(card.artifact)
      expect(artifact.source.sha256).toBe(meta.source.manifestSha256)
      expect(meta.artifacts[artifact.source.artifact]).toBeTypeOf('string')
      expect(artifact.thresholds.min_n).toBe(20)
      expect(artifact.thresholds.top_k).toBe(5)
      expect(artifact.thresholds.top_max).toBe(20)
      expect(artifact.thresholds.seed).toBe(20261126)

      if (artifact.id === 'region-knockouts') {
        expect(artifact.windows).toHaveLength(1)
      } else {
        expect(artifact.windows[0].key).toBe('all')
        expect(artifact.windows.slice(1).map((window) => window.season)).toEqual(SEASONS)
      }

      for (const window of artifact.windows) {
        expect(window.cut_date).toBe(window.date_to)
        expect(window.cut_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(window.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        if (window.key === 'all') expect(window.patches).toBe('all patches')
        else expect(Array.isArray(window.patches) ? window.patches.length : 0).toBeGreaterThan(0)

        for (const end of ['best', 'worst'] as const) {
          const record = window.records[end]
          if (!record) continue
          assertShape(record, artifact.family)
          const limits = limitsFor(artifact, record)
          expect(limits.some((limit) => limit.includes('Only teams that qualified'))).toBe(true)

          if (record.verdict === 'insufficient_data') {
            expect(record.headline.interval).toBeNull()
            expect(record.census?.length).toBeGreaterThan(0)
          }
          if (record.verdict === 'not_verifiable') {
            expect(record.verification?.query).toBeTruthy()
            expect(record.headline.value).toBeNull()
            expect(record.headline.interval).toBeNull()
          }
          if (record.bins) {
            expect(record.bins.length).toBeGreaterThan(0)
            expect(record.bins.reduce((total, bin) => total + bin.count, 0)).toBeGreaterThan(0)
            if (record.marker) {
              expect(record.bins.some((bin) => bin.key === record.marker!.key)).toBe(true)
            }
          }
          if (record.citation) expect(record.citation.path).toMatch(/^\/(games|events)\//)
        }

        if (TWO_ENDED.includes(artifact.id)) expect(window.records.worst).not.toBeNull()
        else expect(window.records.worst).toBeNull()
      }

      const defaultBest = artifact.windows[0].records.best!
      expect(card.verdict).toBe(defaultBest.verdict)
      expect(card.headline.text).toBe(defaultBest.headline.text)
    }
  })

  it('states the patch window and the cut date on every answer', () => {
    for (const card of index.cards) {
      const artifact = read<QuestionArtifact>(card.artifact)
      for (const window of artifact.windows) {
        expect(window.patches === 'all patches' || (Array.isArray(window.patches) && window.patches.length > 0)).toBe(true)
        expect(window.cut_date).toBe(window.date_to)
        expect(window.date_from <= window.date_to).toBe(true)
      }
    }
  })
})
