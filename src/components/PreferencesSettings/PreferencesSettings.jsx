import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';
import { getStreamProtocol, setStreamProtocol } from '../../utils/streamProtocol';
import SegmentedControl from '../SegmentedControl/SegmentedControl';
import SettingsSection from '../SettingsSection/SettingsSection';

/** Settings of this browser: the interface language, the streaming protocol. */
export default function PreferencesSettings() {
  const { t, i18n } = useTranslation();
  const [protocol, setProtocol] = useState(getStreamProtocol);

  return (
    <>
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
      <SettingsSection
        title={t('Streaming protocol')}
        description={t(
          'How the server sends a converted video, kept in this browser. DASH, recommended, sends H.264, HEVC, VP9 and AV1 video as it is and shows text subtitles as text. HLS sends only H.264 as it is, converting the rest, and burns subtitles into the picture. Applies from the next playback.',
        )}
        aside={
          <SegmentedControl
            label={t('Streaming protocol')}
            options={[
              { value: 'DASH', label: 'DASH', tone: 'accent' },
              { value: 'HLS', label: 'HLS', tone: 'accent' },
            ]}
            value={protocol}
            onChange={(value) => {
              setStreamProtocol(value);
              setProtocol(value);
            }}
          />
        }
      />
    </>
  );
}
