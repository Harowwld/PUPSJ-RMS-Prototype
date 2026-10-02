FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOCAL_DATA_DIR=/app/.local

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ tesseract-ocr poppler-utils \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN mkdir -p /app/.local \
    && pnpm build

EXPOSE 3000

CMD ["node", "scripts/start-local-prod.mjs"]
