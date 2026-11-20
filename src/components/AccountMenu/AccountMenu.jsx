import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useViewer } from '../../hooks/useViewer';
import { LANGUAGES } from '../../i18n';
import Dropdown, { DropdownHeading, DropdownItem } from '../Dropdown/Dropdown';
import styles from './AccountMenu.module.css';

/** The account button of the top bar: settings, administration, language. */
export default function AccountMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, owner, signOut } = useViewer();
  const label = user?.username ?? t('Account');
  const current = i18n.resolvedLanguage ?? 'en';

  const go = (close, path) => {
    close();
    navigate(path);
  };

  return (
    <Dropdown label={label} icon="person" align="end" buttonClassName={styles.button}>
      {(close) => (
        <>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {label.charAt(0).toUpperCase()}
            </span>
            <span className={styles.who}>
              <strong>{label}</strong>
              <span>{owner ? t('Owner of the server') : t('User account')}</span>
            </span>
          </div>
          <DropdownItem onClick={() => go(close, '/settings')}>{t('Settings')}</DropdownItem>
          {owner && <DropdownItem onClick={() => go(close, '/admin')}>{t('Administration')}</DropdownItem>}
          <DropdownItem
            onClick={async () => {
              close();
              await signOut();
              navigate('/sign-in', { replace: true });
            }}
          >
            {t('Sign out')}
          </DropdownItem>
          <DropdownHeading>{t('Language')}</DropdownHeading>
          {LANGUAGES.map((lng) => (
            <DropdownItem
              key={lng.code}
              lang={lng.code}
              active={lng.code === current}
              onClick={() => {
                close();
                i18n.changeLanguage(lng.code);
              }}
            >
              {lng.label}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}
