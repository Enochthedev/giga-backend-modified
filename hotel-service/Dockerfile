FROM node:18
WORKDIR /app

# Copy and build common module first
COPY common ./common
WORKDIR /app/common
RUN npm install
RUN npm run build

# Build the main service
WORKDIR /app
COPY hotel-service/package.json hotel-service/tsconfig.json ./
RUN npm install
# Copy the built common module to node_modules
RUN mkdir -p node_modules/common && cp -r common/build/* node_modules/common/
COPY hotel-service/src ./src
RUN npm run build
RUN npm prune --production

EXPOSE 4001
CMD ["node", "build/app.js"]
