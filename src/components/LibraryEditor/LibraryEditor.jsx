import { useId, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { CREATE_LIBRARY, UPDATE_LIBRARY } from '../../graphql/mutations';
import { LIBRARY_SETTINGS } from '../../graphql/queries';
import { useViewer } from '../../hooks/useViewer';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import FolderPicker from '../FolderPicker/FolderPicker';
import Icon from '../Icon/Icon';
import SegmentedControl from '../SegmentedControl/SegmentedControl';
import Spinner from '../Spinner/Spinner';
import TextField from '../TextField/TextField';
import styles from './LibraryEditor.module.css';

/** The lists that show libraries, refetched when one is created: only those on screen run. */
export const LIBRARY_LISTS = ['Libraries', 'AdminUsers', 'Viewer'];

/** As the server checks it: a language of 2 or 3 letters, then subtags of 2 to 8. */
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const MAX_ROOTS = 32;
const LANGUAGES = ['fr-FR', 'fr-CA', 'en-US', 'en-GB', 'de-DE', 'es-ES', 'es-419', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'];

/** The language a new library starts with: the interface's, as a full tag when it is a known one. */
function defaultLanguage(interfaceLanguage) {
  const base = (interfaceLanguage ?? 'en').split('-')[0];
  return LANGUAGES.find((tag) => tag.startsWith(`${base}-`)) ?? 'en-US';
}

function useErrorText() {
  const { t } = useTranslation();
  return (code) =>
    ({
      LIBRARY_NOT_FOUND: t('This library no longer exists, or you may not change it.'),
      INVALID_TITLE: t('A title of 1 to 255 characters.'),
      INVALID_LANGUAGE: t('A language tag, such as fr-FR.'),
      UNSUPPORTED_KIND: t('This server holds movies and shows only.'),
      NO_ROOT: t('Add at least one folder.'),
      TOO_MANY_ROOTS: t('A library scans at most 32 folders.'),
      ROOT_NOT_FOUND: t('The server finds no folder at this path. Give an absolute path, as the server sees it.'),
      OVERLAPPING_ROOTS: t('This folder lies inside another one of the list, or holds one.'),
      OWNER_ONLY: t('Only an owner of the server chooses the folders.'),
      SCANNING: t('The library is being scanned. Try again once the scan is over.'),
    })[code] ?? t('The server refused the changes.');
}

/**
 * One folder of the list, as a single field: browsing the server (`onBrowse`, for an owner) on
 * its left, the path in the middle, and removing it (`onRemove`, null for the last one) on its right.
 */
function RootRow({ number, path, error, onChange, onBrowse, onRemove }) {
  const { t } = useTranslation();
  const errorId = useId();
  return (
    <div className={styles.rootRow}>
      <div className={styles.rootBox} data-invalid={error ? true : undefined}>
        {onBrowse ? (
          <button
            type="button"
            className={styles.rootBrowse}
            aria-label={t('Browse the folders of the server')}
            title={t('Browse the folders of the server')}
            onClick={onBrowse}
          >
            <Icon name="folder" size={16} />
          </button>
        ) : (
          <span className={styles.rootIcon}>
            <Icon name="folder" size={16} />
          </span>
        )}
        <input
          className={styles.rootInput}
          aria-label={t('Folder {{number}}', { number })}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={t('/media/movies or D:\\Movies')}
          autoCapitalize="none"
          spellCheck={false}
          value={path}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={styles.rootRemove}
          aria-label={t('Remove this folder')}
          title={t('Remove this folder')}
          disabled={!onRemove}
          onClick={onRemove ?? undefined}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The folders a library scans, typed or, for an owner, picked on the server (`canBrowse`). */
function RootList({ roots, errors, onChange, readOnly, canBrowse }) {
  const { t } = useTranslation();
  const [browsing, setBrowsing] = useState(null);
  if (readOnly) {
    return (
      <ul className={styles.readOnlyRoots}>
        {roots.map((path) => (
          <li key={path}>
            <Icon name="folder" size={15} />
            <span>{path}</span>
          </li>
        ))}
      </ul>
    );
  }
  const set = (index, value) => onChange(roots.map((path, i) => (i === index ? value : path)));
  return (
    <div className={styles.roots}>
      {roots.map((path, index) => (
        // Rows are edited in place and never reordered, so their position is their identity.
        <RootRow
          key={index}
          number={index + 1}
          path={path}
          error={errors[index]}
          onChange={(value) => set(index, value)}
          onBrowse={canBrowse ? () => setBrowsing(index) : null}
          onRemove={roots.length > 1 ? () => onChange(roots.filter((_, i) => i !== index)) : null}
        />
      ))}
      <Button size="sm" icon="plus" onClick={() => onChange([...roots, ''])} disabled={roots.length >= MAX_ROOTS}>
        {t('Add a folder')}
      </Button>
      <FolderPicker
        open={browsing !== null}
        start={browsing !== null ? roots[browsing] : null}
        onClose={() => setBrowsing(null)}
        onPick={(path) => set(browsing, path)}
      />
    </div>
  );
}

function EditorForm({ library, formId, onBusy, onDone }) {
  const { t, i18n } = useTranslation();
  const { owner } = useViewer();
  const errorText = useErrorText();
  const creating = !library;
  const initial = {
    title: library?.title ?? '',
    kind: library?.kind ?? 'MOVIE',
    language: library?.language ?? defaultLanguage(i18n.language),
    roots: library ? library.roots.map((root) => root.path) : [''],
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({ roots: {} });
  const [failure, setFailure] = useState(null);
  const [create] = useMutation(CREATE_LIBRARY, { refetchQueries: LIBRARY_LISTS });
  const [update] = useMutation(UPDATE_LIBRARY);
  const languagesId = useId();

  const set = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => (field === 'roots' ? { ...e, roots: {} } : { ...e, [field]: null }));
  };
  const roots = values.roots.map((path) => path.trim()).filter(Boolean);
  const rootsChanged = roots.join('\n') !== initial.roots.join('\n');

  /** Shows each refusal beside its field; a root's error names its position among the filled ones. */
  const show = (userErrors) => {
    const found = { roots: {} };
    const filled = values.roots.flatMap((path, index) => (path.trim() ? [index] : []));
    for (const error of userErrors) {
      const [, field, position] = error.field ?? [];
      if (field === 'roots' && position !== undefined) found.roots[filled[Number(position)] ?? 0] = errorText(error.code);
      else if (field === 'roots' && error.code !== 'OWNER_ONLY' && error.code !== 'SCANNING') found.rootsList = errorText(error.code);
      else if (['title', 'language'].includes(field)) found[field] = errorText(error.code);
      else setFailure(errorText(error.code));
    }
    setErrors(found);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFailure(null);
    const title = values.title.trim();
    const language = values.language.trim();
    const found = { roots: {} };
    if (!title) found.title = errorText('INVALID_TITLE');
    if (!LANGUAGE_PATTERN.test(language)) found.language = errorText('INVALID_LANGUAGE');
    if ((creating || owner) && roots.length === 0) found.rootsList = errorText('NO_ROOT');
    if (found.title || found.language || found.rootsList) {
      setErrors(found);
      return;
    }
    let input;
    if (creating) {
      input = { title, kind: values.kind, language, roots };
    } else {
      input = { id: library.id };
      if (title !== initial.title) input.title = title;
      if (language !== initial.language) input.language = language;
      if (owner && rootsChanged) input.roots = roots;
      if (Object.keys(input).length === 1) {
        onDone(null);
        return;
      }
    }
    onBusy(true);
    try {
      const { data } = creating ? await create({ variables: { input } }) : await update({ variables: { input } });
      const payload = creating ? data?.createLibrary : data?.updateLibrary;
      if (payload?.userErrors?.length) {
        show(payload.userErrors);
        return;
      }
      onDone(payload.library, { scanned: creating || !!input.roots });
    } catch (err) {
      setFailure(/not found/i.test(err.message) ? errorText('LIBRARY_NOT_FOUND') : err.message);
    } finally {
      onBusy(false);
    }
  };

  return (
    <form id={formId} className={styles.form} onSubmit={submit} noValidate>
      {failure && (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}
      <TextField
        label={t('Name')}
        autoFocus
        maxLength={255}
        value={values.title}
        onChange={(e) => set('title')(e.target.value)}
        error={errors.title}
      />
      <div className={styles.row}>
        <div className={styles.field}>
          <span className={styles.label}>{t('Type')}</span>
          {creating ? (
            <SegmentedControl
              label={t('Type')}
              value={values.kind}
              onChange={set('kind')}
              options={[
                { value: 'MOVIE', label: t('Movies') },
                { value: 'SHOW', label: t('Shows') },
              ]}
            />
          ) : (
            <span className={styles.kind}>
              <Icon name={values.kind === 'SHOW' ? 'tv' : 'movie'} size={16} />
              {values.kind === 'SHOW' ? t('Shows') : t('Movies')}
            </span>
          )}
        </div>
        <TextField
          className={styles.field}
          label={t('Metadata language')}
          list={languagesId}
          autoCapitalize="none"
          spellCheck={false}
          value={values.language}
          onChange={(e) => set('language')(e.target.value)}
          error={errors.language}
          hint={errors.language ? null : t('A language tag, such as fr-FR.')}
        />
        <datalist id={languagesId}>
          {LANGUAGES.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>{t('Folders')}</span>
        <RootList roots={values.roots} errors={errors.roots} onChange={set('roots')} readOnly={!creating && !owner} canBrowse={owner} />
        {errors.rootsList && (
          <p className={styles.error} role="alert">
            {errors.rootsList}
          </p>
        )}
        <p className={styles.hint}>
          {!creating && !owner
            ? t('Only an owner of the server chooses the folders.')
            : t('Absolute paths on the server, typed or browsed. The library is scanned once saved; files of a folder removed leave the library.')}
        </p>
      </div>
    </form>
  );
}

/**
 * Creates a library (`library` null) or changes one: its name, its language, and for the
 * server's owners the folders it scans. `onSaved(library, { scanned })` follows a change the
 * server accepted.
 */
export default function LibraryEditor({ library, open, onClose, onSaved }) {
  const { t } = useTranslation();
  const formId = useId();
  const [busy, setBusy] = useState(false);
  const { data, loading, error } = useQuery(LIBRARY_SETTINGS, {
    variables: { id: library?.id },
    skip: !open || !library,
    fetchPolicy: 'network-only',
  });
  const editing = library ? data?.node : null;
  const ready = !library || !!editing;

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      size="wide"
      title={library ? t('Edit the library') : t('New library')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button type="submit" form={formId} variant="accent" icon="check" loading={busy} disabled={!ready}>
            {library ? t('Save') : t('Create')}
          </Button>
        </>
      }
    >
      {library && loading && !editing ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : library && (error || !editing) ? (
        <p className={styles.failure} role="alert">
          {error && !/not found/i.test(error.message) ? error.message : t('This library no longer exists, or you may not change it.')}
        </p>
      ) : (
        <EditorForm
          key={editing?.id ?? 'new'}
          library={editing}
          formId={formId}
          onBusy={setBusy}
          onDone={(saved, outcome) => {
            if (saved) onSaved?.(saved, outcome);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}
