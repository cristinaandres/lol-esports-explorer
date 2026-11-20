import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ERA_COPY } from './eras'
import { duration, percent } from './format'

/**
 * These tests guard the two rules the site is built on, plus the seam between the
 * declared era spine and the copy that explains it.
 */

describe('percent', () => {
  it('never invents a share from an empty sample', () => {
    expect(percent(0, 0)).toBe('—')
  })

  it('rounds to a whole percent', () => {
    expect(percent(8, 13)).toBe('62%')
    expect(percent(1, 3)).toBe('33%')
  })
})

describe('duration', () => {
  it('renders mm:ss from seconds', () => {
    expect(duration(2090)).toBe('34:50')
    expect(duration(0)).toBe('0:00')
  })

  it('renders a dash rather than zero for a missing value', () => {
    expect(duration(null)).toBe('—')
  })
})

describe('era copy', () => {
  const eras = JSON.parse(
    readFileSync(join(import.meta.dirname, '../../public/data/eras.json'), 'utf-8'),
  ) as { era: string }[]

  it('explains every era the spine declares', () => {
    const missing = eras.map((era) => era.era).filter((era) => !(era in ERA_COPY))
    expect(missing).toEqual([])
  })

  it('describes why a declared era with no game is empty', () => {
    const empty = eras.filter((era) => (era as { games?: number }).games === 0)
    expect(empty.length).toBeGreaterThan(0)
    for (const era of empty) {
      expect(ERA_COPY[era.era]?.empty, `${era.era} needs an 'empty' explanation`).toBeTruthy()
    }
  })
})
