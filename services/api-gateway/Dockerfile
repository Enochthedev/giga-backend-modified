FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY services/api-gateway/package*.json pnpm-lock.yaml ./
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY services/api-gateway/src ./src
COPY packages/common/src ./packages/common/src
COPY services/api-gateway/tsconfig.json ./
COPY tsconfig.json ./

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["pnpm", "start"]