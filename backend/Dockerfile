# ──────────────────────────────────────────────────────────────
# Railway Dockerfile: Node.js 20 + Python 3 (ML Training)
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL dependencies (including devDeps for nest build)
COPY package.json package-lock.json ./
RUN npm ci

# sharp rebuild for linux-x64
RUN npm install sharp@0.34.4 --force \
    && npm rebuild sharp --force \
    || echo "sharp rebuild warning (non-fatal)"

# Copy Prisma schema + config, generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npx nest build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-bookworm-slim AS production

# System deps: Python 3 + build tools for ML
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    cmake \
    libpq-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Install core ML packages
RUN pip3 install --no-cache-dir --break-system-packages \
    "pandas>=2.0" \
    "numpy>=1.24" \
    "psycopg2-binary>=2.9" \
    "scikit-learn>=1.3" \
    "joblib>=1.3" \
    "mlxtend>=0.23" \
    "tqdm>=4.65"

# Try Prophet — fallback to moving average if it fails
RUN pip3 install --no-cache-dir --break-system-packages "prophet>=1.1" \
    || echo "WARNING: Prophet install failed — demand forecasting will use moving average fallback"

WORKDIR /app

# Copy only production node_modules from builder
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# sharp rebuild for linux-x64 in production stage
RUN npm install sharp@0.34.4 --omit=dev --force \
    && npm rebuild sharp --force \
    || echo "sharp rebuild warning (non-fatal)"

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma.config.ts ./

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy ML training scripts (needed at runtime)
COPY ml ./ml/

# Copy nest-cli.json (may be needed by runtime)
COPY nest-cli.json ./

# Copy postinstall and other scripts
COPY scripts ./scripts/

ENV NODE_ENV=production
ENV ML_PYTHON_CMD=python3

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
