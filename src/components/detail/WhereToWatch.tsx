import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { MonitorPlay } from 'lucide-react-native'
import { C_TOKENS as C } from '../../styles'
import type { ExternalLink } from '../../types'

// 플랫폼별 색상
const PLATFORM_COLOR: Record<string, string> = {
  'Crunchyroll':           '#F47521',
  'Netflix':               '#E50914',
  'Amazon Prime Video':    '#00A8E0',
  'Amazon':                '#00A8E0',
  'Disney+':               '#113CCF',
  'Funimation':            '#5B0BB5',
  'HIDIVE':                '#00AEEF',
  'YouTube':               '#FF0000',
  'Hulu':                  '#3DBB3D',
  'Apple TV+':             '#555555',
  'Bilibili':              '#00A1D6',
  'VRV':                   '#FFDB1E',
  'Wakanim':               '#E4001E',
  'AnimeLabPlus':          '#1B55A0',
}

/** "어디서 볼 수 있어?" 섹션 — 라프텔/Netflix/Crunchyroll 등 외부 링크. */
export function WhereToWatch({ links, loading }: { links: ExternalLink[]; loading: boolean }) {
  return (
    <View style={{ gap: 10, marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MonitorPlay size={14} color={C.accentGlow} strokeWidth={2.5} />
        <Text style={{ color: C.accentGlow, fontSize: 13, fontWeight: '800' }}>어디서 볼 수 있어?</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={C.accentGlow} style={{ alignSelf: 'flex-start' }} />
      ) : links.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {links.map((link) => {
              const color = (link.color ?? PLATFORM_COLOR[link.site]) ?? C.accent
              const isRegional = link.regional === true
              return (
                <Pressable
                  key={link.url}
                  onPress={() => void Linking.openURL(link.url)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 9,
                    borderRadius: 12, borderWidth: 1.5,
                    borderColor: color + (isRegional ? 'aa' : '55'),
                    backgroundColor: color + (isRegional ? '33' : '15'),
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: color,
                  }} />
                  <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>
                    {link.site}
                  </Text>
                  {isRegional ? (
                    <View style={{
                      backgroundColor: '#10b98133', borderRadius: 999,
                      paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2,
                    }}>
                      <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '900' }}>KR</Text>
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: '#6b6b9933', borderRadius: 999,
                      paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2,
                    }}>
                      <Text style={{ color: C.inkSub, fontSize: 9, fontWeight: '900' }}>글로벌</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
          {links.some((l) => l.regional !== true) ? (
            <Text style={{ color: C.inkMuted, fontSize: 11, marginTop: 2 }}>
              ⚠️ "글로벌" 표시는 해외 카탈로그 기준이라 한국 계정에선 안 보일 수도 있어.
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={{ color: C.inkFaint, fontSize: 13, fontWeight: '600' }}>
          한국에서 볼 수 있는 플랫폼 정보가 없어. 😢
        </Text>
      )}
    </View>
  )
}
