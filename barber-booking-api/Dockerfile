# ── Stage 1: Composer dependencies ──────────────────────────────────────────
FROM composer:2.7 AS vendor

WORKDIR /app

# Copy all source first (needed for optimized autoloader to scan app/ classes)
COPY . .

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --ignore-platform-req=ext-sodium

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM php:8.2-fpm-alpine

# Install system dependencies + PHP extensions
RUN apk add --no-cache \
    nginx \
    supervisor \
    mysql-client \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    libsodium-dev \
    curl \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        zip \
        gd \
        intl \
        bcmath \
        sodium \
        pcntl \
    && docker-php-ext-enable sodium

WORKDIR /var/www/html

# Copy full app from the vendor stage (already has vendor/ baked in)
COPY --from=vendor /app .

# Overwrite with docker config files
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini

# Storage & permissions
RUN mkdir -p storage/logs \
             storage/framework/cache/data \
             storage/framework/sessions \
             storage/framework/views \
             storage/app/public \
             bootstrap/cache \
             /var/log/supervisor \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod +x docker/start.sh \
    && rm -f .env

EXPOSE 80

CMD ["/bin/sh", "/var/www/html/docker/start.sh"]
