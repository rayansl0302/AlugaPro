import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2] === 'all' ? 'all' : 'android'

const gradlePath = resolve(root, 'android/app/build.gradle')
const pbxPath = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj')

function bumpName(versionName) {
  const parts = versionName.split('.')
  const last = Number(parts[parts.length - 1])
  if (Number.isNaN(last)) {
    throw new Error(`versionName inválido: "${versionName}"`)
  }
  parts[parts.length - 1] = String(last + 1)
  return parts.join('.')
}

function bumpAndroid() {
  const source = readFileSync(gradlePath, 'utf8')
  const codeMatch = source.match(/versionCode\s+(\d+)/)
  const nameMatch = source.match(/versionName\s+"([^"]+)"/)

  if (!codeMatch || !nameMatch) {
    throw new Error('Não foi possível ler versionCode/versionName em android/app/build.gradle')
  }

  const oldCode = Number(codeMatch[1])
  const oldName = nameMatch[1]
  const newCode = oldCode + 1
  const newName = bumpName(oldName)

  const next = source
    .replace(/versionCode\s+\d+/, `versionCode ${newCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${newName}"`)

  writeFileSync(gradlePath, next, 'utf8')
  console.log(`Android: ${oldCode} (${oldName}) → ${newCode} (${newName})`)
  return { newCode, newName }
}

function bumpIos(newCode, newName) {
  const source = readFileSync(pbxPath, 'utf8')
  const codeMatch = source.match(/CURRENT_PROJECT_VERSION = (\d+);/)
  const nameMatch = source.match(/MARKETING_VERSION = ([^;]+);/)

  if (!codeMatch || !nameMatch) {
    throw new Error('Não foi possível ler CURRENT_PROJECT_VERSION/MARKETING_VERSION no iOS')
  }

  const oldCode = Number(codeMatch[1])
  const oldName = nameMatch[1].trim()

  const next = source
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${newCode};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${newName};`)

  writeFileSync(pbxPath, next, 'utf8')
  console.log(`iOS:     ${oldCode} (${oldName}) → ${newCode} (${newName})`)
}

try {
  const { newCode, newName } = bumpAndroid()

  if (mode === 'all') {
    bumpIos(newCode, newName)
    console.log('Arquivos: android/app/build.gradle + ios/.../project.pbxproj')
  } else {
    console.log('Arquivo: android/app/build.gradle')
  }

  console.log('Próximo passo: gerar o AAB/IPA de release.')
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
