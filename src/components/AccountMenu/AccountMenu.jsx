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
  const { viewer, supported, signOut } = useViewer();
  const email = viewer?.user?.email;
  // A server without the `viewer` query only admits this app as its operator.
  const operator = !!viewer?.isOperator || !supported;
  const label = email ? email.split('@')[0] : operator ? t('Operator') : t('Account');
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
              {(email ?? label).charAt(0).toUpperCase()}
            </span>
            <span className={styles.who}>
              <strong>{email ?? (operator ? t('Server operator') : t('Not signed in'))}</strong>
              <span>{operator ? t('Trusted network') : email ? t('User account') : ''}</span>
            </span>
          </div>
          <DropdownItem onClick={() => go(close, '/settings')}>{t('Settings')}</DropdownItem>
          {operator && <DropdownItem onClick={() => go(close, '/admin')}>{t('Administration')}</DropdownItem>}
          {email ? (
            <DropdownItem
              onClick={async () => {
                close();
                await signOut();
                navigate('/sign-in');
              }}
            >
              {t('Sign out')}
            </DropdownItem>
          ) : (
            supported && <DropdownItem onClick={() => go(close, '/sign-in')}>{t('Sign in with an account')}</DropdownItem>
          )}
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
