FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY services/hotel-service/package.json services/hotel-service/tsconfig.json ./
COPY services/hotel-service/pnpm-lock.yaml* ./
RUN pnpm install

# Copy source code
COPY hotel-service/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4001
CMD ["node", "build/app.js"]
