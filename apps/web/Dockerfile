FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace=@vanta/web

COPY apps/web ./apps/web
RUN npm run build --workspace=@vanta/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY apps/web/package.json ./apps/web/
RUN npm install --omit=dev --workspace=@vanta/web

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
