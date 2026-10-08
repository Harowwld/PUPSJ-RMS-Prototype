FROM postgres:16-bookworm AS postgres-tools

FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOCAL_DATA_DIR=/app/.local \
    PATH=/usr/lib/postgresql/16/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ tesseract-ocr poppler-utils libpq5 liblz4-1 libzstd1 libreadline8 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=postgres-tools /usr/lib/postgresql/16/bin/pg_dump /usr/lib/postgresql/16/bin/pg_dump
COPY --from=postgres-tools /usr/lib/postgresql/16/bin/psql /usr/lib/postgresql/16/bin/psql
RUN pg_dump --version && psql --version

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN mkdir -p /app/.local \
    && pnpm build

EXPOSE 3000

CMD ["node", "scripts/start-local-prod.mjs"]
