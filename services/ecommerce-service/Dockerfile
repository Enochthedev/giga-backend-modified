FROM node:18

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY ecommerce-backend/package.json ecommerce-backend/pnpm-lock.yaml ecommerce-backend/tsconfig.json ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY ecommerce-backend/src ./src

# Build the service
RUN pnpm run build
RUN pnpm prune --prod

EXPOSE 4000
CMD ["node", "build/app.js"]
