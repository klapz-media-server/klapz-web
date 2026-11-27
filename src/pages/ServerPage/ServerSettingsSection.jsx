import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dropdown, { DropdownItem } from '../../components/Dropdown/Dropdown';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import Spinner from '../../components/Spinner/Spinner';
import TextField from '../../components/TextField/TextField';
import { UPDATE_SERVER_SETTINGS } from '../../graphql/mutations';
import { SERVER_SETTINGS } from '../../graphql/queries';
import { formatDate } from '../../utils/format';
import { integerValue, invalidText, settingText } from './settingText';
import styles from './ServerPage.module.css';

/**
 * The control a setting's kind calls for. `onChange` receives the new value as text;
 * `onRefuse` is called instead for a value the setting cannot take.
 */
function SettingControl({ setting, label, disabled, onChange, onRefuse }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(setting.value);
  useEffect(() => setDraft(setting.value), [setting.value]);

  if (setting.kind === 'BOOLEAN') {
    return (
      <SegmentedControl
        label={label}
        disabled={disabled}
        options={[
          { value: 'false', label: t('Off') },
          { value: 'true', label: t('On'), tone: 'accent' },
        ]}
        value={setting.value}
        onChange={onChange}
      />
    );
  }
  if (setting.kind === 'ADDRESS') {
    // Emptied, the address goes back to its default: none.
    const commit = () => draft.trim() !== setting.value && onChange(draft.trim() || null);
    return (
      <TextField
        aria-label={label}
        className={styles.settingAddress}
        type="url"
        inputMode="url"
        spellCheck={false}
        placeholder="https://media.example.com"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    );
  }
  if (setting.kind === 'INTEGER') {
    // A browser's number field reads anything it cannot parse as empty, which an optional
    // setting would take for "none": the field stays text, and the value is checked here.
    const commit = () => {
      const value = integerValue(setting, draft);
      if (value === undefined) return onRefuse();
      setDraft(value);
      onChange(value);
    };
    return (
      <TextField
        aria-label={label}
        inputMode="numeric"
        placeholder={setting.optional ? t('Automatic') : undefined}
        value={draft}
        disabled={disabled}
        hint={t('From {{minimum}} to {{maximum}}', { minimum: setting.minimum, maximum: setting.maximum })}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    );
  }
  return (
    <Dropdown label={setting.value} align="end" buttonClassName={styles.settingChoice}>
      {(close) =>
        setting.choices.map((choice) => (
          <DropdownItem
            key={choice}
            active={choice === setting.value}
            disabled={disabled}
            onClick={() => {
              close();
              if (choice !== setting.value) onChange(choice);
            }}
          >
            {choice}
            {choice === setting.defaultValue && <span className={styles.settingDefault}>{t('default')}</span>}
          </DropdownItem>
        ))
      }
    </Dropdown>
  );
}

/** One setting: what it does, its control, and whether an owner moved it off its default. */
function SettingRow({ setting }) {
  const { t } = useTranslation();
  const [update, { loading }] = useMutation(UPDATE_SERVER_SETTINGS);
  const [failure, setFailure] = useState(null);
  const text = settingText(t, setting);

  const save = async (value) => {
    setFailure(null);
    if (value === setting.value) return;
    try {
      const { data } = await update({ variables: { input: { settings: [{ key: setting.key, value }] } } });
      const refused = data?.updateServerSettings.userErrors[0];
      if (refused) setFailure(refused.code === 'INVALID_VALUE' ? invalidText(t, setting) : refused.message);
    } catch (error) {
      setFailure(error.message);
    }
  };

  return (
    <SettingsSection
      title={text.title}
      description={text.description}
      aside={
        <SettingControl
          setting={setting}
          label={text.title}
          disabled={loading}
          onChange={save}
          onRefuse={() => setFailure(invalidText(t, setting))}
        />
      }
    >
      <div className={styles.settingFoot}>
        <code className={styles.settingKey}>{setting.key}</code>
        {setting.isDefault ? (
          <span>{t('Default value')}</span>
        ) : (
          <>
            <span>
              {setting.updatedBy
                ? t('Changed by {{username}} on {{date}}', { username: setting.updatedBy.username, date: formatDate(setting.updatedAt) })
                : t('Changed on {{date}}', { date: formatDate(setting.updatedAt) })}
            </span>
            <Button size="sm" variant="ghost" icon="replay" disabled={loading} onClick={() => save(null)}>
              {setting.defaultValue === '' ? t('Clear') : t('Back to {{value}}', { value: setting.defaultValue })}
            </Button>
          </>
        )}
      </div>
      {failure && (
        <p className={styles.message} role="alert">
          {failure}
        </p>
      )}
    </SettingsSection>
  );
}

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
      {settings.length === 0 ? (
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
