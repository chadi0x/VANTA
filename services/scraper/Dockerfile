FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
COPY services/scraper/package.json ./services/scraper/
RUN npm install --workspace=@vanta/scraper

COPY services/scraper ./services/scraper
RUN npm run build --workspace=@vanta/scraper

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Chromium and dependencies for puppeteer-extra
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package.json ./
COPY services/scraper/package.json ./services/scraper/
RUN npm install --omit=dev --workspace=@vanta/scraper

COPY --from=builder /app/services/scraper/dist ./services/scraper/dist

CMD ["node", "services/scraper/dist/index.js"]
