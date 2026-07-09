# ── Stage 1: Build Angular app ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .

# Accept the API URL as a build argument so Railway can inject it
ARG API_URL=https://your-api.up.railway.app/api/v1

# Patch environment.prod.ts with the real URL at build time
RUN sed -i "s|RAILWAY_API_URL_PLACEHOLDER|${API_URL}|g" src/environments/environment.prod.ts

RUN npm run build -- --configuration=production

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=builder /app/dist/barber-booking-web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
