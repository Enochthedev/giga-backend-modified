FROM node:18
WORKDIR /app

# Copy package files and install dependencies
COPY payment-service/package.json payment-service/tsconfig.json ./
RUN npm install

# Copy source code
COPY payment-service/src ./src

# Build the service
RUN npm run build
RUN npm prune --production

EXPOSE 4002
CMD ["node", "build/app.js"]
