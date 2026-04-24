import { Dimensions, Image, Pressable, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { C_TOKENS as C } from '../../styles'
import type { Anime } from '../../types'

const { height: SCREEN_H } = Dimensions.get('window')

/** 디테일 모달 상단: 배너 + 닫기 버튼 + 좌하단 커버. 제목/메타는 본문에서 렌더. */
export function DetailHeader({ anime, onClose }: { anime: Anime; onClose: () => void }) {
  return (
    <View style={{ height: SCREEN_H * 0.32, position: 'relative' }}>
      <Image
        source={{ uri: anime.bannerImage ?? anime.coverImage }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
        backgroundColor: 'rgba(15,15,26,0.7)',
      }} />
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 999, padding: 8,
        }}
      >
        <X size={20} color="#fff" strokeWidth={2.5} />
      </Pressable>
      <View style={{
        position: 'absolute', bottom: -40, left: 20,
        shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      }}>
        <Image
          source={{ uri: anime.coverImage }}
          style={{ width: 90, height: 126, borderRadius: 12, borderWidth: 2, borderColor: C.surface }}
          resizeMode="cover"
        />
      </View>
    </View>
  )
}
