FROM node:20-alpine AS builder
ARG BUILD_DATE
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
CMD ["sh", "-c", "echo 'Starting server...' && npx prisma migrate deploy && echo 'Prisma done, starting node...' && node dist/server.js"]
