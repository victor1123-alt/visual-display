import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  port: toPositiveNumber(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dbEnabled: toBoolean(process.env.DB_ENABLED, false),
  dbSync: toBoolean(process.env.DB_SYNC, false),
  syncIntervalMs: toPositiveNumber(process.env.SYNC_INTERVAL_MS, 15000),
  oddsApi: {
    key: process.env.ODDS_API_KEY || '',
    sport: process.env.ODDS_API_SPORT || 'soccer_epl',
    regions: process.env.ODDS_API_REGIONS || 'uk,eu',
    markets: process.env.ODDS_API_MARKETS || 'h2h'
  },
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toPositiveNumber(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'visualdisplay',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  }
};
