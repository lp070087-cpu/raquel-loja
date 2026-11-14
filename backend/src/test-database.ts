export function assertIsolatedTestDatabase(testUrl: string, primaryUrl?: string) {
    const identify = (raw: string) => {
        const u = new URL(raw);
        return `${u.hostname.replace(/-pooler(?=\.)/, '')}:${u.port || 5432}${u.pathname}`;
    };
    if (!/^postgres(ql)?:/.test(testUrl))
        throw new Error('TEST_DATABASE_URL must use PostgreSQL.');
    if (primaryUrl && identify(testUrl) === identify(primaryUrl))
        throw new Error('Test database must be isolated; pooled/direct URLs for the same database are not isolated.');
}

export function assertTestingBranch(testUrl: string, primaryUrl: string | undefined, branch: string | undefined) {
    if (branch !== 'testing')
        throw new Error('Database tests require the explicitly confirmed Neon branch testing. Production is forbidden.');
    if (!primaryUrl)
        throw new Error('DATABASE_URL is required to verify test database isolation.');
    assertIsolatedTestDatabase(testUrl, primaryUrl);
}
