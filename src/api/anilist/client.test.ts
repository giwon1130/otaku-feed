import { test, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'node:assert'
import { setupServer } from 'msw/node'
import { graphql, http, HttpResponse } from 'msw'
import { AniListError, query } from './client.ts'

const server = setupServer()

before(() => server.listen({ onUnhandledRequest: 'error' }))
after(() => server.close())
beforeEach(() => server.resetHandlers())

test('query: 정상 응답을 그대로 반환', async () => {
  server.use(
    graphql.query('GetMedia', () => HttpResponse.json({ data: { Media: { id: 1 } } })),
  )
  const data = await query<{ Media: { id: number } }>(
    'query GetMedia { Media(id: 1, type: ANIME) { id } }',
    { id: 1 },
  )
  assert.equal(data.Media.id, 1)
})

test('query: 429면 rateLimit 메시지로 throw', async () => {
  server.use(
    http.post('https://graphql.anilist.co', () => new HttpResponse(null, { status: 429 })),
  )
  await assert.rejects(
    () => query('query Q { Media { id } }'),
    (e: unknown) => e instanceof AniListError && /너무 잦/.test((e as Error).message),
  )
})

test('query: 5xx면 server down 메시지로 throw', async () => {
  server.use(
    http.post('https://graphql.anilist.co', () => new HttpResponse(null, { status: 503 })),
  )
  await assert.rejects(
    () => query('query Q { Media { id } }'),
    (e: unknown) => e instanceof AniListError && /서버에 문제/.test((e as Error).message),
  )
})

test('query: GraphQL errors가 있어도 partial data가 있으면 반환', async () => {
  server.use(
    http.post('https://graphql.anilist.co', () =>
      HttpResponse.json({ data: { Media: { id: 9 } }, errors: [{ message: 'partial fail' }] }),
    ),
  )
  const data = await query<{ Media: { id: number } }>('query Q { Media { id } }')
  assert.equal(data.Media.id, 9)
})

test('query: GraphQL errors + data null이면 throw', async () => {
  server.use(
    http.post('https://graphql.anilist.co', () =>
      HttpResponse.json({ data: null, errors: [{ message: 'invalid query' }] }),
    ),
  )
  await assert.rejects(
    () => query('query Q { Media { id } }'),
    (e: unknown) => e instanceof AniListError && (e as Error).message === 'invalid query',
  )
})

test('query: 동시성 제한 — 6개 동시 호출이 직렬화되지 않고 다 끝남', async () => {
  // MAX_CONCURRENT=5라 6개째는 큐에서 대기. 모두 성공해야 함.
  let inFlightPeak = 0
  let active = 0
  server.use(
    http.post('https://graphql.anilist.co', async () => {
      active++
      if (active > inFlightPeak) inFlightPeak = active
      await new Promise((r) => setTimeout(r, 30))
      active--
      return HttpResponse.json({ data: { ok: true } })
    }),
  )

  const results = await Promise.all(
    Array.from({ length: 6 }, () => query<{ ok: boolean }>('query Q { ok }')),
  )
  assert.equal(results.length, 6)
  assert.ok(results.every((r) => r.ok))
  // 6개 동시 호출했지만 클라이언트 큐가 5로 캡 → peak ≤ 5
  assert.ok(inFlightPeak <= 5, `expected peak <= 5, got ${inFlightPeak}`)
})
