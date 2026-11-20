import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button';
import Icon from '../../components/Icon/Icon';
import Logo from '../../components/Logo/Logo';
import PasswordField from '../../components/PasswordField/PasswordField';
import TextField from '../../components/TextField/TextField';
import { FIELD_OF_ACCOUNT_ERROR, USERNAME_PATTERN, useAccountErrorText } from '../../hooks/useAccountErrorText';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useViewer } from '../../hooks/useViewer';
import { safeNext, signInPath } from '../../utils/routes';
import styles from './AuthPage.module.css';

const MIN_PASSWORD = 8;

/**
 * /sign-in and /sign-up, the only pages shown to someone not signed in. A new
 * account waits until an owner of the server activates it; the session is a
 * cookie the server sets.
 */
export default function AuthPage({ mode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const session = useViewer();
  const errorText = useAccountErrorText();
  const signingUp = mode === 'sign-up';
  usePageTitle(signingUp ? t('Create an account') : t('Sign in'));

  const [login, setLogin] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  if (session.user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (signingUp) {
      if (!USERNAME_PATTERN.test(username.trim())) return setError({ field: 'username', text: errorText({ code: 'INVALID_USERNAME' }) });
      if (password.length < MIN_PASSWORD) return setError({ field: 'password', text: errorText({ code: 'WEAK_PASSWORD' }) });
      if (password !== confirmation) return setError({ field: 'confirmation', text: t('The two passwords differ.') });
    } else if (!login.trim() || !password) {
      return setError({ field: login.trim() ? 'password' : 'login', text: t('Enter your username or e-mail address, and your password.') });
    }
    setBusy(true);
    const result = signingUp ? await session.signUp({ username, email, password }) : await session.signIn(login, password);
    setBusy(false);
    if (result.ok) {
      if (signingUp) setCreated(username.trim().toLowerCase());
      else navigate(next, { replace: true });
      return;
    }
    const field = signingUp ? (result.field ?? FIELD_OF_ACCOUNT_ERROR[result.code] ?? null) : null;
    setError({ field, text: errorText(result), code: result.code });
  };

  const otherLink = signInPath(next, signingUp ? '/sign-in' : '/sign-up');

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <main className={styles.card}>
        <span className={styles.logo}>
          <Logo />
        </span>

        {created ? (
          <div className={styles.done} role="status">
            <span className={styles.doneIcon}>
              <Icon name="checkCircle" size={30} />
            </span>
            <h1 className={styles.title}>{t('Account created')}</h1>
            <p className={styles.lead}>
              {t('An owner of the server must activate {{username}} before you can sign in. You will then sign in with this username and password.', { username: created })}
            </p>
            <Button variant="primary" onClick={() => navigate(signInPath(next))}>
              {t('Back to sign in')}
            </Button>
          </div>
        ) : (
          <>
            <h1 className={styles.title}>{signingUp ? t('Create an account') : t('Sign in')}</h1>
            <p className={styles.lead}>
              {signingUp
                ? t('Your account will be usable once an owner of the server activates it.')
                : t('Sign in to watch your libraries.')}
            </p>

            <form className={styles.form} onSubmit={submit} noValidate>
              {signingUp ? (
                <>
                  <TextField
                    label={t('Username')}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    hint={t('3 to 32 letters, digits, dots, dashes or underscores.')}
                    error={error?.field === 'username' ? error.text : null}
                  />
                  <TextField
                    label={t('E-mail address (optional)')}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    hint={t('You can sign in with it too.')}
                    error={error?.field === 'email' ? error.text : null}
                  />
                </>
              ) : (
                <TextField
                  label={t('Username or e-mail address')}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  autoFocus
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  error={error?.field === 'login' ? error.text : null}
                />
              )}
              <PasswordField
                label={t('Password')}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={signingUp ? t('8 characters at least.') : null}
                error={error?.field === 'password' ? error.text : null}
              />
              {signingUp && (
                <PasswordField
                  label={t('Confirm the password')}
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  error={error?.field === 'confirmation' ? error.text : null}
                />
              )}
              {error && !error.field && (
                <p className={styles.error} role="alert" data-code={error.code}>
                  <Icon name={error.code === 'INACTIVE' ? 'lock' : 'info'} size={18} />
                  {error.text}
                </p>
              )}
              <Button type="submit" variant="accent" loading={busy} className={styles.submit}>
                {signingUp ? t('Create the account') : t('Sign in')}
              </Button>
            </form>

            <p className={styles.switch}>
              {signingUp ? t('Already have an account?') : t('No account yet?')}{' '}
              <Link to={otherLink}>{signingUp ? t('Sign in') : t('Create an account')}</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
