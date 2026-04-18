// 앱 아이콘 생성 스크립트 (sharp 사용)
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, '../assets')

// 1024x1024 SVG 아이콘 — 다크 퍼플 그라디언트 + OF 로고타입
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a3e"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9f67ff"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- 배경 -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>

  <!-- 글로우 원 -->
  <circle cx="512" cy="430" r="280" fill="#7c3aed" opacity="0.12" filter="url(#glow)"/>

  <!-- 일본어 풍 장식선 (위) -->
  <line x1="160" y1="200" x2="864" y2="200" stroke="#3a1d80" stroke-width="2" opacity="0.6"/>
  <line x1="160" y1="210" x2="864" y2="210" stroke="#3a1d80" stroke-width="1" opacity="0.3"/>

  <!-- 메인 텍스트: OF -->
  <text x="512" y="560"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="900"
    font-size="380"
    text-anchor="middle"
    fill="url(#accent)"
    letter-spacing="-20"
    filter="url(#glow)"
  >OF</text>

  <!-- 서브 텍스트 -->
  <text x="512" y="680"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="700"
    font-size="72"
    text-anchor="middle"
    fill="#6b3fa0"
    letter-spacing="20"
  >OTAKU FEED</text>

  <!-- 장식선 (아래) -->
  <line x1="200" y1="730" x2="824" y2="730" stroke="#3a1d80" stroke-width="1.5" opacity="0.5"/>

  <!-- 별 장식 -->
  <circle cx="180" cy="430" r="6" fill="#9f67ff" opacity="0.5"/>
  <circle cx="844" cy="430" r="6" fill="#9f67ff" opacity="0.5"/>
  <circle cx="180" cy="460" r="3" fill="#7c3aed" opacity="0.4"/>
  <circle cx="844" cy="460" r="3" fill="#7c3aed" opacity="0.4"/>
</svg>
`

// 스플래시 아이콘 SVG (투명 배경, 가운데 로고만)
const splashSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9f67ff"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- OF 텍스트 -->
  <text x="512" y="560"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="900"
    font-size="380"
    text-anchor="middle"
    fill="url(#accent)"
    letter-spacing="-20"
    filter="url(#glow)"
  >OF</text>

  <!-- OTAKU FEED -->
  <text x="512" y="660"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="700"
    font-size="72"
    text-anchor="middle"
    fill="#9f67ff"
    letter-spacing="20"
  >OTAKU FEED</text>
</svg>
`

async function generate() {
  console.log('🎨 아이콘 생성 중...')

  // icon.png (1024x1024)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(join(assetsDir, 'icon.png'))
  console.log('✅ icon.png 생성')

  // adaptive-icon.png (1024x1024, 안드로이드)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(join(assetsDir, 'adaptive-icon.png'))
  console.log('✅ adaptive-icon.png 생성')

  // splash-icon.png (투명 배경)
  await sharp(Buffer.from(splashSvg))
    .resize(512, 512)
    .png()
    .toFile(join(assetsDir, 'splash-icon.png'))
  console.log('✅ splash-icon.png 생성')

  // favicon.png (48x48)
  await sharp(Buffer.from(iconSvg))
    .resize(48, 48)
    .png()
    .toFile(join(assetsDir, 'favicon.png'))
  console.log('✅ favicon.png 생성')

  console.log('🚀 모든 아이콘 생성 완료!')
}

generate().catch(console.error)
