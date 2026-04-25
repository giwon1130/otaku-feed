import { STRINGS } from '../../i18n/strings.ts'

const ENDPOINT = 'https://graphql.anilist.co'

/** AniList 호출에서 발생한 에러 — UI 레벨에서 instanceof로 식별 가능. */
export class AniListError extends Error {
  // node:test --experimental-strip-types가 TS parameter property를 지원 안 해서 명시적 필드로
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'AniListError'
    this.cause = cause
  }
}

// ── 동시성 제한 (AniList rate limit 방어: 90 req/min/IP) ────────────────────
// HomeTab + 디테일 모달 + 검색이 동시에 polling되면 burst로 429 받기 쉬움.
// 클라이언트 측 in-flight 큐로 동시 요청 수를 제한.
const MAX_CONCURRENT = 5
let inFlight = 0
const queue: (() => void)[] = []

function acquire(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++
    return Promise.resolve()
  }
  return new Promise((resolve) => queue.push(resolve))
}

function release(): void {
  const next = queue.shift()
  if (next) next()   // 슬롯 양도 (inFlight 카운터는 그대로)
  else inFlight--
}

/**
 * AniList GraphQL 클라이언트.
 * - 네트워크 오류, HTTP 4xx/5xx, GraphQL errors 모두 AniListError로 throw.
 * - 호출자가 try/catch로 감싸 useToast로 사용자에게 알림.
 * - 동시 요청 5개 제한으로 burst 방어.
 */
export async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
  await acquire()
  try {
    return await queryInner<T>(q, variables)
  } finally {
    release()
  }
}

async function queryInner<T>(q: string, variables: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: q, variables }),
    })
  } catch (e) {
    throw new AniListError(STRINGS.errors.network, e)
  }

  if (!res.ok) {
    if (res.status === 429) throw new AniListError(STRINGS.errors.rateLimit)
    if (res.status >= 500) throw new AniListError(STRINGS.errors.serverDown)
    throw new AniListError(STRINGS.errors.requestFailed(res.status))
  }

  let json: { data: T; errors?: { message?: string }[] }
  try {
    json = await res.json() as typeof json
  } catch (e) {
    throw new AniListError(STRINGS.errors.unreadable, e)
  }

  if (json.errors?.length) {
    // logger 의존성을 만들지 않기 위해 console 유지 (client는 utils에 의존하지 않음)
    console.warn('[AniList]', json.errors)
    // partial data가 있으면 살리되, 진짜 비었으면 throw
    if (json.data == null) {
      const msg = json.errors[0]?.message ?? STRINGS.errors.graphqlDefault
      throw new AniListError(msg)
    }
  }
  return json.data
}
