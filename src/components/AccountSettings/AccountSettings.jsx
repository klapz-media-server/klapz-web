import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import SettingsSection from '../SettingsSection/SettingsSection';
import styles from './AccountSettings.module.css';

/** Who the app is signed in as, its libraries, signing out. */
export default function AccountSettings({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, owner, signOut } = session;
  const libraries = user?.libraryPermissions.nodes.filter((p) => p.library) ?? [];
  if (!user) return null;

  return (
    <div className={styles.stack}>
      <SettingsSection
        title={t('Signed in as')}
        aside={
          <Button
            size="sm"
            variant="secondary"
            icon="close"
            onClick={async () => {
              await signOut();
              navigate('/sign-in', { replace: true });
            }}
          >
            {t('Sign out')}
          </Button>
        }
      >
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div className={styles.who}>
            <strong>{user.username}</strong>
            <span>
              {[user.email, owner ? t('Owner of the server') : null, t('User since {{date}}', { date: formatDate(user.createdAt) })]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>
        {owner ? (
          <p className={styles.muted}>{t('As an owner, you reach every library and manage the users.')}</p>
        ) : (
          <div className={styles.libraries}>
            <h3 className={styles.subTitle}>{t('Your libraries')}</h3>
            {libraries.length ? (
              <ul className={styles.chips}>
                {libraries.map((p) => (
                  <li key={p.library.id} className={styles.chip}>
                    {p.library.title}
                    {p.role === 'ADMIN' && <span className={styles.role}>{t('Admin')}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{t('No library has been shared with you yet.')}</p>
            )}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
