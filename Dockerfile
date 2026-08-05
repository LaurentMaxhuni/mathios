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

USER mathios
EXPOSE 3000
CMD ["node", "server.js"]
