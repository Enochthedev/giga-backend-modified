# Multi-stage build for Admin Service
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY services/admin-service/package*.json ./
COPY services/admin-service/pnpm-lock.yaml* ./
COPY services/admin-service/tsconfig.json ./

# Install dependencies
RUN pnpm install --prod

# Copy source code
COPY src/ ./src/

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and dumb-init for proper signal handling
RUN npm install -g pnpm && apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S admin -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY services/admin-service/package*.json ./
COPY services/admin-service/pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional files needed at runtime
COPY --from=builder /app/src/database/schema.sql ./dist/database/

# Create logs directory
RUN mkdir -p logs && chown -R admin:nodejs logs

# Change ownership of the app directory
RUN chown -R admin:nodejs /app

# Switch to non-root user
USER admin

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]