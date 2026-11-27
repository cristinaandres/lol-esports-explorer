import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PAGE_CONFIG } from './almanacPages'
import { QUESTION_IDS } from './answer'
import type { AlmanacIndex, AnswerRecord, QuestionArtifact } from './answer'

/**
 * The page recipe, checked against the committed artifacts.
 *
 * A fixture proves a column renders; this proves the eighteen rows agree with the
 * data the browser downloads: every census has a name, every histogram has its copy,
 * every extra column names a component that exists, and a share column never appears
 * without the denominator it is a share of.
 */

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

const index = read<AlmanacIndex>('almanac.json')

function records(artifact: QuestionArtifact): AnswerRecord[] {
  return artifact.windows.flatMap((window) =>
    [window.records.best, window.records.worst].filter((record): record is AnswerRecord => record !== null),
  )
}

function components(record: AnswerRecord): Record<string, string | number | null>[] {
  return (record.candidates ?? []).map((candidate) => candidate.components ?? {})
}

describe('the page recipe', () => {
  it('has exactly one row per question, and no orphan row', () => {
    expect(Object.keys(PAGE_CONFIG).sort()).toEqual([...QUESTION_IDS].sort())
  })

  it('names what each census counts', () => {
    for (const id of QUESTION_IDS) {
      expect(PAGE_CONFIG[id].census.length, id).toBeGreaterThan(0)
      expect(PAGE_CONFIG[id].census, id).not.toBe('Census')
    }
  })

  it('gives a histogram its copy exactly where a record carries bins', () => {
    for (const card of index.cards) {
      const artifact = read<QuestionArtifact>(card.artifact)
      const hasBins = records(artifact).some((record) => (record.bins?.length ?? 0) > 0)
      const histogram = PAGE_CONFIG[card.id].histogram
      expect(Boolean(histogram), card.id).toBe(hasBins)
      if (!histogram) continue
      expect(histogram.title.length, card.id).toBeGreaterThan(0)
      expect(histogram.unit.length, card.id).toBeGreaterThan(0)
      expect(histogram.caption(1_000, 'the line'), card.id).toContain('1,000')
    }
  })

  it('names only components the committed candidates carry', () => {
    for (const card of index.cards) {
      const specs = PAGE_CONFIG[card.id].columns
      if (specs.length === 0) continue

      const artifact = read<QuestionArtifact>(card.artifact)
      const rows = records(artifact).flatMap(components)
      expect(rows.length, card.id).toBeGreaterThan(0)

      for (const spec of specs) {
        const present = rows.filter((row) => row[spec.key] !== undefined)
        expect(present.length, `${card.id}.${spec.key}`).toBeGreaterThan(0)

        if (spec.kind === 'count') {
          for (const row of present) {
            expect(Number.isInteger(row[spec.key]), `${card.id}.${spec.key}`).toBe(true)
          }
          continue
        }

        // A share prints its interval beside it, so the interval must be in the data.
        for (const row of present) {
          expect(typeof row[`${spec.key}_low`], `${card.id}.${spec.key}_low`).toBe('number')
          expect(typeof row[`${spec.key}_high`], `${card.id}.${spec.key}_high`).toBe('number')
        }
      }
    }
  })

  it('never prints a share column without the denominator it is a share of', () => {
    for (const card of index.cards) {
      const specs = PAGE_CONFIG[card.id].columns
      if (!specs.some((spec) => spec.kind === 'share')) continue
      expect(specs.map((spec) => spec.key), card.id).toContain('team_kills')
    }
  })

  it('leaves the ranking columns empty on a card that ranks nobody', () => {
    for (const card of index.cards) {
      const artifact = read<QuestionArtifact>(card.artifact)
      if (records(artifact).some((record) => (record.candidates?.length ?? 0) > 0)) continue
      expect(PAGE_CONFIG[card.id].columns, card.id).toEqual([])
    }
  })
})
