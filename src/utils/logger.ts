/**
 * 가벼운 로깅 래퍼.
 * 지금은 console로만 출력하지만, 나중에 Sentry/Mixpanel/PostHog 같은 SaaS로
 * 교체할 때 호출부 변경 없이 이 파일만 수정하면 됨.
 *
 * 사용:
 *   import { logger } from '../utils/logger'
 *   logger.warn('feed.load failed', { tab: 'home', error: e })
 *   logger.captureException(error, { context: 'AniList query' })
 *
 * 다음 단계 (운영 모드 전환 시):
 *   1. `npx expo install @sentry/react-native`
 *   2. EAS/이 풀빌드에 포함
 *   3. 이 파일에서 `Sentry.init` + `Sentry.captureException`로 교체
 *   4. 호출부는 그대로 — interface 호환 유지
 */

type LogContext = Record<string, unknown>

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (__DEV__) console.log(`[debug] ${message}`, ctx ?? '')
  },

  info(message: string, ctx?: LogContext) {
    console.log(`[info] ${message}`, ctx ?? '')
  },

  warn(message: string, ctx?: LogContext) {
    console.warn(`[warn] ${message}`, ctx ?? '')
  },

  error(message: string, ctx?: LogContext) {
    console.error(`[error] ${message}`, ctx ?? '')
    // TODO(Sentry): Sentry.captureMessage(message, { level: 'error', extra: ctx })
  },

  /**
   * 잡힌 예외를 보고. 사용자 메시지(toast)는 별도로 처리하고,
   * 여기선 디버깅/운영 가시성을 위해 기록만.
   */
  captureException(err: unknown, ctx?: LogContext) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error(`[exception] ${e.message}`, { ...ctx, stack: e.stack })
    // TODO(Sentry): Sentry.captureException(e, { extra: ctx })
  },
}
