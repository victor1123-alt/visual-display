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

function toList(value, fallback = '') {
  return String(value || fallback)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const hasDatabaseConfiguration = Boolean(
  process.env.MYSQL_URL
  || process.env.MYSQLHOST
  || process.env.DB_HOST
);

export const env = {
  port: toPositiveNumber(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dbEnabled: toBoolean(process.env.DB_ENABLED, hasDatabaseConfiguration),
  dbRequired: toBoolean(process.env.DB_REQUIRED, false),
  dbSync: toBoolean(process.env.DB_SYNC, false),
  syncIntervalMs: toPositiveNumber(process.env.SYNC_INTERVAL_MS, 60000),
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminApiKey: process.env.ADMIN_API_KEY || ''
  },
  oddsPapi: {
    key: process.env.ODDSPAPI_API_KEY || '',
    sportId: toPositiveNumber(process.env.ODDSPAPI_SPORT_ID, 10),
    tournamentIds: toList(process.env.ODDSPAPI_TOURNAMENT_IDS, '17,8'),
    marketId: String(process.env.ODDSPAPI_MARKET_ID || '101'),
    preferredBookmakers: toList(
      process.env.ODDSPAPI_PREFERRED_BOOKMAKERS,
      'betninja,betking,sportybet,bet9ja,nairabet,merrybet,1xbet'
    ),
    preferredMinimum: toPositiveNumber(process.env.ODDSPAPI_PREFERRED_MIN_COUNT, 2),
    fallbackBookmakers: toList(process.env.ODDSPAPI_FALLBACK_BOOKMAKERS, 'pinnacle,bet365,betway')
  },
  database: {
    url: process.env.MYSQL_URL || '',
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: toPositiveNumber(process.env.DB_PORT || process.env.MYSQLPORT, 3306),
    name: process.env.DB_NAME || process.env.MYSQLDATABASE || 'visualdisplay',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || ''
  }
};
