FROM node:22-bookworm-slim
WORKDIR /app/services/notifications
COPY services/notifications/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY services/notifications/src ./src
COPY services/notifications/lab ./lab
COPY supabase/tests/bootstrap.sql /app/supabase/tests/bootstrap.sql
COPY supabase/migrations /app/supabase/migrations
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.mjs"]
