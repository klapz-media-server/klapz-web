import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';
import SegmentedControl from '../SegmentedControl/SegmentedControl';
import SettingsSection from '../SettingsSection/SettingsSection';

/** Settings of this browser: the interface language. */
export default function PreferencesSettings() {
  const { t, i18n } = useTranslation();
  return (
    <SettingsSection
      title={t('Language')}
      description={t('The language of the interface, kept in this browser. Titles and summaries come in the language of each library.')}
      aside={
        <SegmentedControl
          label={t('Language')}
          options={LANGUAGES.map((lng) => ({ value: lng.code, label: lng.label, tone: 'accent' }))}
          value={i18n.resolvedLanguage ?? 'en'}
          onChange={(code) => i18n.changeLanguage(code)}
        />
      }
    />
  );
}
