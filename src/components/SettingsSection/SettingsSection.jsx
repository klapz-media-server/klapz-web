import styles from './SettingsSection.module.css';

/** A block of the settings page: a title, a line of explanation, its controls. */
export default function SettingsSection({ title, description, children, aside }) {
  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {aside}
      </header>
      {children && <div className={styles.body}>{children}</div>}
    </section>
  );
}
