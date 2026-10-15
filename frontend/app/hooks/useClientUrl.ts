'use client';

import { useEffect, useState } from 'react';

/**
 * A URL taken from `window.location`, available only after mount.
 *
 * The server has no `location`, so reading it during render would produce
 * markup that disagrees with the client's. Returning an empty string on the
 * first paint and filling it in after hydration is what keeps the two in step
 * — the share buttons that consume it stay inert until then.
 *
 * @param path Appended to the page's origin, e.g. `/explore/edition/3`.
 *             Omit it to get the current page's full href.
 */
export function useClientUrl(path?: string): string {
    const [url, setUrl] = useState('');

    useEffect(() => {
        // Writing state straight from an effect is the point here: the value
        // lives in the browser, not in props, so it cannot be derived.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUrl(path === undefined ? window.location.href : `${window.location.origin}${path}`);
    }, [path]);

    return url;
}
