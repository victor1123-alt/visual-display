# VisualDisplay

VisualDisplay is an odds comparison and arbitrage-monitoring application.
It uses React/Vite/Bootstrap on the client and Node.js/Express/Sequelize/MySQL
on the server.

## First setup

1. Run `npm.cmd run install:all`.
2. Create a MySQL database named `visualdisplay`.
3. Copy `server/.env.example` to `server/.env` and set the MySQL values.
4. Set `DB_ENABLED=true` and `DB_SYNC=true` for the first local run.
5. Run `npm.cmd run dev`.

For a UI-only demo, leave `DB_ENABLED=false` and `ODDS_API_KEY` empty. The
server will expose a clearly labelled sample opportunity without requiring
MySQL or an external provider.

## Odds provider

VisualDisplay uses The Odds API as its active odds provider. Set
`ODDS_API_KEY` in `server/.env`; the server refreshes API data and broadcasts
the normalized snapshot through `/ws/markets`.

The application uses The Odds API as its sole odds data source. Each live
refresh normalizes match-winner prices, calculates arbitrage, and persists
events, markets, bookmakers, and historical odds through Sequelize when the
database is enabled.

The frontend runs at `http://localhost:5173` and the API at
`http://localhost:5000`.

When `DB_ENABLED=false`, the API starts without requiring MySQL. Keep
`DB_SYNC=false` after the initial development setup; migrations will replace
automatic synchronization as the schema matures.

## API surface

- `GET /api/health` — service health check.
- `GET /api/opportunities?minMargin=1&limit=20` — ranked arbitrage opportunities.
- `GET /api/opportunities/:id` — one opportunity by event id.
- `GET /api/markets` — latest normalized snapshot and provider status.
- `POST /api/markets/sync` — trigger an immediate market refresh.
- `GET /api/catalog/sports`, `/api/catalog/bookmakers`, `/api/catalog/events` — persisted Sequelize catalog data when MySQL is enabled.
- WebSocket `/ws/markets` — receives the latest snapshot and refresh broadcasts.
