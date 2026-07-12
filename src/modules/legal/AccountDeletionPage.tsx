import { useTranslation } from 'react-i18next'
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'

type LegalSectionContent = {
  title: string
  body: string[]
}

export function AccountDeletionPage() {
  const { t } = useTranslation('legal')
  const sections = t('accountDeletion.sections', { returnObjects: true }) as Record<string, LegalSectionContent>

  return (
    <LegalLayout title={t('accountDeletion.pageTitle')} updatedAt={t('accountDeletion.updatedAt')}>
      {Object.entries(sections).map(([key, section]) => (
        <LegalSection key={key} title={section.title}>
          {section.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </LegalSection>
      ))}
    </LegalLayout>
  )
}
