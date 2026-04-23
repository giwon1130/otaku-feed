import { useCallback, useRef, useState } from 'react'
import type { ToastType } from '../components/Toast'

export function useToast(duration = 2200) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type,    setType]    = useState<ToastType>('success')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((msg: string, t: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    setType(t)
    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), duration)
  }, [duration])

  return { visible, message, type, show }
}
