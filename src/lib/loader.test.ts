import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The lazy artifacts are fetched once per session.
 *
 * Asserted at the loader rather than in a browser, because it is a property of the
 * module and not of a click: three pages can ask for the player rows and only the
 * first should cause a request. A full document load starts a new session, and
 * paying again there is expected.
 *
 * Each test imports a fresh copy of the module, because the cache it tests lives at
 * module scope: sharing it between tests would make the second test pass without
 * proving anything.
 */

function stubFetch(payload: unknown) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function urlsOf(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map((call) => String((call as unknown[])[0]))
}

async function freshData() {
  vi.resetModules()
  return import('./data')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lazy loading', () => {
  it('fetches the player rows once, however many pages ask for them', async () => {
    const fetchMock = stubFetch([])
    const { loadPlayerGames } = await freshData()

    const first = loadPlayerGames()
    const second = loadPlayerGames()

    expect(second).toBe(first)
    await first
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches the alias bridge once', async () => {
    const fetchMock = stubFetch([])
    const { loadAliases } = await freshData()

    await loadAliases()
    await loadAliases()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not fetch the player rows twice when a game page asks after a career page', async () => {
    // A game page needs the scoreboards and the draft as well; the player rows are
    // the one artifact both pages share, so the second ask must reuse the first.
    const fetchMock = stubFetch([])
    const { loadGameDetail, loadPlayerGames } = await freshData()

    await loadPlayerGames()
    await loadGameDetail()

    expect(urlsOf(fetchMock).filter((url) => url.endsWith('player-games.json'))).toHaveLength(1)
  })

  it('asks for the player rows and nothing heavier on a career page', async () => {
    const fetchMock = stubFetch([])
    const { loadAliases, loadPlayerGames } = await freshData()

    await loadPlayerGames()
    await loadAliases()

    const urls = urlsOf(fetchMock)
    // The scoreboards and the draft belong to a game page; a career page must not
    // pay 330 KB for them.
    expect(urls.filter((url) => url.endsWith('sides.json'))).toHaveLength(0)
    expect(urls.filter((url) => url.endsWith('picks.json'))).toHaveLength(0)
  })
})
