import { useTranslation } from 'react-i18next';
import SettingsSection from '../../components/SettingsSection/SettingsSection';
import { SettingControl, SettingFailure, SettingFoot, SettingRow, useSaveSetting } from './SettingParts';
import { ANALYSIS_TASKS, quickAnalysisText, settingText } from './settingText';
import styles from './ServerPage.module.css';

/** How many of one task run at once over the whole server, within the setting's bounds. */
function ConcurrencyLine({ setting }) {
  const { t } = useTranslation();
  const { save, saving, failure } = useSaveSetting(setting);
  const text = settingText(t, setting);
  return (
    <div className={styles.analysisLine}>
      <div className={styles.analysisLineHead}>
        <div>
          <span className={styles.analysisLineTitle}>{t('Tasks at once')}</span>
          <p className={styles.analysisLineDescription}>{text.description}</p>
        </div>
        <SettingControl setting={setting} label={text.title} disabled={saving} error={failure} onChange={save} />
      </div>
      <SettingFoot setting={setting} disabled={saving} onReset={() => save(null)} />
    </div>
  );
}

/** A task an owner may turn off: a setting each library follows unless it holds its own. */
function ToggledTask({ toggle, concurrency }) {
  const { t } = useTranslation();
  const { save, saving, failure } = useSaveSetting(toggle);
  const text = settingText(t, toggle);
  return (
    <SettingsSection
      title={text.title}
      description={text.description}
      aside={<SettingControl setting={toggle} label={text.title} disabled={saving} onChange={save} />}
    >
      <SettingFoot setting={toggle} disabled={saving} onReset={() => save(null)} />
      <SettingFailure>{failure}</SettingFailure>
      {toggle.perLibrary && (
        <p className={styles.analysisNote}>{t('Each library follows this value unless it holds its own, in its analysis settings.')}</p>
      )}
      {concurrency && <ConcurrencyLine setting={concurrency} />}
    </SettingsSection>
  );
}

/** The quick analysis, which makes a file playable: always made, so only how many at once. */
function QuickTask({ concurrency }) {
  const { t } = useTranslation();
  const text = quickAnalysisText(t);
  return (
    <SettingsSection title={text.title} description={text.description} aside={<span className={styles.alwaysOn}>{t('Always on')}</span>}>
      {concurrency && <ConcurrencyLine setting={concurrency} />}
    </SettingsSection>
  );
}

/**
 * The `analysis` namespace, grouped by task in the order the server runs them: the quick
 * analysis, always made, then each task an owner may turn off. A setting the client does not
 * know yet shows on its own after them.
 */
export default function AnalysisSettings({ settings }) {
  const byKey = new Map(settings.map((s) => [s.key, s]));
  const grouped = new Set();
  const tasks = ANALYSIS_TASKS.flatMap((task) => {
    const toggle = task.toggle ? byKey.get(task.toggle) : null;
    const concurrency = byKey.get(task.concurrency) ?? null;
    // A task the server does not offer to turn off, other than the quick analysis, is not one it runs.
    if (task.toggle && !toggle) return [];
    if (toggle) grouped.add(toggle.key);
    if (concurrency) grouped.add(concurrency.key);
    return [{ task, toggle, concurrency }];
  });
  return (
    <div className={styles.list}>
      {tasks.map(({ task, toggle, concurrency }) => (
        toggle ? (
          <ToggledTask key={task.id} toggle={toggle} concurrency={concurrency} />
        ) : (
          <QuickTask key={task.id} concurrency={concurrency} />
        )
      ))}
      {settings
        .filter((s) => !grouped.has(s.key))
        .map((setting) => (
          <SettingRow key={setting.key} setting={setting} />
        ))}
    </div>
  );
}
