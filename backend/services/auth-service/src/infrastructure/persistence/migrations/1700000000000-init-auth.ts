import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Identity schema (spec §3). `role` / `purpose` use CHECK constraints rather than native
 * Postgres enums — adding a value later is a one-line forward migration instead of an
 * `ALTER TYPE` dance. Every table carries `tenant_id` (ADR-007); RLS is added in the next migration.
 */
export class InitAuth1700000000000 implements MigrationInterface {
  name = 'InitAuth1700000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE accounts (
        id                uuid        PRIMARY KEY,
        tenant_id         uuid        NOT NULL,
        email             text        NOT NULL,
        password_hash     text        NOT NULL,
        role              text        NOT NULL DEFAULT 'customer'
                          CHECK (role IN ('customer','staff','admin','tenant_admin','platform_admin')),
        locked            boolean     NOT NULL DEFAULT false,
        email_verified_at timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now()
      )
    `);
    // ADR-007: unique per (tenant_id, email) — one email may register once per tenant.
    // `email` is already normalised to lowercase by the Email value object before it reaches here.
    await q.query(
      `CREATE UNIQUE INDEX accounts_tenant_id_email_key ON accounts (tenant_id, email)`,
    );

    await q.query(`
      CREATE TABLE otp_codes (
        id           uuid        PRIMARY KEY,
        tenant_id    uuid        NOT NULL,
        account_id   uuid        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        code_hash    text        NOT NULL,
        purpose      text        NOT NULL
                     CHECK (purpose IN ('verify_email','reset_password')),
        expires_at   timestamptz NOT NULL,
        consumed_at  timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX otp_codes_account_id_idx ON otp_codes (account_id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS otp_codes`);
    await q.query(`DROP TABLE IF EXISTS accounts`);
  }
}
