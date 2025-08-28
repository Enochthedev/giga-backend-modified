FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY hotel-service/package.json hotel-service/pnpm-lock.yaml hotel-service/tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY hotel-service/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4001
CMD ["node", "build/app.js"]
