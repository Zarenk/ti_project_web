import fs from 'fs'
import path from 'path'
import { brandAssets } from '../src/catalog/brandAssets'

const logosDir = path.join(__dirname, '..', 'public')
const missing: string[] = []

for (const [brand, logoPath] of Object.entries(brandAssets.brands)) {
  const resolved = path.join(logosDir, logoPath.replace(/^\//, ''))
  if (!fs.existsSync(resolved)) {
    missing.push(`${brand}: ${resolved}`)
  }
}

if (missing.length > 0) {
  console.error('Missing brand logos:\n' + missing.join('\n'))
  process.exit(1)
}

console.log('All brand logos are present.')