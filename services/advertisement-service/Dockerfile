FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY services/advertisement-service/package.json services/advertisement-service/pnpm-lock.yaml services/advertisement-service/tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY advertisement-service/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4003
CMD ["node", "build/app.js"]
