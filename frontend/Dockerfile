# ==========================================
# NEXUSGEST FRONTEND - DOCKERFILE (Coolify)
# Optimizado con Next.js Standalone
# ==========================================

# Origen interno del API visto desde el servidor de Next (red de Docker).
# Se hornea en routes-manifest.json durante el build: cambiarlo exige
# reconstruir la imagen, no basta con redeploy.
ARG API_INTERNAL_URL=http://backend:5000

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría de Next.js para builds más rápidos y limpios
ARG API_INTERNAL_URL
ARG SURFACE=public
ARG NEXT_PUBLIC_CRM_PREVIEW=false
ENV NEXT_PUBLIC_CRM_PREVIEW=${NEXT_PUBLIC_CRM_PREVIEW}
ENV NEXT_TELEMETRY_DISABLED=1
ENV SURFACE=${SURFACE}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Configuración automática de permisos para standalone
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck para Coolify. start-period generoso: Next tarda en levantar
# el servidor standalone y un periodo corto provoca reinicios en cascada.
#
# 127.0.0.1 y no localhost: en Alpine, localhost resuelve primero a [::1], y
# si el servidor solo escucha en IPv4 el wget falla y el contenedor queda
# unhealthy aunque la app responda.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
