import Icon from '../Icon/Icon';
import styles from './PlayerFeedback.module.css';

/**
 * The bubble flashing in the middle of the video after a keyboard or
 * click action (play, pause, ±10 s, volume…). `feedback.id` changes on
 * every action so the animation replays.
 */
export default function PlayerFeedback({ feedback }) {
  if (!feedback) return null;
  return (
    <div key={feedback.id} className={styles.bubble} data-side={feedback.side ?? 'center'} aria-hidden="true">
      {feedback.icon && <Icon name={feedback.icon} size={30} />}
      {feedback.text && <span className={styles.text}>{feedback.text}</span>}
    </div>
  );
}
