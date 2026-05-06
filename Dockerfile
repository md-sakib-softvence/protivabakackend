# ──────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────
FROM node:20-bullseye AS builder

RUN apt-get update && apt-get install -y \
  python3 make g++ gcc postgresql-client \
  && ln -sf python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./

RUN npm config set fetch-retry-maxtimeout 120000 && \
  npm config set fetch-retries 10 && \
  npm install --legacy-peer-deps

COPY --chown=node:node . .

RUN npx prisma generate
RUN npm run build

# ──────────────────────────────────────────
# Stage 2: Runtime (lean production image)
# ──────────────────────────────────────────
FROM node:20-bullseye AS runtime

RUN apt-get update && apt-get install -y \
  postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Pre-create directories and set owner
RUN mkdir -p uploads/profile-images uploads-file/png \
  && chown -R node:node /usr/src/app

USER node

COPY --from=builder --chown=node:node /usr/src/app/dist        ./dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/prisma      ./prisma
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./
COPY --from=builder --chown=node:node /usr/src/app/tsconfig.json ./
COPY --from=builder --chown=node:node /usr/src/app/docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
