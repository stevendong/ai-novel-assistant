# Multi-stage build for AI Novel Assistant
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./

# Copy client package files
COPY client/package*.json ./client/

# Install ALL workspace dependencies (including devDependencies for build)
RUN npm ci

# Copy client source
COPY client/ ./client/

# Build frontend
WORKDIR /app/client
RUN npm run build-only

# Stage 2: Setup backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./

# Copy server package files
COPY server/package*.json ./server/

# Install workspace dependencies including prisma
# Note: We need all deps initially to generate Prisma client
RUN npm ci

# Copy server source and prisma schema
COPY server/ ./server/

# Generate Prisma Client
WORKDIR /app/server
RUN npx prisma generate

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and OpenSSL for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy backend from builder
COPY --from=backend-builder --chown=nodejs:nodejs /app/server ./server

# Copy built frontend from builder
COPY --from=frontend-builder --chown=nodejs:nodejs /app/client/dist ./server/public

# Create necessary directories with proper permissions
RUN mkdir -p /app/server/prisma/data && \
    mkdir -p /app/server/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

WORKDIR /app/server

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]
