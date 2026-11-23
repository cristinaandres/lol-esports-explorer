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
  // The init argument is typed because one test asserts the caching policy on it.
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok: true,
    json: async () => payload,
  }))
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

  it('composes the game detail from what a champion page already fetched', async () => {
    // A reader reaches a game from a champion; the two artifacts they share are
    // asked for once, and only the two the game page alone needs are added.
    const fetchMock = stubFetch([])
    const { loadBans, loadGameDetail, loadPlayerGames } = await freshData()

    await Promise.all([loadPlayerGames(), loadBans()])
    await loadGameDetail()

    const urls = urlsOf(fetchMock)
    expect(urls.filter((url) => url.endsWith('player-games.json'))).toHaveLength(1)
    expect(urls.filter((url) => url.endsWith('bans.json'))).toHaveLength(1)
    expect(urls.filter((url) => url.endsWith('sides.json'))).toHaveLength(1)
    expect(urls.filter((url) => url.endsWith('picks.json'))).toHaveLength(1)
  })

  it('asks for the bans and nothing from the draft board on a champion page', async () => {
    const fetchMock = stubFetch([])
    const { loadBans, loadPlayerGames } = await freshData()

    await Promise.all([loadPlayerGames(), loadBans()])

    const urls = urlsOf(fetchMock)
    expect(urls.filter((url) => url.endsWith('bans.json'))).toHaveLength(1)
    // The scoreboards and the ordered picks are 235 KB gzip a champion page never
    // renders: it counts the bans and nothing else from the draft.
    expect(urls.filter((url) => url.endsWith('sides.json'))).toHaveLength(0)
    expect(urls.filter((url) => url.endsWith('picks.json'))).toHaveLength(0)
  })

  it('asks for no game-level artifact on an era page', async () => {
    // The era page draws its events and its era's own figures; a game list belongs
    // to an event. The two files are 145 KB gzip between them, and the page that
    // reads neither must not pay for them.
    const fetchMock = stubFetch([])
    const { loadDataset } = await freshData()

    await loadDataset()

    const urls = urlsOf(fetchMock)
    expect(urls.filter((url) => url.endsWith('games.json'))).toHaveLength(0)
    expect(urls.filter((url) => url.endsWith('matches.json'))).toHaveLength(0)
    // The artifacts it does read are still fetched exactly once.
    for (const file of ['eras.json', 'events.json', 'totals.json', 'teams.json']) {
      expect(urls.filter((url) => url.endsWith(file)), file).toHaveLength(1)
    }
  })

  it('asks for the two game-level artifacts once, and reuses the games alone', async () => {
    // A champion page counts games across the corpus; a game or series page needs
    // the series too. Both compose, so whichever asks first pays, and the second
    // reuses the answer instead of downloading a megabyte again.
    const fetchMock = stubFetch([])
    const { loadGameCorpus, loadGames } = await freshData()

    await loadGameCorpus()
    await loadGames()

    const urls = urlsOf(fetchMock)
    expect(urls.filter((url) => url.endsWith('games.json'))).toHaveLength(1)
    expect(urls.filter((url) => url.endsWith('matches.json'))).toHaveLength(1)
  })

  it('asks for the player rows and nothing heavier on a career page', async () => {
    const fetchMock = stubFetch([])
    const { loadAliases, loadPlayerGames } = await freshData()

    await loadPlayerGames()
    await loadAliases()

    const urls = urlsOf(fetchMock)
    // The scoreboards and the draft belong to a game page; a career page must not
    // pay 375 KB for them.
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

  it('asks again only for the piece of a game detail that failed', async () => {
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

    // Five calls: the detail composes the per-artifact loaders, so the retry asks
    // again for the scoreboards alone while the bans, the picks and the player rows
    // that arrived on the first attempt are reused. Composing is what keeps a retry
    // cheap; the rejection is still not remembered.
    const urls = urlsOf(fetchMock)
    expect(urls.filter((url) => url.endsWith('sides.json'))).toHaveLength(2)
    for (const file of ['bans.json', 'picks.json', 'player-games.json']) {
      expect(urls.filter((url) => url.endsWith(file)), file).toHaveLength(1)
    }
    expect(fetchMock).toHaveBeenCalledTimes(5)
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

    // The eager set is eight files; a second attempt is another eight, not seven.
    expect(urlsOf(fetchMock).filter((url) => url.endsWith('eras.json'))).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(16)
  })
})

describe('revalidation', () => {
  it('asks the browser to revalidate every artifact against its ETag', async () => {
    // Artifact URLs never change, so a deploy cannot invalidate them the way it
    // invalidates the hashed bundle. Without `no-cache` a returning reader can run the
    // new code against ten-minute-old JSON, which trips no error — it silently files
    // every champion under "Unknown". Asserted on the fetch call, since the caching
    // policy is the whole fix.
    const fetchMock = stubFetch([])
    const { loadGames, loadAliases } = await freshData()

    await loadGames()
    await loadAliases()

    const options = fetchMock.mock.calls.map((call) => call[1] ?? {})
    expect(options).toHaveLength(2)
    for (const option of options) expect(option.cache).toBe('no-cache')
  })
})
