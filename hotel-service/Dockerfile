FROM node:18
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --only=production
COPY src ./src
RUN npm run build
EXPOSE 4000
CMD ["node", "build/app.js"]
