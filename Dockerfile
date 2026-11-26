# ---- Build stage: compile TypeScript ----
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage: production deps + compiled JS only ----
FROM node:26-alpine
ENV NODE_ENV=production \
    DATABASE_PATH=/app/data/dity.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# The data directory holds the SQLite database; owned by the unprivileged "node" user
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
