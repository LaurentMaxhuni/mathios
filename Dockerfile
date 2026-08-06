FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 mathios && adduser --system --uid 1001 mathios
COPY --from=builder --chown=mathios:mathios /app/.next/standalone ./
COPY --from=builder --chown=mathios:mathios /app/.next/static ./.next/static
COPY --from=builder --chown=mathios:mathios /app/public ./public
COPY --from=builder --chown=mathios:mathios /app/drizzle ./drizzle
COPY --from=builder --chown=mathios:mathios /app/scripts/migrate-runtime.mjs ./scripts/migrate-runtime.mjs

USER mathios
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate-runtime.mjs && node server.js"]
