import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Row-Level Security for every tenant-scoped table.
 *
 *  - ENABLE + FORCE: FORCE is required because the table owner (`vici_app`) would otherwise
 *    bypass its own policies.
 *  - Policy: `current_setting('app.tenant_id', true)` is NULL when unset (missing_ok) →
 *    `tenant_id = NULL` → 0 rows. Fail-closed: forgetting `SET LOCAL` leaks nothing.
 */
export class RlsPolicies1700000000001 implements MigrationInterface {
  name = 'RlsPolicies1700000000001';

  private readonly tables = ['accounts', 'otp_codes'];

  async up(q: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await q.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await q.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await q.query(`
        CREATE POLICY tenant_isolation ON ${table}
          USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
          WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
      `);
    }
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await q.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
      await q.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await q.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
  }
}
