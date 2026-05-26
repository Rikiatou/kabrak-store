FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

EXPOSE 8080
CMD ["sh", "-c", "echo '>>> Starting KABRAK backend' && (node node_modules/prisma/build/index.js migrate deploy 2>&1 || echo '>>> Migrate skipped'); echo '>>> Launching server'; exec node dist/server.js"]
