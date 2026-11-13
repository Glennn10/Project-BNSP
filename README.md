# BookSales

BookSales is a Laravel 12 API and React storefront for browsing books, managing a cart, placing orders, and administering the catalog. In development, Laravel serves the app and API while Vite serves the frontend assets.

## Requirements

- PHP 8.2 or newer and Composer
- Node.js 20.19+ or 22.12+ and npm
- SQLite (included with PHP) or a configured MySQL database

## Local setup (Windows PowerShell)

Run these commands from the project directory:

```powershell
composer install
npm ci

if (!(Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
if (!(Test-Path database\database.sqlite)) { New-Item -ItemType File database\database.sqlite }

php artisan migrate --seed
php artisan storage:link
```

The sample environment uses SQLite. For MySQL, set `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env` before running the migrations.

Start the application in two terminals:

```powershell
# Terminal 1: Laravel backend and web app
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
# Terminal 2: Vite frontend assets
npm run dev
```

Open **http://localhost:8000** in the browser. The Vite address (usually `http://localhost:5173`) serves development assets; it is not the application URL. Since the built SPA and API share the Laravel origin, the default API base URL is `/api`. If you host the frontend on a separate origin, set `VITE_API_BASE_URL` and add that origin to `CORS_ALLOWED_ORIGINS`.

To build frontend assets for a production deployment, run:

```powershell
npm run build
```

Set `APP_ENV=production` and `APP_DEBUG=false`, configure production secrets and the database, then run `php artisan migrate --force` as part of deployment. Do not use demo credentials or seed demo accounts in production; demo account seeders only run in the `local` and `testing` environments.

## Development demo accounts

The local/testing seed creates these accounts. Override their names, email addresses, or passwords using the corresponding `SEED_ADMIN_*` and `SEED_CUSTOMER_*` variables in `.env`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@booksales.test` | `BookSalesDev!2026` |
| Customer | `customer@booksales.test` | `BookSalesDev!2026` |

These are development-only credentials. Change them for shared environments and never enable demo seeding in production.

## API overview

- `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/user`
- Public catalog: `GET /api/books`, `/api/genres`, `/api/authors`
- Customer orders: `POST /api/transactions`, `GET /api/transactions`
- Admin catalog and order management: `/api/admin/*` plus protected catalog write endpoints

Protected API requests use a Sanctum bearer token. Customers can manage only their own pending orders; administrators manage catalog records and order statuses from `/admin`.

## Midtrans Snap Sandbox

The checkout uses Midtrans Snap. To enable payments locally, add the Sandbox keys from your Midtrans merchant account to `.env`:

```dotenv
MIDTRANS_SERVER_KEY=SB-Mid-server-your-key
MIDTRANS_CLIENT_KEY=SB-Mid-client-your-key
MIDTRANS_IS_PRODUCTION=false
```

Keep the Server Key private and never commit `.env`. Restart Laravel after changing these values. The payment notification endpoint is `/api/payments/midtrans/notification`; Midtrans must be able to reach it, so `localhost` alone is not sufficient. For local testing, expose port `8000` through a trusted HTTPS tunnel and configure the resulting public URL with `/api/payments/midtrans/notification` as the Payment Notification URL in the Midtrans dashboard.

Orders remain pending until Midtrans sends a verified payment notification. A confirmed settlement marks the order paid; an expired or cancelled payment cancels the order and restores its reserved stock. Admins can cancel a pending Snap payment through Midtrans, but paid orders require a refund before cancellation.

## Tests

```powershell
php artisan test --compact
npm run build
```
