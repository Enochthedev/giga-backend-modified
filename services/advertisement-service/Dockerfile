# Advertisement Service Dockerfile
# Multi-stage build for production optimization and security

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies and pnpm
RUN apk add --no-cache python3 make g++ && \
    npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy shared common package and build it
COPY packages/common ./packages/common
RUN cd packages/common && pnpm install --no-frozen-lockfile && pnpm run build

# Copy service package files
WORKDIR /app/services/advertisement-service
COPY services/advertisement-service/package*.json ./
COPY services/advertisement-service/pnpm-lock.yaml* ./
COPY services/advertisement-service/tsconfig.json ./

# Rewrite @giga/common workspace dep to a local file path for container build
RUN node -e "const fs=require('fs');const p=require('./package.json');if(p.dependencies&&p.dependencies['@giga/common']){p.dependencies['@giga/common']='file:../../packages/common';}fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

# Install service deps (linked to vendored common)
RUN pnpm install --no-frozen-lockfile

# Copy source code and build
COPY services/advertisement-service/src/ ./src/
RUN pnpm run build

# Prune to production
RUN pnpm prune --prod

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies and security tools
RUN apk add --no-cache dumb-init && \
    npm install -g pnpm

# Create non-root user with specific UID/GID for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adsuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built app and pruned node_modules
COPY --from=builder --chown=adsuser:nodejs /app/services/advertisement-service/dist ./dist
COPY --from=builder --chown=adsuser:nodejs /app/services/advertisement-service/node_modules ./node_modules
COPY services/advertisement-service/package*.json ./

# Create necessary directories with proper ownership
RUN mkdir -p logs tmp && \
    chown -R adsuser:nodejs /app

# Switch to non-root user
USER adsuser

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]
