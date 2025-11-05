#!/bin/bash
set -e

echo "🚀 Starting Railway deployment..."

echo "📦 Generating Prisma Client..."
npm run db:generate --workspace=server

echo "🗄️  Running database migrations..."
npm run db:migrate:deploy --workspace=server

echo "🎬 Starting application..."
npm start
