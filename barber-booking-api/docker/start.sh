#!/bin/sh
set -e

echo "==> Waiting for MySQL to be ready..."
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT:-3306};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
  echo "    MySQL not ready yet, retrying in 3s..."
  sleep 3
done
echo "==> MySQL is ready."

echo "==> Running migrations..."
php artisan migrate --force --no-ansi

echo "==> Linking storage..."
php artisan storage:link --no-ansi || true

echo "==> Caching config & routes..."
php artisan config:cache --no-ansi
php artisan route:cache --no-ansi
php artisan view:cache --no-ansi

echo "==> Installing Passport keys if not present..."
php artisan passport:keys --no-ansi || true

echo "==> Starting services..."
mkdir -p /var/log/supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
