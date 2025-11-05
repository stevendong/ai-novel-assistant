const { Prisma } = require('@prisma/client');
const { randomUUID, randomBytes } = require('crypto');
const prisma = require('./prismaClient');

let ensureTablePromise;

const generateId = () => (typeof randomUUID === 'function' ? randomUUID() : randomBytes(16).toString('hex'));

const ensureSystemConfigTable = async () => {
  if (prisma.systemConfig && typeof prisma.systemConfig.findMany === 'function') {
    return;
  }

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "SystemConfig" (
            "id" TEXT PRIMARY KEY,
            "key" TEXT NOT NULL UNIQUE,
            "value" TEXT,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key"
          ON "SystemConfig"("key")
        `);
      } catch (error) {
        ensureTablePromise = undefined;
        throw error;
      }
    })();
  }

  return ensureTablePromise;
};

const isMissingSystemConfigTableError = (error) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = `${error.message || ''}`.toLowerCase();
  return message.includes('no such table: systemconfig') || message.includes('relation "systemconfig" does not exist');
};

const fetchSystemConfigs = async (keys) => {
  if (prisma.systemConfig && typeof prisma.systemConfig.findMany === 'function') {
    return prisma.systemConfig.findMany({
      where: {
        key: {
          in: keys,
        },
      },
    });
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return [];
  }

  const runQuery = () =>
    prisma.$queryRaw(
      Prisma.sql`SELECT key, value FROM "SystemConfig" WHERE key IN (${Prisma.join(
        keys.map((key) => Prisma.sql`${key}`)
      )})`
    );

  try {
    return await runQuery();
  } catch (error) {
    if (!isMissingSystemConfigTableError(error)) {
      throw error;
    }

    await ensureSystemConfigTable();
    return runQuery();
  }
};

const upsertSystemConfig = async (key, value) => {
  if (prisma.systemConfig && typeof prisma.systemConfig.upsert === 'function') {
    return prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  const executeUpsert = () =>
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SystemConfig" ("id", "key", "value", "createdAt", "updatedAt")
        VALUES (${generateId()}, ${key}, ${value ?? null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("key")
        DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
      `
    );

  try {
    await executeUpsert();
  } catch (error) {
    if (!isMissingSystemConfigTableError(error)) {
      throw error;
    }

    await ensureSystemConfigTable();
    await executeUpsert();
  }

  return { key, value };
};

module.exports = {
  fetchSystemConfigs,
  upsertSystemConfig,
};
