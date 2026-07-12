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

echo "==> Checking Passport personal access client..."
CLIENT_COUNT=$(php artisan tinker --execute="echo DB::table('oauth_clients')->whereJsonContains('grant_types', 'personal_access')->count();" --no-ansi 2>/dev/null || echo "0")
if [ "$CLIENT_COUNT" = "0" ] || [ -z "$CLIENT_COUNT" ]; then
  echo "==> Creating Passport personal access client..."
  php artisan passport:client --personal --name="Personal Access Client" --no-interaction --no-ansi || true
else
  echo "==> Passport personal access client exists."
fi

echo "==> Checking if database needs seeding..."
USER_COUNT=$(php artisan tinker --execute="echo App\Models\User::count();" --no-ansi 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "==> Database is empty. Seeding sample data..."
  php artisan db:seed --force --no-ansi || true
else
  echo "==> Database already has $USER_COUNT users. Skipping seed."
fi

echo "==> Starting services..."
mkdir -p /var/log/supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
