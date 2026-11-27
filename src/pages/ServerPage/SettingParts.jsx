import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Dropdown, { DropdownItem } from '../../components/Dropdown/Dropdown';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import TextField from '../../components/TextField/TextField';
import { UPDATE_SERVER_SETTINGS } from '../../graphql/mutations';
import { formatDate } from '../../utils/format';
import { invalidText, settingText } from './settingText';
import styles from './ServerPage.module.css';

/**
 * The control a setting's kind calls for. `onChange` receives the new value as text; `error`
 * shows under a field the owner types in, where the value refused is.
 */
export function SettingControl({ setting, label, disabled, error, onChange }) {
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
        error={error}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    );
  }
  if (setting.kind === 'INTEGER') {
    const commit = () => draft.trim() !== setting.value && onChange(draft);
    return (
      <TextField
        aria-label={label}
        className={styles.settingNumber}
        type="number"
        inputMode="numeric"
        min={setting.minimum ?? undefined}
        max={setting.maximum ?? undefined}
        value={draft}
        disabled={disabled}
        error={error}
        hint={t('From {{minimum}} to {{maximum}}, {{default}} by default', {
          minimum: setting.minimum,
          maximum: setting.maximum,
          default: setting.defaultValue,
        })}
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

/** Whether a setting's kind has a field to type in, under which a refusal shows. */
export const typed = (setting) => setting.kind === 'INTEGER' || setting.kind === 'ADDRESS';

/**
 * Saving one server setting: `save(value)`, `null` going back to its default. A refusal
 * becomes `failure`, in the terms of the setting.
 */
export function useSaveSetting(setting) {
  const { t } = useTranslation();
  const [update, { loading }] = useMutation(UPDATE_SERVER_SETTINGS);
  const [failure, setFailure] = useState(null);

  const save = async (value) => {
    setFailure(null);
    try {
      const { data } = await update({ variables: { input: { settings: [{ key: setting.key, value }] } } });
      // One setting is sent at a time: whatever field the refusal names, it is this one's.
      const refused = data?.updateServerSettings.userErrors[0];
      if (refused) setFailure(refused.code === 'INVALID_VALUE' ? invalidText(t, setting) : refused.message);
    } catch (error) {
      setFailure(error.message);
    }
  };
  return { save, saving: loading, failure };
}

/** Under a setting: its key, whether an owner moved it off its default, and going back to it. */
export function SettingFoot({ setting, disabled, onReset }) {
  const { t } = useTranslation();
  return (
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
          <Button size="sm" variant="ghost" icon="replay" disabled={disabled} onClick={onReset}>
            {setting.defaultValue === '' ? t('Clear') : t('Back to {{value}}', { value: shownValue(t, setting, setting.defaultValue) })}
          </Button>
        </>
      )}
    </div>
  );
}

/** A value as the interface says it: `true` and `false` are On and Off. */
export function shownValue(t, setting, value) {
  if (setting.kind === 'BOOLEAN') return value === 'true' ? t('On') : t('Off');
  return value;
}

/** A refusal shown under a whole setting, for a control that has no field of its own. */
export function SettingFailure({ children }) {
  if (!children) return null;
  return (
    <p className={styles.settingFailure} role="alert">
      {children}
    </p>
  );
}

/** One setting: what it does, its control, and whether an owner moved it off its default. */
export function SettingRow({ setting }) {
  const { t } = useTranslation();
  const { save, saving, failure } = useSaveSetting(setting);
  const text = settingText(t, setting);

  return (
    <SettingsSection
      title={text.title}
      description={text.description}
      aside={
        <SettingControl setting={setting} label={text.title} disabled={saving} error={typed(setting) ? failure : null} onChange={save} />
      }
    >
      <SettingFoot setting={setting} disabled={saving} onReset={() => save(null)} />
      {!typed(setting) && <SettingFailure>{failure}</SettingFailure>}
    </SettingsSection>
  );
}

