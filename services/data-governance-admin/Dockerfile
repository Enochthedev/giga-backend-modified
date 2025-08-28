FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/common ./packages/common
COPY services/data-governance-admin ./services/data-governance-admin

# Build the common package
RUN cd packages/common && npm run build

# Build the service
RUN cd services/data-governance-admin && npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3020

CMD ["node", "services/data-governance-admin/dist/index.js"]