#!/usr/bin/env node

const { execSync } = require('child_process');

function run(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error(`Failed: ${description}`);
    process.exit(1);
  }
}

console.log('🚀 Starting Railway deployment...\n');

run('npm run db:generate --workspace=server', '📦 Generating Prisma Client');
run('npm run db:migrate:deploy --workspace=server', '🗄️  Running database migrations');
run('npm start', '🎬 Starting application');
