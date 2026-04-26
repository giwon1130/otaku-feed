import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { apiHealth } from '../api/otakuApi'

export type BackendStatus = 'unknown' | 'online' | 'offline'

/**
 * 백엔드(otaku-feed-api / Railway) 헬스 상태 polling.
 *
 * - `enabled=false`면 polling 안 함 (로컬 모드 사용자는 백엔드 호출 안 하니까 무의미 + Railway 비용)
 * - 마운트 즉시 1회 ping (enabled일 때)
 * - 이후 INTERVAL_MS마다 polling (포그라운드 + enabled일 때만)
 * - AppState change → 'active' 복귀 시 즉시 한 번 더 ping
 *
 * 헤더에 "동기화 중" / "오프라인 모드" 같은 배지 노출용.
 */
const INTERVAL_MS = 60 * 1000   // 60초 (이전 30초에서 완화 — 비용 절반)

export function useBackendHealth(enabled: boolean = true): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('unknown')

  useEffect(() => {
    if (!enabled) {
      setStatus('unknown')
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const ping = async () => {
      const ok = await apiHealth().catch(() => false)
      if (!cancelled) setStatus(ok ? 'online' : 'offline')
    }

    const start = () => {
      void ping()
      timer = setInterval(() => { void ping() }, INTERVAL_MS)
    }
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null }
    }

    start()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { stop(); start() }
      else stop()
    })

    return () => {
      cancelled = true
      stop()
      sub.remove()
    }
  }, [enabled])

  return status
}
