import { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { fetchOddsApiSnapshot } from './oddsApiService.js';
import { getSampleOpportunities } from './sampleOpportunityService.js';
import { persistOddsSnapshot } from './marketPersistenceService.js';

let latestSnapshot = createSnapshot();
let refreshTimer;
let refreshInFlight;

function createSnapshot() {
  return {
    type: 'market.snapshot',
    capturedAt: new Date().toISOString(),
    opportunities: [],
    oddsApi: { provider: 'the-odds-api', status: 'not-configured' },
    persistence: { persisted: false, reason: 'not-refreshed' }
  };
}

function broadcast(webSocketServer) {
  const message = JSON.stringify(latestSnapshot);
  webSocketServer?.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}

export function getLatestSnapshot() {
  return latestSnapshot;
}

export async function refreshSnapshot(webSocketServer) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    if (!env.oddsApi.key) {
      latestSnapshot = {
        ...createSnapshot(),
        opportunities: getSampleOpportunities(),
        oddsApi: {
          provider: 'the-odds-api',
          status: 'demo',
          message: 'Add ODDS_API_KEY to server/.env to receive live market data.'
        },
        persistence: { persisted: false, reason: env.dbEnabled ? 'provider-not-configured' : 'database-disabled' }
      };
      broadcast(webSocketServer);
      return latestSnapshot;
    }

    try {
      const oddsSnapshot = await fetchOddsApiSnapshot();
      let persistence = { persisted: false, reason: 'database-disabled' };

      if (env.dbEnabled) {
        try {
          persistence = await persistOddsSnapshot(oddsSnapshot);
        } catch (error) {
          persistence = { persisted: false, reason: 'persistence-error', error: error.message };
        }
      }

      latestSnapshot = {
        type: 'market.snapshot',
        capturedAt: oddsSnapshot.capturedAt,
        opportunities: oddsSnapshot.opportunities,
        oddsApi: { ...oddsSnapshot, status: 'connected' },
        persistence
      };
    } catch (error) {
      latestSnapshot = {
        ...createSnapshot(),
        oddsApi: {
          provider: 'the-odds-api',
          status: 'error',
          error: error.message,
          capturedAt: new Date().toISOString()
        }
      };
    }

    broadcast(webSocketServer);
    return latestSnapshot;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = undefined;
  }
}

export function startMarketSync(webSocketServer, intervalMs = env.syncIntervalMs) {
  const publish = () => refreshSnapshot(webSocketServer).catch((error) => {
    console.error(`Market refresh failed: ${error.message}`);
  });

  publish();
  refreshTimer = setInterval(publish, intervalMs);
  return () => clearInterval(refreshTimer);
}

export function createMarketWebSocketServer(httpServer) {
  const webSocketServer = new WebSocketServer({ server: httpServer, path: '/ws/markets' });
  webSocketServer.on('connection', (socket) => {
    socket.send(JSON.stringify(latestSnapshot));
  });
  return webSocketServer;
}
