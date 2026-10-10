/**
 * Three test projects, matching the pyramid in coding-conventions.md §6:
 *   unit         — domain + application, zero I/O, fast, run on every save
 *   integration  — adapters against a real Postgres (Testcontainers), needs Docker
 *   e2e          — the Nest app end to end over HTTP (supertest) + real Postgres
 *
 * @type {import('jest').Config}
 */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  setupFiles: ['reflect-metadata'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

module.exports = {
  // Testcontainers (integration/e2e) needs a generous per-test budget; unit tests finish well under it.
  testTimeout: 180000,
  projects: [
    { ...base, displayName: 'unit', testMatch: ['<rootDir>/test/unit/**/*.spec.ts'] },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
    },
    {
      ...base,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
    },
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};
