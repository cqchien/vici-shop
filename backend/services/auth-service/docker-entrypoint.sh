#!/bin/sh
set -e

# Run pending migrations against the compiled datasource, then hand off to CMD (the server).
echo "auth-service: running migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/infrastructure/persistence/migrations.datasource.js

echo "auth-service: starting..."
exec "$@"
