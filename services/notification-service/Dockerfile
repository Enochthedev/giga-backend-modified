# Single-stage build for notification service (development)
FROM node:18-alpine

# Install pnpm and ts-node for development
RUN npm install -g pnpm ts-node

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S notification -u 1001

# Copy package files from service directory
COPY services/notification-service/package*.json ./
# Copy pnpm-lock.yaml if it exists, otherwise skip
COPY services/notification-service/pnpm-lock.yaml* ./

# Install all dependencies (including dev dependencies for ts-node)
RUN pnpm install

# Copy source code and config
COPY services/notification-service/src/ ./src/
COPY services/notification-service/tsconfig.json ./

# Change ownership to non-root user
RUN chown -R notification:nodejs /app
USER notification

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application in development mode with ts-node
CMD ["pnpm", "run", "dev"]