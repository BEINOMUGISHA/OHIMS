# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Only install production-needed packages
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server entry point (pre-bundled as CommonJS)
COPY --from=builder /app/dist/server.cjs ./dist/server.cjs
COPY --from=builder /app/dist/server.cjs.map ./dist/server.cjs.map

EXPOSE 3000

# Non-root user for security
RUN addgroup -S ohims && adduser -S ohims -G ohims
USER ohims

CMD ["node", "dist/server.cjs"]
