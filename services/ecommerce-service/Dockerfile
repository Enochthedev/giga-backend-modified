FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY services/ecommerce-service/package.json services/ecommerce-service/tsconfig.json ./
COPY services/ecommerce-service/pnpm-lock.yaml* ./
RUN pnpm install

# Copy source code
COPY ecommerce-backend/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4000
CMD ["node", "build/app.js"]
