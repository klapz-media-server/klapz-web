import { useCallback, useEffect, useState } from 'react';

/**
 * `[ref, inView]`, where `ref` is a callback ref (so the observer follows
 * the element even when it mounts later). With `once`, stays true after the
 * first intersection — used to defer queries of rows below the fold.
 */
export function useInView({ rootMargin = '400px', once = true } = {}) {
  const [node, setNode] = useState(null);
  const [inView, setInView] = useState(false);
  const ref = useCallback((el) => setNode(el), []);

  useEffect(() => {
    if (!node) return undefined;
    if (once && inView) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, rootMargin, once, inView]);

  return [ref, inView];
}
