import { WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { fetchOddsPapiSnapshot } from './oddsPapiService.js';
import { getSampleOpportunities } from './sampleOpportunityService.js';
import { persistOddsSnapshot } from './marketPersistenceService.js';
import { accessTokenFromRequest, authenticateSubscribedToken } from '../middleware/authMiddleware.js';

let latestSnapshot = createSnapshot();
let refreshTimer;
let refreshInFlight;

function bookmakerPolicy() {
  return {
    strategy: 'preferred-first-with-fallback',
    preferred: env.oddsPapi.preferredBookmakers,
    preferredMinimum: env.oddsPapi.preferredMinimum,
    fallback: env.oddsPapi.fallbackBookmakers
  };
}

function createSnapshot() {
  return {
    type: 'market.snapshot',
    capturedAt: new Date().toISOString(),
    opportunities: [],
    providerStatus: { provider: 'oddspapi', status: 'not-configured', bookmakerPolicy: bookmakerPolicy() },
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
    if (!env.oddsPapi.key) {
      latestSnapshot = {
        ...createSnapshot(),
        opportunities: getSampleOpportunities(),
        providerStatus: {
          provider: 'oddspapi',
          status: 'demo',
          message: 'Add ODDSPAPI_API_KEY to server/.env to receive live market data.',
          bookmakerPolicy: bookmakerPolicy()
        },
        persistence: { persisted: false, reason: env.dbEnabled ? 'provider-not-configured' : 'database-disabled' }
      };
      broadcast(webSocketServer);
      return latestSnapshot;
    }

    try {
      const oddsSnapshot = await fetchOddsPapiSnapshot();
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
        providerStatus: { ...oddsSnapshot, status: 'connected' },
        persistence
      };
    } catch (error) {
      latestSnapshot = {
        ...createSnapshot(),
        providerStatus: {
          provider: 'oddspapi',
          status: 'error',
          error: error.message,
          capturedAt: new Date().toISOString(),
          bookmakerPolicy: bookmakerPolicy()
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
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    path: '/ws/markets',
    verifyClient(info, done) {
      const token = accessTokenFromRequest(info.req);
      authenticateSubscribedToken(token)
        .then((user) => {
          if (!user) return done(false, 401, 'Active subscription required');
          info.req.user = user;
          return done(true);
        })
        .catch(() => done(false, 401, 'Active subscription required'));
    }
  });
  webSocketServer.on('connection', (socket) => {
    socket.send(JSON.stringify(latestSnapshot));
  });
  return webSocketServer;
}
