FROM node:18
WORKDIR /app

# Copy package files
COPY advertisement-service/package.json ./
COPY advertisement-service/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY advertisement-service/src ./src

# Build the application
RUN npm run build

EXPOSE 4003
CMD ["node", "build/app.js"]
