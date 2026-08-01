import * as HelmetNS from 'react-helmet-async'

// Alguns bundlers/loaders (ex: tsx, usado no script de pré-renderização)
// resolvem este pacote pelo build CJS e expõem tudo só em `.default` — este
// fallback funciona tanto no Vite (bundle normal do app) quanto no tsx.
const { Helmet } = ((HelmetNS as unknown as { default?: typeof HelmetNS }).default ?? HelmetNS)

export const SITE_URL = 'https://alugapro.tech.br'
const DEFAULT_OG_IMAGE = '/logo-completa-horizontal-alugapro.png'

interface SeoProps {
  title: string
  description: string
  path: string
  ogImage?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
}

export function Seo({ title, description, path, ogImage = DEFAULT_OG_IMAGE, noindex = false, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`
  const image = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="pt_BR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd?.map((item, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(item)}</script>
      ))}
    </Helmet>
  )
}
