import { describe, it, expect } from 'vitest';
import { assertTestingBranch } from '../src/test-database.js';
const primary = 'postgresql://example:example@ep-development.region.neon.tech/database?sslmode=require';
const isolated = 'postgresql://example:example@ep-testing.region.neon.tech/database?sslmode=require';
describe('Neon branch safety without network or database writes', () => {
  it('refuses production and unconfirmed branches', () => {
    for (const branch of ['production', 'development', '', undefined]) expect(() => assertTestingBranch(isolated, primary, branch)).toThrow();
  });
  it('refuses pooled/direct aliases and different credentials for the same target', () => {
    expect(() => assertTestingBranch('postgresql://other:different@ep-development-pooler.region.neon.tech/database?sslmode=verify-full', primary, 'testing')).toThrow();
  });
  it('requires a primary reference and accepts only explicitly isolated testing', () => {
    expect(() => assertTestingBranch(isolated, undefined, 'testing')).toThrow();
    expect(() => assertTestingBranch(isolated, primary, 'testing')).not.toThrow();
  });
});
