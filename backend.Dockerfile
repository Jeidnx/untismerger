# Install dependencies only when needed
FROM node:16-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:16-alpine AS builder
WORKDIR /app/backend
COPY --from=deps /app/node_modules ./node_modules
COPY backend .
COPY globalTypes.d.ts /app
COPY config.ts /app

RUN npm run build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

COPY --from=builder /app/backend ./

EXPOSE 8080

CMD ["node", "./out/backend/src/api.js"]