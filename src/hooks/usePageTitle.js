import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const APP = 'Open Web';

/** `title` is already translated by the caller. */
export function usePageTitle(title) {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP;
  }, [title, i18n.resolvedLanguage]);
}
