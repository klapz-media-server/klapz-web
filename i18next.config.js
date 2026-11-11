import { defineConfig } from 'i18next-cli';

/**
 * `npm run i18n:extract` scans every t() / <Trans> in src and updates
 * src/locales/<lng>/translation.json.
 *
 * - Keys are the English text itself, so the English file is generated
 *   from the code (key = value) and never edited by hand, except plural
 *   forms (`_other`), which you fill in once.
 * - Keys missing in French are left out of fr.json (i18next falls back to
 *   English); `npm run i18n:status` lists them.
 * - Keys no longer used in the code are removed.
 */
export default defineConfig({
  locales: ['en', 'fr'],
  extract: {
    input: ['src/**/*.{js,jsx}'],
    ignore: ['src/locales/**'],
    output: 'src/locales/{{language}}/{{namespace}}.json',
    primaryLanguage: 'en',
    defaultNS: 'translation',
    keySeparator: false,
    nsSeparator: false,
    functions: ['t', '*.t'],
    transComponents: ['Trans'],
    omitMissingKeys: ['fr'],
    removeUnusedKeys: true,
    extractFromComments: false,
    sort: true,
    indentation: 2,
  },
});
