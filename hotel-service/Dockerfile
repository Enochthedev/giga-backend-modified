FROM node:18
WORKDIR /app

# Copy package files and install dependencies
COPY hotel-service/package.json hotel-service/tsconfig.json ./
RUN npm install

# Copy source code
COPY hotel-service/src ./src

# Build the service
RUN npm run build
RUN npm prune --production

EXPOSE 4001
CMD ["node", "build/app.js"]
