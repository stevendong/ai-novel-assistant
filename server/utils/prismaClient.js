const { PrismaClient } = require('@prisma/client');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// Ensure development runs against a predictable local database
if (!isProduction && (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '')) {
  const defaultLocalUrl =
    process.env.LOCAL_DATABASE_URL ||
    'postgresql://noveluser:changeme@localhost:5432/novel_db?schema=public';

  process.env.DATABASE_URL = defaultLocalUrl;

  // Expose the resolved database location so tooling/scripts can reuse it if needed
  process.env.RESOLVED_DATABASE_URL = defaultLocalUrl;

  // Provide a helpful hint for developers running the stack for the first time
  if (!process.env.SUPPRESS_DB_HINT) {
    const dbLabel = defaultLocalUrl.startsWith('file:')
      ? path.resolve(defaultLocalUrl.replace('file:', ''))
      : defaultLocalUrl;
    console.info(`[db] Using local development database: ${dbLabel}`);
  }
}

const createClient = () =>
  new PrismaClient({
    log: process.env.PRISMA_QUERY_LOG === 'true' ? ['error', 'warn', 'query'] : ['error', 'warn'],
  });

// Reuse the Prisma client in development to avoid exhausting database connections
const globalWithPrisma = global;

const prisma = isProduction
  ? createClient()
  : globalWithPrisma.__prismaClient || (globalWithPrisma.__prismaClient = createClient());

module.exports = prisma;
