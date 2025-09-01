# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY services/search-service/package*.json ./
COPY services/search-service/pnpm-lock.yaml* ./
COPY services/search-service/tsconfig.json ./

# Install dependencies
RUN pnpm install --prod

# Copy source code
COPY services/search-service/src/ ./src/

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S searchservice -u 1001

# Copy package files
COPY services/search-service/package*.json ./
COPY services/search-service/pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown -R searchservice:nodejs logs

# Switch to non-root user
USER searchservice

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/app.js"]