# File Service Dockerfile
# Multi-stage build for production optimization and security

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies, pnpm, and native module dependencies
RUN apk add --no-cache python3 make g++ vips-dev && \
    npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy shared common package and build it
COPY packages/common ./packages/common
RUN cd packages/common && pnpm install --no-frozen-lockfile && pnpm run build

# Copy service package files
WORKDIR /app/services/file-service
COPY services/file-service/package*.json ./
COPY services/file-service/pnpm-lock.yaml* ./
COPY services/file-service/tsconfig.json ./

# Rewrite @giga/common workspace dep to a local file path for container build
RUN node -e "const fs=require('fs');const p=require('./package.json');if(p.dependencies&&p.dependencies['@giga/common']){p.dependencies['@giga/common']='file:../../packages/common';}fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

# Install service deps (linked to vendored common)
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY services/file-service/src/ ./src/
RUN pnpm run build

# Prune to production
RUN pnpm prune --prod

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies and security tools
RUN apk add --no-cache dumb-init vips && \
    npm install -g pnpm

# Create non-root user with specific UID/GID for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fileuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built app and pruned node_modules
COPY --from=builder --chown=fileuser:nodejs /app/services/file-service/dist ./dist
COPY --from=builder --chown=fileuser:nodejs /app/services/file-service/node_modules ./node_modules
COPY services/file-service/package*.json ./

# Create necessary directories with proper ownership
RUN mkdir -p logs tmp uploads && \
    chown -R fileuser:nodejs /app

# Switch to non-root user
USER fileuser

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]