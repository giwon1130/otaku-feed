import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { C_TOKENS as C } from '../styles'

/**
 * 화면 상단에 깔리는 얇은 indeterminate progress bar.
 * 데이터 fetch 중인 동안 visible=true로 두면 좌→우로 흐르는 애니메이션 표시.
 *
 * 위치는 부모가 absolute로 잡거나 inline으로 사용. 기본 높이 2px.
 */
type Props = {
  visible: boolean
  height?: number
}

export function LoadingBar({ visible, height = 2 }: Props) {
  const x = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      x.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [visible, x])

  if (!visible) return null

  // -100% → 100% 로 슬라이드 (translateX는 컨테이너 너비 기반 비율 트릭으로 layout 폭 무관하게)
  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '300%'],
  })

  return (
    <View style={{
      height,
      backgroundColor: C.accentSoft,
      overflow: 'hidden',
    }}>
      <Animated.View style={{
        height: '100%',
        width: '40%',
        backgroundColor: C.accent,
        transform: [{ translateX } as never],
      }} />
    </View>
  )
}
