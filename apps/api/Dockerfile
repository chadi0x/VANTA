FROM node:20-bullseye-slim AS builder

WORKDIR /app
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
RUN npm install --workspace=@vanta/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

COPY apps/api ./apps/api
RUN npm run build --workspace=@vanta/api

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
RUN npm install --omit=dev --workspace=@vanta/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
