// Bound connection/pool waiting without logging or changing credentials.
export function boundedDatabaseUrl(raw: string) {
    const url = new URL(raw);
    if (!url.searchParams.has('connect_timeout'))
        url.searchParams.set('connect_timeout', '10');
    if (!url.searchParams.has('pool_timeout'))
        url.searchParams.set('pool_timeout', '10');
    if (!url.searchParams.has('connection_limit'))
        url.searchParams.set('connection_limit', '5');
    return url.href;
}
