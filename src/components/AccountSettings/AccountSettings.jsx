import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/format';
import Button from '../Button/Button';
import SettingsSection from '../SettingsSection/SettingsSection';
import styles from './AccountSettings.module.css';

/** Who the app is signed in as, its libraries, signing out. */
export default function AccountSettings({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { viewer, signOut } = session;
  const user = viewer?.user;
  const libraries = user?.libraryPermissions.nodes.filter((p) => p.library) ?? [];

  return (
    <div className={styles.stack}>
      <SettingsSection
        title={t('Signed in as')}
        aside={
          user ? (
            <Button
              size="sm"
              variant="secondary"
              icon="close"
              onClick={async () => {
                await signOut();
                navigate('/sign-in');
              }}
            >
              {t('Sign out')}
            </Button>
          ) : (
            <Link to="/sign-in?next=%2Fsettings%2Faccount" className={styles.signIn}>
              {t('Sign in with an account')}
            </Link>
          )
        }
      >
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {(user?.email ?? 'O').charAt(0).toUpperCase()}
          </span>
          <div className={styles.who}>
            <strong>{user ? user.email : viewer?.isOperator ? t('Server operator') : t('Not signed in')}</strong>
            <span>
              {user
                ? t('User since {{date}}', { date: formatDate(new Date(user.createdAt * 1000).toISOString()) })
                : viewer?.isOperator
                  ? t('This browser is on a network the server trusts: it sees every library and manages the users.')
                  : t('The server does not know who you are.')}
            </span>
          </div>
        </div>
        {user && (
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
