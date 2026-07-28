FROM node:22-slim

RUN npx playwright install-deps chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx playwright install chromium

ENV CRON_ENABLED=true

CMD ["node", "--import", "tsx", "src/worker.ts"]
