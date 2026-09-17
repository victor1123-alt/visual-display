import { env } from '../config/env.js';

export function getHealth(_request, response) {
  response.json({
    status: 'ok',
    service: 'visualdisplay-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    storage: env.dbEnabled ? 'mysql' : 'in-memory',
    provider: 'the-odds-api',
    syncIntervalMs: env.syncIntervalMs
  });
}
