import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import Spinner from '../../components/Spinner/Spinner';
import { SERVER_SETTINGS } from '../../graphql/queries';
import AnalysisSettings from './AnalysisSettings';
import { SettingRow } from './SettingParts';
import styles from './ServerPage.module.css';

/**
 * The settings of one namespace of the server (`transcoder`…), each saved as soon as it
 * changes. They apply from the next use of what they tune, without a restart.
 */
export default function ServerSettingsSection({ namespace, intro }) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(SERVER_SETTINGS, { variables: { namespace } });

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={() => refetch()} />;
  const settings = data.server.settings.nodes;
  return (
    <div>
      {intro && <p className={styles.settingsIntro}>{intro}</p>}
      {namespace === 'analysis' && settings.length > 0 ? (
        <AnalysisSettings settings={settings} />
      ) : settings.length === 0 ? (
        <p className={styles.denied}>{t('No setting here yet.')}</p>
      ) : (
        <div className={styles.list}>
          {settings.map((setting) => (
            <SettingRow key={setting.key} setting={setting} />
          ))}
        </div>
      )}
    </div>
  );
}
