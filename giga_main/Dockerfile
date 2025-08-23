FROM node:18
WORKDIR /app

# Copy package files and install dependencies
COPY giga_main/package.json giga_main/tsconfig.json ./
RUN npm install

# Copy source code
COPY giga_main/src ./src

# Build the service
RUN npm run build
RUN npm prune --production

EXPOSE 3000
CMD ["node", "build/app.js"]