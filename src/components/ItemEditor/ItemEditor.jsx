import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { UPDATE_EPISODE, UPDATE_MOVIE, UPDATE_SHOW } from '../../graphql/mutations';
import { ITEM_FOR_EDIT } from '../../graphql/queries';
import Button from '../Button/Button';
import Dialog from '../Dialog/Dialog';
import Icon from '../Icon/Icon';
import Spinner from '../Spinner/Spinner';
import { dateTimeOfDay, dayOf } from '../../utils/format';
import styles from './ItemEditor.module.css';

/** Every editable field: its lock (`ItemField`), its kind of input. */
const FIELDS = {
  title: { lock: 'TITLE', kind: 'text' },
  titleSort: { lock: 'TITLE_SORT', kind: 'text' },
  originalTitle: { lock: 'ORIGINAL_TITLE', kind: 'text' },
  tagline: { lock: 'TAGLINE', kind: 'text' },
  summary: { lock: 'SUMMARY', kind: 'textarea' },
  studio: { lock: 'STUDIO', kind: 'text' },
  contentRating: { lock: 'CONTENT_RATING', kind: 'text' },
  releasedOn: { lock: 'RELEASED_ON', kind: 'date' },
  year: { lock: 'YEAR', kind: 'year' },
  rating: { lock: 'RATING', kind: 'rating' },
  audienceRating: { lock: 'AUDIENCE_RATING', kind: 'rating' },
};

/** What each type holds, as the server's inputs admit, in the order of the form. */
const LAYOUT = {
  Movie: ['title', 'titleSort', 'originalTitle', 'tagline', 'summary', 'studio', 'contentRating', 'releasedOn', 'year', 'rating', 'audienceRating'],
  Show: ['title', 'titleSort', 'originalTitle', 'tagline', 'summary', 'studio', 'contentRating', 'releasedOn', 'year', 'audienceRating'],
  Episode: ['title', 'titleSort', 'originalTitle', 'summary', 'contentRating', 'releasedOn', 'year', 'audienceRating'],
};

/** Fields that share a row on a wide screen. */
const PAIRS = new Set(['contentRating', 'studio', 'releasedOn', 'year', 'rating', 'audienceRating']);

const MUTATIONS = {
  Movie: { mutation: UPDATE_MOVIE, payload: 'updateMovie' },
  Show: { mutation: UPDATE_SHOW, payload: 'updateShow' },
  Episode: { mutation: UPDATE_EPISODE, payload: 'updateEpisode' },
};

const asText = (value) => (value === null || value === undefined ? '' : String(value));

/** A field's text in its input: a date is a `DateTime` at midnight UTC, edited as its day. */
const fieldText = (kind, value) => (kind === 'date' ? dayOf(value) : asText(value));

/** The typed value of a field's text, or `{ invalid }`. An empty text clears the field. */
function parse(kind, text) {
  const value = text.trim();
  if (!value) return { value: null };
  if (kind === 'year') {
    const year = Number(value);
    return Number.isInteger(year) && year >= 1 && year <= 9999 ? { value: year } : { invalid: true };
  }
  if (kind === 'rating') {
    const rating = Number(value.replace(',', '.'));
    return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? { value: rating } : { invalid: true };
  }
  if (kind === 'date') {
    const dateTime = dateTimeOfDay(value);
    return dateTime ? { value: dateTime } : { invalid: true };
  }
  // Texts keep their inner line breaks; only the ends are trimmed.
  return { value };
}

function Field({ name, kind, label, hint, value, locked, error, onChange, onToggleLock, lockLabel, autoFocus }) {
  const id = useId();
  const common = {
    id,
    name,
    value,
    onChange: (e) => onChange(e.target.value),
    className: styles.input,
    autoFocus,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? `${id}-hint` : undefined,
  };
  return (
    <div className={styles.field} data-wide={PAIRS.has(name) ? undefined : true}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <button
          type="button"
          className={styles.lock}
          data-locked={locked || undefined}
          aria-pressed={locked}
          title={lockLabel}
          aria-label={lockLabel}
          onClick={onToggleLock}
        >
          <Icon name={locked ? 'lock' : 'unlock'} size={15} />
        </button>
      </div>
      {kind === 'textarea' ? (
        <textarea {...common} rows={6} />
      ) : (
        <input
          {...common}
          type={kind === 'date' ? 'date' : 'text'}
          inputMode={kind === 'year' ? 'numeric' : kind === 'rating' ? 'decimal' : undefined}
          maxLength={kind === 'year' ? 4 : undefined}
        />
      )}
      {(error || hint) && (
        <p id={`${id}-hint`} className={styles.hint} data-error={error ? true : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

function EditorForm({ item, formId, onDone, onBusy }) {
  const { t } = useTranslation();
  const type = item.__typename;
  const names = LAYOUT[type];
  const initial = useMemo(() => Object.fromEntries(names.map((n) => [n, fieldText(FIELDS[n].kind, item[n])])), [item, names]);
  const initiallyLocked = useMemo(() => new Set(item.lockedFields), [item]);
  const [values, setValues] = useState(initial);
  // The locks the editor set by hand; any other follows Plex: editing a field locks it.
  const [manualLocks, setManualLocks] = useState({});
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const { mutation, payload } = MUTATIONS[type];
  const [update] = useMutation(mutation);

  const changed = (n) => values[n] !== initial[n];
  const isLocked = (n) => manualLocks[n] ?? (initiallyLocked.has(FIELDS[n].lock) || changed(n));

  const labels = {
    title: t('Title'),
    titleSort: t('Sort title'),
    originalTitle: t('Original title'),
    tagline: t('Tagline'),
    summary: t('Summary'),
    studio: type === 'Show' ? t('Studio or network') : t('Studio'),
    contentRating: t('Content rating'),
    releasedOn: type === 'Episode' ? t('Aired on') : type === 'Show' ? t('First aired on') : t('Release date'),
    year: t('Year'),
    rating: t('Critics rating'),
    audienceRating: t('Audience rating'),
  };
  const hints = {
    titleSort: !isLocked('titleSort') && changed('title') && !changed('titleSort') ? t('Follows the new title, less its leading article.') : null,
    contentRating: t('As the server stores it, such as fr/12 or PG-13.'),
    releasedOn: !changed('year') ? t('Also sets the year.') : null,
    rating: t('From 0 to 10.'),
    audienceRating: t('From 0 to 10.'),
  };
  const invalid = {
    year: t('A year from 1 to 9999.'),
    rating: t('A rating from 0 to 10.'),
    date: t('A date such as 2024-05-31.'),
  };

  const submit = async (e) => {
    e.preventDefault();
    setFailure(null);
    const input = { id: item.id };
    const found = {};
    for (const n of names) {
      if (!changed(n)) continue;
      const parsed = parse(FIELDS[n].kind, values[n]);
      if (parsed.invalid) found[n] = invalid[FIELDS[n].kind];
      else input[n] = parsed.value;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    const lock = names.filter((n) => isLocked(n) && !initiallyLocked.has(FIELDS[n].lock)).map((n) => FIELDS[n].lock);
    const unlock = names.filter((n) => !isLocked(n) && initiallyLocked.has(FIELDS[n].lock)).map((n) => FIELDS[n].lock);
    if (lock.length) input.lock = lock;
    if (unlock.length) input.unlock = unlock;
    if (Object.keys(input).length === 1) {
      onDone(false);
      return;
    }
    onBusy(true);
    try {
      const { data } = await update({ variables: { input } });
      const userErrors = data?.[payload]?.userErrors ?? [];
      if (userErrors.length) {
        const byField = {};
        for (const error of userErrors) {
          const n = error.field?.at(-1);
          if (error.code === 'INVALID_VALUE' && names.includes(n)) byField[n] = t('The server does not accept this value.');
          else if (error.code === 'ITEM_NOT_FOUND') setFailure(t('This item no longer exists, or you may not edit it.'));
          else setFailure(t('The server refused the changes.'));
        }
        setErrors(byField);
        return;
      }
      onDone(true);
    } catch (err) {
      setFailure(/not found/i.test(err.message) ? t('This item no longer exists, or you may not edit it.') : err.message);
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
      <div className={styles.grid}>
        {names.map((n, i) => (
          <Field
            key={n}
            autoFocus={i === 0}
            name={n}
            kind={FIELDS[n].kind}
            label={labels[n]}
            hint={hints[n]}
            error={errors[n]}
            value={values[n]}
            locked={isLocked(n)}
            lockLabel={isLocked(n) ? t('Locked: a metadata refresh leaves it as it is. Unlock') : t('Lock against a metadata refresh')}
            onChange={(value) => setValues((v) => ({ ...v, [n]: value }))}
            onToggleLock={() => setManualLocks((m) => ({ ...m, [n]: !isLocked(n) }))}
          />
        ))}
      </div>
      <p className={styles.note}>
        <Icon name="lock" size={13} /> {t('A locked field keeps its value when the metadata is refreshed. Editing a field locks it.')}
      </p>
    </form>
  );
}

/**
 * Edits a film, a series or an episode: its texts, dates and ratings, and which fields
 * a metadata refresh must leave alone. `item` needs `id` and `__typename`.
 */
export default function ItemEditor({ item, open, onClose }) {
  const { t } = useTranslation();
  const formId = useId();
  const [busy, setBusy] = useState(false);
  const { data, loading, error } = useQuery(ITEM_FOR_EDIT, {
    variables: { id: item?.id },
    skip: !open || !item,
    fetchPolicy: 'network-only',
  });
  const editable = data?.node && LAYOUT[data.node.__typename] ? data.node : null;
  const titles = { Movie: t('Edit the movie'), Show: t('Edit the series'), Episode: t('Edit the episode') };

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      size="wide"
      title={titles[item?.__typename] ?? t('Edit')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button type="submit" form={formId} variant="accent" icon="check" loading={busy} disabled={!editable}>
            {t('Save')}
          </Button>
        </>
      }
    >
      {loading && !editable ? (
        <div className={styles.loading}>
          <Spinner />
        </div>
      ) : error || !editable ? (
        <p className={styles.failure} role="alert">
          {error && !/not found/i.test(error.message) ? error.message : t('This item no longer exists, or you may not edit it.')}
        </p>
      ) : (
        <EditorForm key={editable.id} item={editable} formId={formId} onBusy={setBusy} onDone={() => onClose()} />
      )}
    </Dialog>
  );
}
