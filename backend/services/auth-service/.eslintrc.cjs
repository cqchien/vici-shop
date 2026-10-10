/**
 * ADR-013: every identifier is a UUID **v7**. `node:crypto` can only produce v4 (and silently
 * ignores a `{ version: 7 }` option), and `uuid`'s older generators are v1/v3/v4/v5/v6 — so ban
 * the imports outright. `v7` and the parsing/validation helpers stay available.
 */
const UUID_V4_SOURCES = [
  {
    name: 'node:crypto',
    importNames: ['randomUUID'],
    message:
      'randomUUID() is UUID v4 and cannot produce v7 (ADR-013). Use uuidV7() from src/shared/uuid.ts.',
  },
  {
    name: 'crypto',
    importNames: ['randomUUID'],
    message:
      'randomUUID() is UUID v4 and cannot produce v7 (ADR-013). Use uuidV7() from src/shared/uuid.ts.',
  },
  {
    name: 'uuid',
    importNames: ['v1', 'v3', 'v4', 'v5', 'v6', 'NIL', 'MAX'],
    message:
      'Only UUID v7 is minted here (ADR-013), and the nil/max UUIDs are never valid identities. Use uuidV7() from src/shared/uuid.ts.',
  },
];

/**
 * ADR-013: `Date` is the instant type of domain/ and application/, but every *calculation* and
 * *comparison* goes through `date-fns` — `addMinutes(now, ttl)`, `isBefore(a, b)`, `isEqual(a, b)`
 * — never millisecond arithmetic. These three selectors are the ways that rule gets broken
 * quietly, so they are a lint error rather than something a reviewer has to spot.
 */
const TIME_ARITHMETIC_SYNTAX = [
  {
    selector: "CallExpression[callee.property.name='getTime']",
    message:
      'No millisecond arithmetic in domain/application (ADR-013). Use date-fns: addMinutes/differenceInMinutes to calculate, isBefore/isAfter/isEqual to compare.',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message:
      'The wall clock enters only through the Clock port (ADR-013). Inject CLOCK and call clock.now().',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message:
      'The wall clock enters only through the Clock port (ADR-013). Inject CLOCK and call clock.now(); `new Date(instant)` to copy one is fine.',
  },
];

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  env: { node: true, jest: true, es2022: true },
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', '*.js', '*.cjs', '*.mjs', 'jest.config.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    'no-console': 'error',
    // ADR-013: UUID v7 is the only version this service mints. These imports are the only ways
    // to regress to v4, so the rule lives in lint rather than in a reviewer's memory.
    'no-restricted-imports': ['error', { paths: UUID_V4_SOURCES }],
  },
  overrides: [
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: UUID_V4_SOURCES,
            patterns: [
              {
                group: [
                  '@nestjs/*',
                  'typeorm',
                  'typeorm/*',
                  'pg',
                  'kafkajs',
                  'ioredis',
                  'nestjs-cls',
                  '@node-rs/*',
                  'argon2',
                  'zod',
                  '**/infrastructure/*',
                  '**/interface/*',
                  // `shared/` is no longer uniformly pure: `config/` reads process.env and
                  // `logging/` is a NestJS/pino adapter. Only `shared/logging/logger.port` (the
                  // token + interface) is importable, via the `shared` barrel.
                  '**/shared/config',
                  '**/shared/config/*',
                  '**/shared/logging',
                  '**/shared/logging/app-logger.service',
                  '**/shared/logging/logging.module',
                  '**/shared/logging/pino-params',
                ],
                message:
                  'The domain layer imports no framework/ORM/SDK and depends on nothing outward (CONSTITUTION Art. V.1). Define a port; implement it in infrastructure/. The only third-party exceptions are `date-fns` and `uuid` (ADR-013) — both pure; anything else needs a new ADR.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      rules: {
        'no-restricted-syntax': ['error', ...TIME_ARITHMETIC_SYNTAX],
      },
    },
    {
      files: ['test/**/*.ts', '**/*.spec.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/unbound-method': 'off',
        'no-console': 'off',
      },
    },
  ],
};
