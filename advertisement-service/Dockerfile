FROM node:18
WORKDIR /app

# Copy package files and install dependencies
COPY advertisement-service/package.json advertisement-service/tsconfig.json ./
RUN npm install

# Copy source code
COPY advertisement-service/src ./src

# Build the service
RUN npm run build
RUN npm prune --production

EXPOSE 4003
CMD ["node", "build/app.js"]
