export function assertAdditiveMigration(source: string) {
  const sql = source.replace(/--[^\n]*/g, '');
  const statements = sql.split(';').map(s=>s.trim()).filter(Boolean);
  if (statements.some(s=>!(/^(CREATE\s+(TYPE|TABLE|(?:UNIQUE\s+)?INDEX)\b|ALTER\s+TABLE\s+"\w+"\s+ADD\s+CONSTRAINT\b)/i.test(s)))) {
    throw new Error('NON_ADDITIVE_MIGRATION_BLOCKED');
  }
}
