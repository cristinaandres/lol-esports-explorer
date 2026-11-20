import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { GLOSSARY } from './glossary'

/**
 * The glossary is linked from the pages that use its terms. A rename that leaves a
 * dead anchor behind is a link nobody notices until a reader clicks it, so this file
 * checks every anchor the source references against the entries that exist.
 */

function sourceFiles(): string[] {
  const root = join(import.meta.dirname, '..')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) files.push(path)
    }
  }
  walk(root)
  return files
}

describe('glossary anchors', () => {
  it('every anchor the site links to exists', () => {
    const ids = new Set(GLOSSARY.map((entry) => entry.id))
    const referenced = new Set<string>()

    for (const file of sourceFiles()) {
      const text = readFileSync(file, 'utf-8')
      for (const match of text.matchAll(/"\/glossary#([a-z-]+)"/g)) referenced.add(match[1]!)
      for (const match of text.matchAll(/to="\/glossary#([a-z-]+)"/g)) referenced.add(match[1]!)
    }

    const missing = [...referenced].filter((id) => !ids.has(id))
    expect(missing).toEqual([])
    // And the glossary is actually referenced, not merely well formed.
    expect(referenced.size).toBeGreaterThan(0)
  })

  it('has a unique id per entry', () => {
    const ids = GLOSSARY.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
