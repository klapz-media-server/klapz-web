import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dialog from '../../components/Dialog/Dialog';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import Spinner from '../../components/Spinner/Spinner';
import { UPDATE_LIBRARY_SETTINGS } from '../../graphql/mutations';
import { LIBRARY_ANALYSIS_SETTINGS } from '../../graphql/queries';
import { formatDate } from '../../utils/format';
import { SettingFailure, shownValue } from './SettingParts';
import { invalidText, settingText } from './settingText';
import styles from './ServerPage.module.css';

const NAMESPACE = 'analysis';

/** Why the server refused a library's value, for a person. */
function refusalText(t, setting, error) {
  switch (error.code) {
    case 'INVALID_VALUE':
      return invalidText(t, setting);
    case 'SERVER_ONLY':
      return t('This setting belongs to the server alone: a library cannot hold a value of its own.');
    case 'LIBRARY_NOT_FOUND':
      return t('This library no longer exists, or you may not change it.');
    default:
      return error.message;
  }
}

/**
 * The value a library holds of a setting: none, following the server (`null`), or one of its
 * own. A setting that is not a switch can only be sent back to the server's.
 */
function LibrarySettingControl({ setting, label, disabled, onChange }) {
  const { t } = useTranslation();
  if (setting.kind !== 'BOOLEAN') return <code className={styles.settingKey}>{setting.value}</code>;
  return (
    <SegmentedControl
      label={label}
      disabled={disabled}
      options={[
        { value: null, label: t('Server ({{value}})', { value: shownValue(t, setting, setting.serverValue) }) },
        { value: 'false', label: t('Off') },
        { value: 'true', label: t('On'), tone: 'accent' },
      ]}
      value={setting.isInherited ? null : setting.value}
      onChange={onChange}
    />
  );
}

/** One setting of the library: what it does, the value it holds, and following the server again. */
function LibrarySettingRow({ libraryId, setting }) {
  const { t } = useTranslation();
  const [update, { loading }] = useMutation(UPDATE_LIBRARY_SETTINGS);
  const [failure, setFailure] = useState(null);
  const text = settingText(t, setting);
  const server = shownValue(t, setting, setting.serverValue);

  const save = async (value) => {
    setFailure(null);
    try {
      const { data } = await update({
        variables: { input: { libraryId, settings: [{ key: setting.key, value }] }, namespace: NAMESPACE },
      });
      // One setting is sent at a time: whatever field the refusal names, it is this one's.
      const refused = data?.updateLibrarySettings.userErrors[0];
      if (refused) setFailure(refusalText(t, setting, refused));
    } catch (error) {
      setFailure(error.message);
    }
  };

  return (
    <SettingsSection
      title={text.title}
      description={text.description}
      aside={<LibrarySettingControl setting={setting} label={text.title} disabled={loading} onChange={save} />}
    >
      <div className={styles.settingFoot}>
        <code className={styles.settingKey}>{setting.key}</code>
        {setting.isInherited ? (
          <span>{t('Follows the server: {{value}}', { value: server })}</span>
        ) : (
          <>
            <span className={styles.settingOwn}>
              {setting.updatedBy
                ? t('Set for this library by {{username}} on {{date}}', {
                    username: setting.updatedBy.username,
                    date: formatDate(setting.updatedAt),
                  })
                : t('Set for this library on {{date}}', { date: formatDate(setting.updatedAt) })}
            </span>
            <Button size="sm" variant="ghost" icon="replay" disabled={loading} onClick={() => save(null)}>
              {t('Follow the server ({{value}})', { value: server })}
            </Button>
          </>
        )}
      </div>
      <SettingFailure>{failure}</SettingFailure>
    </SettingsSection>
  );
}

/**
 * The analysis settings of one library, for the server's owners: each task follows the
 * server's setting unless the library holds a value of its own. Each change is saved at once.
 */
export default function LibrarySettingsDialog({ library, onClose }) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(LIBRARY_ANALYSIS_SETTINGS, {
    variables: { id: library?.id, namespace: NAMESPACE },
    skip: !library,
    fetchPolicy: 'cache-and-network',
  });
  const settings = data?.node?.settings?.nodes;

  let body;
  if (loading && !settings) {
    body = (
      <div className={styles.dialogLoading}>
        <Spinner />
      </div>
    );
  } else if (error || !data?.node) {
    body = (
      <SettingFailure>
        {error && !/not found/i.test(error.message) ? error.message : t('This library no longer exists, or you may not change it.')}
      </SettingFailure>
    );
  } else if (settings.length === 0) {
    body = <p className={styles.denied}>{t('No setting here yet.')}</p>;
  } else {
    body = (
      <div className={`${styles.list} ${styles.dialogList}`}>
        {settings.map((setting) => (
          <LibrarySettingRow key={setting.key} libraryId={library.id} setting={setting} />
        ))}
      </div>
    );
  }

  return (
    <Dialog
      open={!!library}
      onClose={onClose}
      size="wide"
      title={library ? t('Analysis of {{title}}', { title: library.title }) : null}
      description={t(
        'Each task follows the analysis settings of the server unless this library holds a value of its own. The quick analysis is always made. Each change is saved at once.',
      )}
      actions={<Button onClick={onClose}>{t('Close')}</Button>}
    >
      {body}
    </Dialog>
  );
}
