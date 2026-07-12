import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const base = 'src/i18n/locales'
const locales = ['pt-BR', 'en', 'es']

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = true
  }
  return out
}

const files = readdirSync(join(base, 'pt-BR')).filter((f) => f.endsWith('.json'))
let problems = 0

for (const file of files) {
  const flat = {}
  for (const loc of locales) {
    try {
      flat[loc] = flatten(JSON.parse(readFileSync(join(base, loc, file), 'utf8')))
    } catch (e) {
      console.log(`[ERRO] ${loc}/${file}: ${e.message}`)
      problems++
      flat[loc] = {}
    }
  }
  const ref = Object.keys(flat['pt-BR'])
  for (const loc of ['en', 'es']) {
    const missing = ref.filter((k) => !(k in flat[loc]))
    const extra = Object.keys(flat[loc]).filter((k) => !(k in flat['pt-BR']))
    if (missing.length) {
      console.log(`[FALTA ${loc}] ${file}: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ` (+${missing.length - 20})` : ''}`)
      problems += missing.length
    }
    if (extra.length) {
      console.log(`[EXTRA ${loc}] ${file}: ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? ` (+${extra.length - 20})` : ''}`)
    }
  }
}

console.log(problems === 0 ? 'OK: chaves consistentes entre pt-BR/en/es' : `TOTAL de chaves faltando: ${problems}`)
process.exit(problems === 0 ? 0 : 1)
