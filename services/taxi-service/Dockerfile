# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY services/taxi-service/package*.json services/taxi-service/pnpm-lock.yaml ./
COPY services/taxi-service/tsconfig.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY services/taxi-service/src/ ./src/

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and dumb-init for proper signal handling
RUN npm install -g pnpm && apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S taxi-service -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional files needed at runtime
COPY --chown=taxi-service:nodejs .env.example ./.env.example

# Create logs directory
RUN mkdir -p logs && chown taxi-service:nodejs logs

# Switch to non-root user
USER taxi-service

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]