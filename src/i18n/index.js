import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';
import fr from '../locales/fr/translation.json';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

/**
 * Keys are the English source strings: `t('Add to watchlist')`.
 * Flat keys (no `.` / `:` separators) so any sentence can be a key.
 * `npm run i18n:extract` collects every `t()` / `<Trans>` into src/locales.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'open-web.language',
      caches: ['localStorage'],
    },
  });

const syncHtmlLang = (lng) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.resolvedLanguage ?? 'en');
i18n.on('languageChanged', syncHtmlLang);

/** BCP 47 tag for Intl formatters, following the UI language. */
export function locale() {
  return i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-US';
}

export default i18n;
