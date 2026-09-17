import { getLatestSnapshot, refreshSnapshot } from '../services/marketSyncService.js';

export function getMarketSnapshot(_request, response) {
  const snapshot = getLatestSnapshot();
  return response.json({
    data: snapshot,
    meta: {
      totalOpportunities: snapshot.opportunities.length,
      capturedAt: snapshot.capturedAt,
      providerStatus: snapshot.oddsApi,
      persistence: snapshot.persistence
    }
  });
}

export async function syncMarkets(_request, response, next) {
  try {
    const snapshot = await refreshSnapshot();
    return response.json({
      data: snapshot,
      meta: {
        totalOpportunities: snapshot.opportunities.length,
        capturedAt: snapshot.capturedAt,
        providerStatus: snapshot.oddsApi,
        persistence: snapshot.persistence
      }
    });
  } catch (error) {
    return next(error);
  }
}
