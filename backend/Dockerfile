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

RUN apk add --no-cache postgresql-client

# Create non-root user for security.
# --ingroup nodejs es explicito: sin el, adduser asigna el grupo por defecto
# y el `--chown=nextjs:nodejs` de mas abajo dependeria de esa suposicion.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs
# Create uploads directory with proper permissions (uploads_data lo monta en runtime)
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Change ownership of application files
RUN chown -R nextjs:nodejs /app
# Switch to non-root user. El comentario va en su propia linea: pegado a
# la instrucción, Docker lo interpreta como parte del valor y falla con
# "unable to find user nextjs # Switch to...".
USER nextjs

EXPOSE 5000

# Health check para Coolify.
# 127.0.0.1 y no localhost: en Alpine, localhost resuelve primero a [::1], y
# si el servidor solo escucha en IPv4 el wget falla y el contenedor queda
# unhealthy aunque la app responda.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

CMD ["node", "dist/index.js"]