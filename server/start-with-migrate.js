#!/usr/bin/env node

const { execSync } = require('child_process');

function run(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.error(`Failed: ${description}`);
    process.exit(1);
  }
}

console.log('🚀 Starting with database migrations...\n');

run('npx prisma generate', '📦 Generating Prisma Client');
run('npx prisma migrate deploy', '🗄️  Running database migrations');

console.log('\n🎬 Starting application...\n');

require('./index.js');
