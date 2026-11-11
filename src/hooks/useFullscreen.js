import { useCallback, useEffect, useState } from 'react';

export function useFullscreen(ref) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen?.().catch(() => {});
  }, [ref]);

  return [active, toggle];
}
