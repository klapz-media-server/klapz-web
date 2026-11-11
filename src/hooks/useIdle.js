import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * True after `delay` ms without pointer or keyboard activity on `ref`'s
 * element. `enabled = false` keeps it awake (paused video, open menu…).
 */
export function useIdle(ref, { delay = 3000, enabled = true } = {}) {
  const [idle, setIdle] = useState(false);
  const timer = useRef(null);

  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(timer.current);
    if (enabled) timer.current = setTimeout(() => setIdle(true), delay);
  }, [delay, enabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => el.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => el.removeEventListener(e, wake));
    };
  }, [ref, wake]);

  return [idle && enabled, wake];
}
