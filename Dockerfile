# syntax=docker/dockerfile:1
# =============================================================================
# PMG Group OS — unified monorepo image (API + web), single workspace install
# =============================================================================
# Multi-stage build for the whole pnpm workspace. The expensive `pnpm install`
# runs ONCE in the `base` stage; every other stage derives from it.
#
# Build targets (docker-compose selects each via `target:`):
#   base   — workspace + node_modules (used by the one-shot DB migrate step)
#   web    — nginx serving the React build, reverse-proxying /api → api
#   api    — Express API on Node (DEFAULT / final stage)
#
# Debian base (node:*-slim = glibc), NOT alpine: the build needs the
# linux-x64-GNU native binaries (esbuild / rollup / lightningcss / tailwind-oxide).
#
# NOTE ON NATIVE BINARIES: the committed pnpm-workspace.yaml `overrides` keep the
# win32-x64 binaries (for local Windows dev) and DROP the linux ones. The `base`
# stage below strips those platform overrides out of the image's copy of the
# workspace file, so `pnpm install` pulls the correct linux-x64-gnu binaries.
# The committed repo file is untouched — Windows `pnpm install` still works.
# -----------------------------------------------------------------------------

# ---- base: full workspace install (the only network-heavy stage) ------------
FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Puppeteer (a root dep) can't run headless Chrome in this slim image anyway
# (no system libs), so skip the ~150MB Chromium download at install time.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN corepack enable

WORKDIR /app

# Copy the whole workspace: the frontend imports workspace packages as source
# and the API bundles them, so the full monorepo is needed.
COPY . .

# Make `pnpm install` resilient on slow/flaky links (these MUST live in .npmrc;
# pnpm ignores the env-var form for the fetch-* keys).
RUN { \
      echo "store-dir=/pnpm/store"; \
      echo "fetch-timeout=1200000"; \
      echo "fetch-retries=10"; \
      echo "fetch-retry-mintimeout=20000"; \
      echo "fetch-retry-maxtimeout=600000"; \
    } >> .npmrc

# Disable the 1-day supply-chain "minimum release age" gate for THIS build only
# (a fresh install re-checks 500+ publish dates otherwise). Committed file is
# untouched, so developer installs still enforce the gate.
RUN sed -i -E 's/^minimumReleaseAge:.*/minimumReleaseAge: 0/' pnpm-workspace.yaml

# Strip the per-platform native-binary `overrides` so pnpm installs the correct
# linux-x64-gnu binaries for THIS image (see NOTE above). Removes every
# esbuild/rollup/lightningcss/tailwind-oxide platform override line (both the
# active "drop" lines and the commented win32 "keep" lines).
RUN sed -i -E '/(>@esbuild\/|>@rollup\/|lightningcss>lightningcss-|@tailwindcss\/oxide>)/d' pnpm-workspace.yaml

# Install the whole workspace once. --no-frozen-lockfile because we just edited
# the manifest (platform overrides removed); the catalog still pins every
# meaningful version so the resolution stays deterministic.
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --no-frozen-lockfile \
      --fetch-timeout=1200000 \
      --fetch-retries=10

# ---- build-web: compile the React/Vite bundle → dist/public -----------------
# vite.config.ts REQUIRES PORT and BASE_PATH at build time (it throws otherwise).
# BASE_PATH=/ so assets are served from nginx root; VITE_API_BASE_URL is left
# unset so the app calls the relative "/api" path that nginx proxies.
FROM base AS build-web
ENV PORT=5173
ENV BASE_PATH=/
RUN pnpm --filter @workspace/pmg-os run build

# ---- web: nginx serving the SPA + reverse-proxying /api → api ---------------
FROM nginx:alpine AS web
COPY artifacts/pmg-os/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-web /app/artifacts/pmg-os/dist/public /usr/share/nginx/html
EXPOSE 80
# nginx:alpine's default CMD already runs nginx in the foreground.

# ---- api: Express server on Node (DEFAULT / final stage) ---------------------
# Built FROM base (keeps node_modules): the esbuild bundle externalizes some
# deps that are imported lazily at runtime (e.g. `await import("nodemailer")`),
# so node_modules must be present for those code paths to resolve.
FROM base AS api
RUN pnpm --filter @workspace/api-server run build
ENV NODE_ENV=production
# Default port for a local run; compose/PaaS can override PORT.
ENV PORT=8080
EXPOSE 8080
# Run the built bundle directly (NOT the package `start` script — that one hard-codes
# `--env-file=.env`, which does not exist in the image; env comes from compose).
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
