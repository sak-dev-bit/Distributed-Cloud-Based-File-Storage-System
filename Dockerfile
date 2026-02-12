# Production Dockerfile for the Node.js backend.
# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --only=production && npm install --only=development

COPY tsconfig.json jest.config.cjs ./
COPY src ./src
COPY migrations ./migrations

RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY migrations ./migrations

EXPOSE 4000

CMD ["node", "dist/server.js"]

