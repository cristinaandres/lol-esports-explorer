import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The lazy artifacts are fetched once per session, once they arrive.
 *
 * Asserted at the loader rather than in a browser, because it is a property of the
 * module and not of a click: three pages can ask for the player rows and only the
 * first should cause a request. A full document load starts a new session, and
 * paying again there is expected.
 *
 * The promise is "once", not "at most once": a request that failed is not an
 * answer, so the loader must offer the artifact again instead of handing the same
 * rejection to every later page. Both halves are asserted below.
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

/**
 * A fetch stub that refuses the first request for one file and answers every other
 * request, so a retry can be observed succeeding.
 *
 * Counted per file rather than per call: a composed load starts several requests at
 * once, and the one that was refused is the one whose second attempt the test is
 * looking for.
 */
function stubFetchRefusingOnce(file: string, payload: unknown, status = 503) {
  const refused = new Set<string>()
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith(file) && !refused.has(file)) {
      refused.add(file)
      return { ok: false, status }
    }
    return { ok: true, json: async () => payload }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function urlsOf(fetchMock: { mock: { calls: unknown[][] } }): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]))
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

/**
 * A failure is not an answer, so it must not be remembered.
 *
 * The reader whose network blipped on the way to a player page is the case that
 * matters: a reload is the only escape from a cached rejection, and a static site
 * has no other way to recover.
 */
describe('retrying a failed load', () => {
  it('asks again for the alias bridge after a refusal, and keeps the answer', async () => {
    const fetchMock = stubFetchRefusingOnce('aliases.json', [])
    const { loadAliases } = await freshData()

    await expect(loadAliases()).rejects.toThrow('data/aliases.json: HTTP 503')
    await expect(loadAliases()).resolves.toEqual([])
    // The attempt that worked is an answer, so the third ask is free again.
    await loadAliases()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('asks again for the whole game detail, scoreboards included', async () => {
    const fetchMock = stubFetchRefusingOnce('sides.json', [])
    const { loadGameDetail } = await freshData()

    await expect(loadGameDetail()).rejects.toThrow('data/sides.json: HTTP 503')
    await expect(loadGameDetail()).resolves.toEqual({
      sides: [],
      playerGames: [],
      bans: [],
      picks: [],
    })
    await loadGameDetail()

    // Seven calls, not eight: the three artifacts the detail owns outright are
    // asked for twice, while the player rows answered on the first attempt and are
    // reused, which is the cache doing its job inside the retry.
    const urls = urlsOf(fetchMock)
    for (const file of ['sides.json', 'bans.json', 'picks.json']) {
      expect(urls.filter((url) => url.endsWith(file)), file).toHaveLength(2)
    }
    expect(urls.filter((url) => url.endsWith('player-games.json'))).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  it('asks again for the player rows inside a game detail, not only the detail', async () => {
    // The rows have their own slot, shared with career pages. If the detail's
    // attempt left a rejection there, retrying the detail would reuse it and fail
    // for a second reason.
    const fetchMock = stubFetchRefusingOnce('player-games.json', [])
    const { loadGameDetail, loadPlayerGames } = await freshData()

    await expect(loadGameDetail()).rejects.toThrow('data/player-games.json: HTTP 503')
    await expect(loadPlayerGames()).resolves.toEqual([])
    await expect(loadGameDetail()).resolves.toMatchObject({ playerGames: [] })

    expect(urlsOf(fetchMock).filter((url) => url.endsWith('player-games.json'))).toHaveLength(2)
  })

  it('asks again for the eager set when the first page load was refused', async () => {
    const fetchMock = stubFetchRefusingOnce('eras.json', [])
    const { loadDataset } = await freshData()

    await expect(loadDataset()).rejects.toThrow('data/eras.json: HTTP 503')
    await expect(loadDataset()).resolves.toMatchObject({ eras: [] })

    // The eager set is ten files; a second attempt is another ten, not nine.
    expect(urlsOf(fetchMock).filter((url) => url.endsWith('eras.json'))).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(20)
  })
})
