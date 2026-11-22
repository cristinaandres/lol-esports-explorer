import { describe, expect, it } from 'vitest'

import { measureWithUnit, seriesLabel } from './format'

describe('measureWithUnit', () => {
  it('states a present measure with its unit, and a zero as a measured zero', () => {
    expect(measureWithUnit(15188, 'gold')).toBe('15,188 gold')
    expect(measureWithUnit(0, 'CS')).toBe('0 CS')
  })

  it('names the absent measure instead of hanging its unit on a dash', () => {
    // "— gold" reads as a broken figure; 1,750 player rows state no gold.
    expect(measureWithUnit(null, 'gold')).toBe('gold not stated')
    expect(measureWithUnit(undefined, 'CS')).toBe('CS not stated')
  })
})

describe('seriesLabel', () => {
  it('names a real series without the date the page header already states', () => {
    expect(seriesLabel(1311, 'Worlds Season 1 — Group Stage — 2011-06-18')).toBe(
      'Worlds Season 1 — Group Stage'
    )
  })

  it('words the absence for the placeholder match instead of naming it', () => {
    // match_key 0 carries match_name "Unknown"; 42 games have no series.
    expect(seriesLabel(0, 'Unknown')).toBe('series not stated')
  })

  it('words a missing or empty name the same way', () => {
    expect(seriesLabel(7, null)).toBe('series not stated')
    expect(seriesLabel(7, '')).toBe('series not stated')
  })
})
