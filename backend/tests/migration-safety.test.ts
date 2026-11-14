import { it, expect } from 'vitest';
import { assertAdditiveMigration } from '../src/migration-safety.js';
it('permits initial schema creation and foreign-key actions without deleting data',()=>{
  expect(()=>assertAdditiveMigration('CREATE TABLE "Example" ("id" TEXT); ALTER TABLE "Example" ADD CONSTRAINT "fk" FOREIGN KEY ("id") REFERENCES "Other"("id") ON DELETE CASCADE ON UPDATE CASCADE;')).not.toThrow();
});
it('blocks destructive commands and non-additive schema changes',()=>{
  for(const sql of ['DROP TABLE "User";', 'DELETE FROM "User";', 'TRUNCATE "User";', 'UPDATE "Product" SET stock=0;', 'ALTER TABLE "User" DROP COLUMN "name";', 'ALTER TABLE "User" RENAME TO "Other";', 'CREATE FUNCTION unsafe() RETURNS void LANGUAGE sql AS $$SELECT 1$$;']) expect(()=>assertAdditiveMigration(sql)).toThrow();
});
