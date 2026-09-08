import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = resolve(root, 'public/logo-completa-alugapro.png')
const iconPath = resolve(root, 'resources/logo.png')
const outSplash = resolve(root, 'resources/splash.png')
const outSplashDark = resolve(root, 'resources/splash-dark.png')
const outSplashIcon = resolve(root, 'resources/splash-icon.png')

const SIZE = 2732
const LOGO_WIDTH = Math.round(SIZE * 0.42)

async function makeSplash(outputPath) {
  const logo = await sharp(logoPath)
    .resize({ width: LOGO_WIDTH, fit: 'inside' })
    .png()
    .toBuffer()

  const meta = await sharp(logo).metadata()
  const left = Math.round((SIZE - (meta.width ?? LOGO_WIDTH)) / 2)
  const top = Math.round((SIZE - (meta.height ?? LOGO_WIDTH)) / 2)

  // Fundo claro com leve lavagem na cor da marca (#032B61)
  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E8F0FA"/>
          <stop offset="55%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F3F7FC"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `)

  await sharp(svg)
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(outputPath)
}

async function makeSplashIcon() {
  // Ícone denso pro Android 12+ (círculo ~288dp): logo sem padding excessivo
  const canvas = 1024
  const logoSize = 720
  const icon = await sharp(iconPath)
    .resize({ width: logoSize, height: logoSize, fit: 'inside' })
    .png()
    .toBuffer()
  const meta = await sharp(icon).metadata()
  const left = Math.round((canvas - (meta.width ?? logoSize)) / 2)
  const top = Math.round((canvas - (meta.height ?? logoSize)) / 2)

  const bg = Buffer.from(`
    <svg width="${canvas}" height="${canvas}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
    </svg>
  `)

  await sharp(bg)
    .composite([{ input: icon, left, top }])
    .png()
    .toFile(outSplashIcon)
}

await makeSplash(outSplash)
await makeSplash(outSplashDark)
await makeSplashIcon()
console.log('Gerado:', outSplash)
console.log('Gerado:', outSplashDark)
console.log('Gerado:', outSplashIcon)
