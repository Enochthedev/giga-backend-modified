FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY services/payment-service/package.json services/payment-service/pnpm-lock.yaml services/payment-service/tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/payment-service/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4002
CMD ["node", "build/app.js"]
