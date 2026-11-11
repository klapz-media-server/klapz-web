import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { queryString, readParam } from '../utils/routes';

/**
 * Once an item is loaded, rewrites the address to its canonical path —
 * an old link without slug, or a slug that no longer matches the title —
 * keeping the query and the hash, without a new history entry.
 */
export function useCanonicalPath(path, { dropQuery = [] } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dropped = dropQuery.join(',');

  useEffect(() => {
    if (!path) return;
    const params = new URLSearchParams(location.search);
    const stale = dropped.split(',').filter((key) => key && params.has(key));
    if (readParam(location.pathname) === readParam(path) && stale.length === 0) return;
    stale.forEach((key) => params.delete(key));
    const search = queryString(Object.fromEntries(params));
    navigate(`${path}${search}${location.hash}`, { replace: true, state: { keepScroll: true } });
  }, [path, dropped, location.pathname, location.search, location.hash, navigate]);
}
