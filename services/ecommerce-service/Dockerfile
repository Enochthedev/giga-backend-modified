FROM node:18
WORKDIR /app

# Copy package files and install dependencies
COPY ecommerce-backend/package.json ecommerce-backend/tsconfig.json ./
RUN npm install

# Copy source code
COPY ecommerce-backend/src ./src

# Build the service
RUN npm run build
RUN npm prune --production

EXPOSE 4000
CMD ["node", "build/app.js"]
