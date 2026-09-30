FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS runtime
WORKDIR /app/services/notifications
COPY services/notifications/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
# Package managers are build tools, not worker runtime dependencies.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY services/notifications/src ./src
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.mjs"]

FROM runtime AS lab
COPY services/notifications/lab ./lab
COPY supabase/tests/bootstrap.sql /app/supabase/tests/bootstrap.sql
COPY supabase/migrations /app/supabase/migrations
