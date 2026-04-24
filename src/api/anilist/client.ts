import { STRINGS } from '../../i18n/strings'

const ENDPOINT = 'https://graphql.anilist.co'

/** AniList 호출에서 발생한 에러 — UI 레벨에서 instanceof로 식별 가능. */
export class AniListError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AniListError'
  }
}

/**
 * AniList GraphQL 클라이언트.
 * - 네트워크 오류, HTTP 4xx/5xx, GraphQL errors 모두 AniListError로 throw.
 * - 호출자가 try/catch로 감싸 useToast로 사용자에게 알림.
 */
export async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
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
    console.warn('[AniList]', json.errors)
    // partial data가 있으면 살리되, 진짜 비었으면 throw
    if (json.data == null) {
      const msg = json.errors[0]?.message ?? STRINGS.errors.graphqlDefault
      throw new AniListError(msg)
    }
  }
  return json.data
}
