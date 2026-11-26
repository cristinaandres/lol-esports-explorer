import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { AlmanacIndex } from '../lib/answer'
import { AlmanacIndexView } from './AlmanacIndex'

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

describe('the Almanac index', () => {
  it('renders eighteen cards in the four class sections, with the committed headlines', () => {
    const index = read<AlmanacIndex>('almanac.json')
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AlmanacIndexView index={index} />
      </MemoryRouter>,
    )

    expect(html).toContain('Champions')
    expect(html).toContain('Players')
    expect(html).toContain('Teams')
    expect(html).toContain('Events')
    expect(html).toContain('5 questions')
    expect(html).toContain('6 questions')
    expect(html).toContain('3 questions')
    expect(html).toContain('4 questions')

    expect(html).toContain('Which champion was present in the most games?')
    expect(html).toContain('40% (95% CI: 38–42%, n=2,426)')
    expect(html).toContain('Insufficient data')
    expect(html).toContain('Not verifiable')
    expect(html).toContain('All games')

    expect((html.match(/href="\/almanac\//g) ?? []).length).toBe(18)
  })
})
