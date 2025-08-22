FROM node:18
WORKDIR /app

# Copy and build common module first
COPY common ./common
WORKDIR /app/common
RUN npm install
RUN npm run build

# Return to app directory and install dependencies
WORKDIR /app
COPY giga_taxi_driver/package.json ./
COPY giga_taxi_driver/tsconfig.json ./
RUN npm install

# Install common module's dependencies in the main container
RUN npm install winston express-rate-limit rate-limit-redis redis swagger-jsdoc swagger-ui-express jsonwebtoken pg

# Copy source code and build
COPY giga_taxi_driver/src ./src
RUN npm run build

# Copy the built common module to node_modules so it's available at runtime
RUN rm -rf node_modules/common && mkdir -p node_modules/common && cp -r common/build/* node_modules/common/

EXPOSE 6000
CMD ["node", "build/app.js"]