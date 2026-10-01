# ==========================================
# NEXUSGEST BACKEND - DOCKERFILE (Coolify)
# ==========================================

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
# Create uploads directory with proper permissions (uploads_data lo monta en runtime)
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Change ownership of application files
RUN chown -R nextjs:nodejs /app
USER nextjs  # Switch to non-root user

EXPOSE 5000

# Health check para Coolify
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]