# Production Dockerfile for the Node.js backend.
# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache build-base openssl-dev python3 make nodejs-dev

COPY package.json package-lock.json* ./
RUN npm install

# Build the C++ native addon
COPY native ./native
RUN cd native && make all

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
COPY --from=builder /usr/src/app/native/storage_native.node ./native/storage_native.node
COPY migrations ./migrations


EXPOSE 4000

CMD ["node", "dist/server.js"]

