import { Capacitor } from '@capacitor/core'

// No app nativo (Capacitor) o WebView roda na origem https://localhost, que
// não tem nenhum backend por trás — um fetch relativo a /api/... tentaria
// bater nesse localhost e falharia sempre. No navegador (dev ou produção) a
// origem já é a correta (proxy do Vite em dev, mesmo domínio da Vercel em
// produção), então o path relativo funciona normalmente.
const NATIVE_API_ORIGIN = 'https://alugapro.tech'

export function apiUrl(path: string): string {
  return Capacitor.isNativePlatform() ? `${NATIVE_API_ORIGIN}${path}` : path
}
