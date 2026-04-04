import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c8e6c9"/>
      <stop offset="100%" style="stop-color:#81c784"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="#fef9f3"/>
  <path fill="url(#g)" d="M256 96c-48 72-120 108-152 180 32 60 88 100 152 140 64-40 120-80 152-140-32-72-104-108-152-180z"/>
  <ellipse cx="256" cy="340" rx="28" ry="72" fill="#a5d6a7"/>
</svg>`

async function main() {
  await fs.mkdir(publicDir, { recursive: true })
  const buf = Buffer.from(svg)
  await sharp(buf).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192.png'))
  await sharp(buf).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512.png'))
  await fs.writeFile(path.join(publicDir, 'favicon.svg'), svg)
  console.log('Generated public/pwa-192.png, pwa-512.png, favicon.svg')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
