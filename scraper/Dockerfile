# Build context must be repo root (fly.toml: context = "..") so lib/ is available.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends procps \
  && rm -rf /var/lib/apt/lists/* \
  && npx playwright install-deps chromium

WORKDIR /app/scraper

COPY scraper/package*.json ./
RUN npm ci

COPY lib /app/lib
COPY scraper/ .

RUN npx playwright install chromium

ENV CRON_ENABLED=true
ENV CRAWLEE_PERSIST_STORAGE=false

CMD ["node", "--import", "tsx", "src/worker.ts"]
