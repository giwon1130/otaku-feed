import { useEffect, useRef } from 'react'
import { Animated, Text } from 'react-native'

export type ToastType = 'success' | 'error' | 'info'

type Props = {
  message: string
  type?: ToastType
  visible: boolean
}

const BG:     Record<ToastType, string> = { success: '#2d1b69', error: '#3a0e0e', info: '#1a1a2e' }
const BORDER: Record<ToastType, string> = { success: '#7c3aed', error: '#ef4444', info: '#2a2a4a' }
const COLOR:  Record<ToastType, string> = { success: '#c4b5fd', error: '#fca5a5', info: '#a8a8cc' }

export function Toast({ message, type = 'success', visible }: Props) {
  const opacity    = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0,               useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0,  duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  return (
    <Animated.View style={{
      position: 'absolute', bottom: 24, left: 20, right: 20, zIndex: 999,
      backgroundColor: BG[type], borderRadius: 14, padding: 14,
      borderWidth: 1.5, borderColor: BORDER[type],
      opacity, transform: [{ translateY }],
    }}>
      <Text style={{ color: COLOR[type], fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
        {message}
      </Text>
    </Animated.View>
  )
}
