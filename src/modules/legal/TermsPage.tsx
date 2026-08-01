import { useTranslation } from 'react-i18next'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { Seo } from '@/components/seo/Seo'

type LegalSectionContent = {
  title: string
  body: string[]
}

export function TermsPage() {
  const { t } = useTranslation('legal')
  const sections = t('terms.sections', { returnObjects: true }) as Record<string, LegalSectionContent>

  return (
    <>
      <Seo title={t('terms.pageTitle')} description={t('terms.metaDescription')} path="/termos" />
      <LegalLayout title={t('terms.pageTitle')} updatedAt={t('terms.updatedAt')}>
        {Object.entries(sections).map(([key, section]) => (
          <LegalSection key={key} title={section.title}>
            {section.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </LegalSection>
        ))}
      </LegalLayout>
    </>
  )
}
