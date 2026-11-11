import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActionButton from '../ActionButton/ActionButton';

/** Copies the page URL (or uses the native share sheet when available). */
export default function ShareButton({ title }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia('(hover: none)').matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* dismissed or no clipboard permission */
    }
  };

  return <ActionButton icon={copied ? 'check' : 'share'} label={copied ? t('Link copied') : t('Share')} onClick={share} />;
}
