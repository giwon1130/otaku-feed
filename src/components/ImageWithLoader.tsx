import { useRef } from 'react'
import { Animated, View } from 'react-native'

type Props = {
  uri: string
  style: any
  resizeMode?: 'cover' | 'contain' | 'stretch'
}

export function ImageWithLoader({ uri, style, resizeMode = 'cover' }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current

  const handleLoad = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }

  return (
    <View style={[style, { backgroundColor: '#2a2a4a', overflow: 'hidden' }]}>
      <Animated.Image
        source={{ uri }}
        style={[style, { opacity: fadeAnim }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
      />
    </View>
  )
}
