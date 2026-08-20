# syntax=docker/dockerfile:1.4

# ---------------------------------------------------------------------------
# VeriNode Frontend — multi-stage Docker image.
#
# Layer-caching strategy (issue #167):
#   1. `deps`    — copies ONLY the lockfile manifests first, so `npm ci` is
#                  cached independently of source code. The npm store is kept
#                  in a BuildKit cache mount that survives between builds.
#   2. `builder` — reuses the dependency layer and only re-runs when source
#                  files change.
#   3. `runner`  — ships only `next build`'s standalone output (no
#                  `node_modules`), yielding a small, immutable final layer.
# ---------------------------------------------------------------------------

# ---- Stage 1: install dependencies (cached by package manifests) ----------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy manifests first so dependency resolution is its own cacheable layer.
COPY package.json package-lock.json ./

# `--mount=type=cache` keeps the npm store in the BuildKit cache, so repeated
# builds don't re-download the registry even when the lockfile changes.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- Stage 2: build the application ---------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Reuse the dependency layer verbatim (no re-install).
COPY --from=deps /app/node_modules ./node_modules

# Copy source and config needed by `next build`.
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Re-run the npm cache mount so any installs triggered at build time are also
# cached, and the production bundle is emitted as standalone output.
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# ---- Stage 3: minimal production runtime -----------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Static assets must be copied next to the standalone server.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
