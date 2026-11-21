import { describe, expect, it } from 'vitest'

import { measureWithUnit } from './format'

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
