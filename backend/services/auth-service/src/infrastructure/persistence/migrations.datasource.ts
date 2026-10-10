import 'reflect-metadata';
import 'dotenv/config'; // CLI entry point — load .env (the Nest app does this in main.ts)

import { DataSource } from 'typeorm';

import { buildDataSourceOptions } from './data-source';
import { ApiConfigService } from '../../shared/config/api-config.service';

/** Entry point for the `typeorm` CLI only (`pnpm migration:run`). The Nest app builds its own. */
const config = new ApiConfigService();

export default new DataSource(
  buildDataSourceOptions(config.databaseUrl, ['error', 'warn', 'migration']),
);
