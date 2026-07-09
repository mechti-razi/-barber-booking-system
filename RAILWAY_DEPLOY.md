# Railway Deployment Guide

Two services + one MySQL database on Railway.

---

## 1. Push your code to GitHub

Both folders need to be in Git. If you have a monorepo (both folders under one repo), that's fine.
Railway deploys from a Git branch — push everything first.

```bash
# from c:\Users\msi\OneDrive\Desktop\barbe
git add .
git commit -m "add railway deployment configs"
git push
```

---

## 2. Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Empty Project**

---

## 3. Add a MySQL database

Inside the project → **Add Service** → **Database** → **MySQL**

Once created, click the MySQL service and copy these from the **Connect** tab:
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

---

## 4. Deploy the Laravel API

1. **Add Service** → **GitHub Repo** → select your repo
2. If monorepo, set **Root Directory** to `barber-booking-api`
3. Railway detects the `Dockerfile` automatically
4. Go to **Variables** tab and add ALL of these:

```
APP_NAME=BarberBooking
APP_ENV=production
APP_KEY=base64:pUwkj6dK+WfC2xZZWhcxvD+5NbDdur8QNiaGo7gRUSM=
APP_DEBUG=false
APP_URL=https://<your-api-railway-domain>

DB_CONNECTION=mysql
DB_HOST=<from MySQL service>
DB_PORT=3306
DB_DATABASE=<from MySQL service>
DB_USERNAME=<from MySQL service>
DB_PASSWORD=<from MySQL service>

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
FILESYSTEM_DISK=local

LOG_CHANNEL=stderr
LOG_LEVEL=error

FRONTEND_URL=https://<your-frontend-railway-domain>

VAPID_PUBLIC_KEY=BI6LyW2lvA6yNNd4853RpKyNRrJlYqXhhh8YLiJRLwwGZZJ6QVpsKTYc375g2P-wKwhLoof7yohAlUjWllLr06s
VAPID_PRIVATE_KEY=d5XczPSplLRJdMyYAiYIpOEs-4i1TJf7PcQT_TDp5Xs
VAPID_SUBJECT=mailto:admin@barbershop.com
```

> **PORT** — Railway injects this automatically, nginx listens on 80 internally.

5. Click **Deploy** — the startup script runs migrations automatically.
6. After deploy, copy the Railway-assigned domain (e.g. `barber-booking-api-production.up.railway.app`)

---

## 5. Deploy the Angular Frontend

1. **Add Service** → **GitHub Repo** → same repo
2. If monorepo, set **Root Directory** to `barber-booking-web`
3. Go to **Variables** tab and add:

```
API_URL=https://<your-api-railway-domain>/api/v1
```

> This is the build argument — the Dockerfile injects it into `environment.prod.ts` at build time.

4. Click **Deploy**
5. Copy the Railway-assigned frontend domain

---

## 6. Update FRONTEND_URL in the API service

Go back to the **API service** → **Variables** → update:
```
FRONTEND_URL=https://<your-frontend-railway-domain>
APP_URL=https://<your-api-railway-domain>
```

Then **redeploy** the API so CORS picks up the new value.

---

## Summary of environment variables

### API Service
| Variable | Value |
|----------|-------|
| APP_ENV | production |
| APP_DEBUG | false |
| APP_KEY | (your existing key) |
| APP_URL | https://your-api.up.railway.app |
| DB_* | from Railway MySQL plugin |
| FRONTEND_URL | https://your-frontend.up.railway.app |
| VAPID_PUBLIC_KEY | (already generated) |
| VAPID_PRIVATE_KEY | (already generated) |
| VAPID_SUBJECT | mailto:admin@barbershop.com |
| LOG_CHANNEL | stderr |

### Frontend Service
| Variable | Value |
|----------|-------|
| API_URL | https://your-api.up.railway.app/api/v1 |

---

## After deploy — verify everything works

1. Open `https://your-api.up.railway.app/up` → should return `{"status":"up"}`
2. Open `https://your-frontend.up.railway.app` → Angular app loads
3. Log in → go to Profile → enable notifications → permission popup appears ✅
4. Push notifications work because Railway serves HTTPS automatically ✅
