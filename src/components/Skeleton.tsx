import { useEffect, useRef } from 'react'
import { Animated, ViewStyle } from 'react-native'

type Props = {
  width?: number | string
  height?: number | string
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3,  duration: 750, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <Animated.View
      style={[
        { width: width as any, height: height as any, borderRadius, backgroundColor: '#2a2a4a', opacity },
        style,
      ]}
    />
  )
}
