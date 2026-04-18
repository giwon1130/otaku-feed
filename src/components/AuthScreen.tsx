import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LogIn, UserPlus } from 'lucide-react-native'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { login as kakaoLogin } from '@react-native-kakao/user'
import { apiLogin, apiSignup, apiGoogleOAuth, apiKakaoOAuth, type AuthResponse } from '../api/otakuApi'
import { styles } from '../styles'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
})

type Mode = 'login' | 'signup'

type Props = {
  onDone: (user: AuthResponse) => void
  onSkip: () => void
}

export function AuthScreen({ onDone, onSkip }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      const idToken = userInfo.data?.idToken
      if (!idToken) throw new Error('구글 토큰을 받지 못했어.')
      const res = await apiGoogleOAuth(idToken)
      onDone(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '구글 로그인에 실패했어.')
    } finally {
      setLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await kakaoLogin()
      const accessToken = result.accessToken
      if (!accessToken) throw new Error('카카오 토큰을 받지 못했어.')
      const res = await apiKakaoOAuth(accessToken)
      onDone(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '카카오 로그인에 실패했어.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!email.trim() || !password.trim()) { setError('이메일과 비밀번호를 입력해.'); return }
    if (mode === 'signup' && !nickname.trim()) { setError('닉네임을 입력해.'); return }

    setLoading(true)
    try {
      const res = mode === 'login'
        ? await apiLogin(email.trim(), password)
        : await apiSignup(email.trim(), password, nickname.trim())
      onDone(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f1a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#9f67ff', fontSize: 14, fontWeight: '900', letterSpacing: 3 }}>
            OTAKU FEED
          </Text>
          <Text style={styles.onboardingTitle}>
            {mode === 'login' ? '다시 왔군 👾' : '처음이야? 👋'}
          </Text>
          <Text style={styles.onboardingSubtitle}>
            {mode === 'login'
              ? '로그인하면 스와이프 기록이 모든 기기에 동기화돼.'
              : '계정을 만들면 좋아요 목록을 어디서든 볼 수 있어.'}
          </Text>
        </View>

        {/* 탭 */}
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 4 }}>
          {(['login', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setError('') }}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                backgroundColor: mode === m ? '#2d1b69' : 'transparent',
              }}
            >
              <Text style={{ color: mode === m ? '#9f67ff' : '#6b6b99', fontWeight: '800', fontSize: 13 }}>
                {m === 'login' ? '로그인' : '회원가입'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 폼 */}
        <View style={{ gap: 10 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor="#45456b"
            style={styles.searchInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {mode === 'signup' ? (
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임"
              placeholderTextColor="#45456b"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor="#45456b"
            style={styles.searchInput}
            secureTextEntry
          />
        </View>

        {/* 에러 */}
        {error ? (
          <View style={{ backgroundColor: '#3a0e0e', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7f1d1d' }}>
            <Text style={{ color: '#fca5a5', fontSize: 13, fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}

        {/* 제출 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.onboardingCTA, { opacity: loading ? 0.6 : 1, flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : mode === 'login'
              ? <LogIn size={18} color="#fff" />
              : <UserPlus size={18} color="#fff" />
          }
          <Text style={styles.onboardingCTAText}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 만들기'}
          </Text>
        </Pressable>

        {/* 소셜 로그인 구분선 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#2a2a45' }} />
          <Text style={{ color: '#45456b', fontSize: 12, fontWeight: '600' }}>또는</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#2a2a45' }} />
        </View>

        {/* 소셜 로그인 버튼들 */}
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={handleGoogleLogin}
            disabled={loading}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <View style={{ width: 28 }}>
              <Text style={{ fontSize: 18 }}>G</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#1a1a1a', fontSize: 15, fontWeight: '700' }}>구글로 시작하기</Text>
            </View>
            <View style={{ width: 28 }} />
          </Pressable>

          <Pressable
            onPress={handleKakaoLogin}
            disabled={loading}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#FEE500', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <View style={{ width: 28 }}>
              <Text style={{ fontSize: 18 }}>💬</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#3C1E1E', fontSize: 15, fontWeight: '700' }}>카카오로 시작하기</Text>
            </View>
            <View style={{ width: 28 }} />
          </Pressable>
        </View>

        {/* 건너뛰기 */}
        <Pressable onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#45456b', fontSize: 13, fontWeight: '600' }}>
            로그인 없이 계속하기 →
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
