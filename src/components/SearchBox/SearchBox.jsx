import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { searchPath } from '../../utils/routes';
import Icon from '../Icon/Icon';
import styles from './SearchBox.module.css';

/** Pill search field that drives the `/search?q=` page as you type. */
export default function SearchBox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onSearchPage = location.pathname === '/search';
  const urlQuery = onSearchPage ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  // Keep the field in sync when the URL changes (back/forward).
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    if (!focused) setValue(urlQuery);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(searchPath(trimmed), { replace: onSearchPage });
  };

  const onChange = (e) => {
    const next = e.target.value;
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), 450);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    clearTimeout(timer.current);
    go(value);
  };

  const expanded = focused || value.length > 0;

  return (
    <form className={styles.form} data-expanded={expanded || undefined} onSubmit={onSubmit} role="search">
      <Icon name="search" size={18} className={styles.icon} />
      <input
        ref={inputRef}
        className={styles.input}
        type="search"
        placeholder={t('Search')}
        aria-label={t('Search movies and shows')}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('');
            inputRef.current?.blur();
          }
        }}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label={t('Clear')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </form>
  );
}
