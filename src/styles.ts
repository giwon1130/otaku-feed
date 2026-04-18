import { StyleSheet } from 'react-native'

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#0f0f1a',           // 다크 퍼플-블랙
  surface: '#1a1a2e',      // 카드 배경
  surfaceAlt: '#16213e',   // 보조 카드
  surfaceHover: '#1f2b47',
  border: '#2a2a4a',
  borderLight: '#222240',
  ink: '#f0f0ff',          // 주 텍스트 (밝은 화이트-퍼플)
  inkSub: '#a8a8cc',
  inkMuted: '#6b6b99',
  inkFaint: '#45456b',
  accent: '#7c3aed',       // 바이올렛 포인트
  accentSoft: '#2d1b69',
  accentGlow: '#9f67ff',
  pink: '#ec4899',
  pinkSoft: '#4a1040',
  teal: '#06b6d4',
  tealSoft: '#0e3a4a',
  green: '#22c55e',
  greenSoft: '#0e3a1e',
  red: '#ef4444',
  redSoft: '#3a0e0e',
  gold: '#f59e0b',
  goldSoft: '#3a2a00',
}

const shadow = {
  sm: { shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  md: { shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10 },
  pink: { shadowColor: '#ec4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
}

export const C_TOKENS = C

export const styles = StyleSheet.create({
  // ── App Shell ──────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 40 },

  // ── Header ────────────────────────────────────────────────────────────────
  headerWrap: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  headerGradient: {
    borderRadius: 20, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#1a0a3e', borderWidth: 1, borderColor: '#3a1d80', ...shadow.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  brand: { color: C.accentGlow, fontWeight: '900', fontSize: 13, letterSpacing: 3, marginBottom: 3 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  headerSubtitle: { color: C.inkSub, fontSize: 12, fontWeight: '500', marginTop: 2 },

  // ── Tab Bar ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    marginHorizontal: 14, marginTop: 10, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, ...shadow.sm, paddingVertical: 4,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 3, position: 'relative', borderRadius: 12 },
  tabItemActive: { backgroundColor: C.accentSoft },
  tabItemPressed: { opacity: 0.7 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.inkFaint },
  tabLabelActive: { color: C.accentGlow, fontWeight: '700' },
  tabActiveBar: { position: 'absolute', bottom: 0, width: 20, height: 2, backgroundColor: C.accentGlow, borderRadius: 999 },

  // ── Loading / Error ───────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.inkMuted, fontSize: 14, fontWeight: '600' },
  errorBox: {
    marginHorizontal: 14, marginTop: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#4a1a1a', backgroundColor: C.redSoft, padding: 16, gap: 6,
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 20 },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, padding: 14, gap: 10, ...shadow.sm,
  },
  primaryCard: {
    borderRadius: 20, backgroundColor: '#1a0a3e',
    borderWidth: 1, borderColor: '#3a1d80', padding: 16, gap: 8, ...shadow.md,
  },
  cardEyebrow: { color: C.accentGlow, fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  cardTitle: { color: C.ink, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  cardNote: { color: C.inkSub, fontSize: 13, lineHeight: 20 },
  metaText: { color: C.inkMuted, fontSize: 12, fontWeight: '500' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },

  // ── Anime Card (세로형 포스터) ─────────────────────────────────────────────
  animeCard: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt, ...shadow.sm,
  },
  animeCardImage: { width: '100%', aspectRatio: 2 / 3 },
  animeCardBody: { padding: 10, gap: 4 },
  animeCardTitle: { color: C.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  animeCardMeta: { color: C.inkMuted, fontSize: 11, fontWeight: '600' },
  animeCardScore: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  animeCardScoreText: { color: C.gold, fontSize: 12, fontWeight: '800' },

  // ── Genre Chips ───────────────────────────────────────────────────────────
  genreChip: {
    borderRadius: 999, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surfaceAlt,
  },
  genreChipActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  genreChipText: { color: C.inkSub, fontWeight: '700', fontSize: 12 },
  genreChipTextActive: { color: C.accentGlow, fontWeight: '800' },
  genreChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // ── Swipe Card ────────────────────────────────────────────────────────────
  swipeCardWrap: {
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceAlt, ...shadow.lg,
  },
  swipeCardImage: { width: '100%', aspectRatio: 2 / 3 },
  swipeCardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 24, paddingTop: 60,
    backgroundColor: 'transparent',
  },
  swipeCardTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  swipeCardNative: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  swipeCardMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 6 },
  swipeCardGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  swipeGenreTag: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(124,58,237,0.7)',
  },
  swipeGenreTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  swipeScoreBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  swipeScoreText: { color: C.gold, fontSize: 13, fontWeight: '900' },

  // ── Swipe Action Buttons ──────────────────────────────────────────────────
  swipeActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 16 },
  swipeBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  swipeBtnDislike: { backgroundColor: C.redSoft, borderWidth: 2, borderColor: C.red },
  swipeBtnSkip: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  swipeBtnLike: { backgroundColor: C.accentSoft, borderWidth: 2, borderColor: C.accent, ...shadow.pink },

  // ── Like / Dislike Stamp ──────────────────────────────────────────────────
  stampLike: {
    position: 'absolute', top: 40, left: 20, borderWidth: 3,
    borderColor: C.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    transform: [{ rotate: '-15deg' }],
  },
  stampDislike: {
    position: 'absolute', top: 40, right: 20, borderWidth: 3,
    borderColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    transform: [{ rotate: '15deg' }],
  },
  stampText: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },

  // ── Horizontal Scroll List ────────────────────────────────────────────────
  hScrollContent: { paddingRight: 14, gap: 10 },
  hCard: { width: 130, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
  hCardImage: { width: 130, height: 185 },
  hCardBody: { padding: 8, gap: 3 },
  hCardTitle: { color: C.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  hCardMeta: { color: C.inkMuted, fontSize: 10, fontWeight: '600' },
  hCardLikeBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(124,58,237,0.85)', borderRadius: 999, padding: 4 },

  // ── Ranking Row ───────────────────────────────────────────────────────────
  rankingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceAlt, padding: 10,
  },
  rankingNum: { width: 26, color: C.inkMuted, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  rankingNumTop: { color: C.gold },
  rankingThumb: { width: 48, height: 68, borderRadius: 8 },
  rankingInfo: { flex: 1, gap: 3 },
  rankingTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  rankingMeta: { color: C.inkMuted, fontSize: 11, fontWeight: '600' },
  rankingScore: { color: C.gold, fontSize: 14, fontWeight: '900' },

  // ── Filter Sort Chips ─────────────────────────────────────────────────────
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    borderRadius: 999, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 7,
  },
  filterChipActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  filterText: { color: C.inkSub, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: C.accentGlow, fontWeight: '800' },

  // ── Search ────────────────────────────────────────────────────────────────
  searchInput: {
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 11,
    color: C.ink, fontSize: 14,
  },

  // ── Share Button ──────────────────────────────────────────────────────────
  shareBtn: {
    borderRadius: 12, backgroundColor: C.accentSoft,
    borderWidth: 1.5, borderColor: C.accent,
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, ...shadow.md,
  },
  shareBtnText: { color: C.accentGlow, fontSize: 14, fontWeight: '800' },

  // ── Small Icon Buttons (리스트 아이템용) ──────────────────────────────────
  iconBtn: { borderRadius: 8, padding: 8 },
  iconBtnLike: { backgroundColor: C.accentSoft },
  iconBtnDislike: { backgroundColor: C.redSoft },

  // ── My List Tabs ──────────────────────────────────────────────────────────
  listTabRow: { flexDirection: 'row', gap: 6 },
  listTab: {
    borderRadius: 999, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C.surfaceAlt,
  },
  listTabActive: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  listTabText: { color: C.inkSub, fontSize: 12, fontWeight: '700' },
  listTabTextActive: { color: C.pink, fontWeight: '800' },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '47%', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt, ...shadow.sm,
  },
  gridImage: { width: '100%', aspectRatio: 2 / 3 },
  gridBody: { padding: 8, gap: 4 },
  gridTitle: { color: C.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  gridMeta: { color: C.inkMuted, fontSize: 10, fontWeight: '600' },

  // ── KPI Row ───────────────────────────────────────────────────────────────
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1, borderRadius: 14, backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.border, padding: 12, alignItems: 'center', gap: 4, ...shadow.sm,
  },
  kpiLabel: { color: C.inkMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  kpiValue: { color: C.ink, fontSize: 20, fontWeight: '900' },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyStateText: { color: C.inkMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboardingWrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 60, gap: 24 },
  onboardingTitle: { color: C.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  onboardingSubtitle: { color: C.inkSub, fontSize: 15, lineHeight: 24 },
  onboardingCTA: {
    borderRadius: 16, backgroundColor: C.accent,
    paddingVertical: 16, alignItems: 'center', ...shadow.pink,
  },
  onboardingCTAText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
})
