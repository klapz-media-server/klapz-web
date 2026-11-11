import styles from './SegmentedControl.module.css';

/**
 * A row of mutually exclusive choices, as radio buttons.
 * `options` is `[{ value, label, tone? }]`; `tone` colors the selected one.
 */
export default function SegmentedControl({ options, value, onChange, label, disabled = false, size = 'md' }) {
  return (
    <div className={styles.control} role="radiogroup" aria-label={label} data-size={size}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value ?? 'none'}
            type="button"
            role="radio"
            aria-checked={selected}
            className={styles.option}
            data-tone={option.tone}
            disabled={disabled}
            onClick={() => !selected && onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
