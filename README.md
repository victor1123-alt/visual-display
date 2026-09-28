# VisualDisplay

VisualDisplay is an odds comparison and arbitrage-monitoring application.
It uses React/Vite/Bootstrap on the client and Node.js/Express/Sequelize/MySQL
on the server.

## First setup

1. Run `npm.cmd run install:all`.
2. Create a MySQL database named `visualdisplay`.
3. Copy `server/.env.example` to `server/.env` and set the MySQL values.
4. Set `DB_ENABLED=true` and `DB_SYNC=true` for the first local run.
5. Set long random values for `JWT_SECRET` and `ADMIN_API_KEY`.
6. Run `npm.cmd run dev`.

For a public-page UI demo, leave `DB_ENABLED=false`. Account and subscriber
data routes will intentionally return `503` because authentication cannot be
verified without the database. To test the full member flow with sample odds,
enable MySQL and leave `ODDSPAPI_API_KEY` empty.

## Odds provider

VisualDisplay uses OddsPapi v4 as its active odds provider. Set
`ODDSPAPI_API_KEY` in `server/.env`; the server refreshes API data and broadcasts
the normalized snapshot through `/ws/markets`.

The application uses OddsPapi as its sole odds data source. Each live
refresh normalizes match-winner prices, calculates arbitrage, and persists
events, markets, bookmakers, and historical odds through Sequelize when the
database is enabled.

Bookmakers are selected with a Nigeria-first policy. If at least
`ODDSPAPI_PREFERRED_MIN_COUNT` preferred bookmakers are present on an event,
only those bookmakers are used for its arbitrage calculation. Otherwise the
server requests the configured fallback bookmakers. Configure the priority
list with `ODDSPAPI_PREFERRED_BOOKMAKERS` and the fallback list with
`ODDSPAPI_FALLBACK_BOOKMAKERS`, using comma-separated OddsPapi bookmaker slugs.
OddsPapi currently lists both `sportybet` and `1xbet`; availability can still
vary by tournament and fixture.

The frontend runs at `http://localhost:5173` and the API at
`http://localhost:5000`.

When `DB_ENABLED=false`, the API starts without requiring MySQL. Keep
`DB_SYNC=false` after the initial development setup; migrations will replace
automatic synchronization as the schema matures.

## API surface

- `GET /api/health` — service health check.
- `POST /api/auth/register` — create a database-backed account and pending subscription.
- `POST /api/auth/login` and `POST /api/auth/logout` — create or clear the secure HTTP-only session.
- `GET /api/auth/me` — return the authenticated account and subscription state.
- `GET /api/subscriptions` and `POST /api/subscriptions/request` — inspect or request a subscription for the authenticated account.
- `POST /api/subscriptions/admin/activate` — activate a valid account using the private `x-admin-key` header.
- `GET /api/opportunities?minMargin=1&limit=20` — ranked arbitrage opportunities.
- `GET /api/opportunities?bookmakerMode=preferred` — opportunities calculated only from enough Nigeria-priority bookmakers; use `fallback` to inspect global fallback results.
- `GET /api/opportunities/:id` — one opportunity by event id.
- `GET /api/markets` — latest normalized snapshot and provider status.
- `POST /api/markets/sync` — trigger an immediate market refresh.
- `GET /api/catalog/sports`, `/api/catalog/bookmakers`, `/api/catalog/events` — persisted Sequelize catalog data when MySQL is enabled.
- WebSocket `/ws/markets` — receives the latest snapshot and refresh broadcasts.

All opportunity, market, catalog, and WebSocket data requires both an
authenticated account and a currently active subscription. The health and
authentication routes remain public. Browser sessions use a signed JWT in an
HTTP-only, secure cookie.

Subscriptions begin in `pending` state. Until a payment provider is connected,
activate a verified account manually with:

```bash
curl -X POST https://YOUR_DOMAIN/api/subscriptions/admin/activate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"email":"member@example.com","durationDays":30,"reference":"payment-reference"}'
```

## Railway deployment

This repository is configured as a single Railway service: the build creates
the React bundle, Express serves `client/dist`, and `npm start` runs the API.
Railway can use the included `railway.json` configuration directly.

Set `ODDSPAPI_API_KEY` for live data. If you attach Railway MySQL, set
`DB_ENABLED=true`; the server understands Railway's `MYSQLHOST`, `MYSQLPORT`,
`MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQL_URL` variables.
The app now enables the database automatically when `MYSQL_URL` or `MYSQLHOST`
is available, although setting `DB_ENABLED=true` explicitly is recommended.
In the web service's Railway Variables tab, add `MYSQL_URL` as a reference to
the MySQL service's `MYSQL_URL`; database-service variables are not inherited
by the web service automatically.
Set `JWT_SECRET` to a long random secret and `ADMIN_API_KEY` to a separate long
random value. Never expose either value through a `VITE_` variable or commit
them to the repository.
Set `ODDSPAPI_TOURNAMENT_IDS=17,8` for Premier League and LaLiga,
`ODDSPAPI_PREFERRED_BOOKMAKERS` to the preferred comma-separated list, and
`ODDSPAPI_PREFERRED_MIN_COUNT=2` to require two preferred bookmakers before
skipping the configured fallback books. A 60-second sync interval is the
default because OddsPapi enforces endpoint cooldowns.
Set `DB_SYNC=true` only for the first schema creation, then turn it off.
`DB_REQUIRED=false` keeps the web service available in in-memory mode if the
database is temporarily unavailable.
