import { useTranslation } from 'react-i18next'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'
import { Seo } from '@/components/seo/Seo'

type LegalSectionContent = {
  title: string
  body: string[]
}

export function PrivacyPolicyPage() {
  const { t } = useTranslation('legal')
  const sections = t('privacy.sections', { returnObjects: true }) as Record<string, LegalSectionContent>

  return (
    <>
      <Seo title={t('privacy.pageTitle')} description={t('privacy.metaDescription')} path="/politica-de-privacidade" />
      <LegalLayout title={t('privacy.pageTitle')} updatedAt={t('privacy.updatedAt')}>
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
