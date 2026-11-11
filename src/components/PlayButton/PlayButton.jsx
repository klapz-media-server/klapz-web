import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { playPath } from '../../utils/routes';
import ActionButton from '../ActionButton/ActionButton';

/** "Play" / "Resume": opens the item in the player page, at `startMs` when resuming. */
export default function PlayButton({ item, resume = false, startMs = 0, label }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <ActionButton
      variant="primary"
      icon="play"
      label={label ?? (resume ? t('Resume') : t('Play'))}
      onClick={() => navigate(playPath(item, resume ? startMs : 0))}
    />
  );
}
