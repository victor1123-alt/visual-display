import { getLatestSnapshot } from '../services/marketSyncService.js';

function toLimit(value) {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
}

export function listOpportunities(request, response) {
  const snapshot = getLatestSnapshot();
  const minimumMargin = Number(request.query.minMargin || 0);
  const opportunities = snapshot.opportunities
    .filter((opportunity) => !request.query.sport || opportunity.sport === request.query.sport || opportunity.sportKey === request.query.sport)
    .filter((opportunity) => !request.query.bookmakerMode || opportunity.bookmakerSelection?.mode === request.query.bookmakerMode)
    .filter((opportunity) => !Number.isFinite(minimumMargin) || Number(opportunity.arbitrage?.margin || 0) >= minimumMargin)
    .sort((left, right) => {
      const priorityDifference = Number(right.bookmakerSelection?.mode === 'preferred') - Number(left.bookmakerSelection?.mode === 'preferred');
      return priorityDifference || Number(right.arbitrage?.margin || 0) - Number(left.arbitrage?.margin || 0);
    })
    .slice(0, toLimit(request.query.limit));

  response.json({
    data: opportunities,
    meta: {
      total: opportunities.length,
      capturedAt: snapshot.capturedAt,
      source: snapshot.oddsApi?.provider || 'the-odds-api',
      providerStatus: snapshot.oddsApi,
      bookmakerPolicy: snapshot.oddsApi?.bookmakerPolicy,
      persistence: snapshot.persistence
    }
  });
}

export function getOpportunity(request, response) {
  const snapshot = getLatestSnapshot();
  const opportunity = snapshot.opportunities.find((item) => item.id === request.params.id);

  if (!opportunity) {
    return response.status(404).json({ message: 'Opportunity not found' });
  }

  return response.json({ data: opportunity, meta: { capturedAt: snapshot.capturedAt } });
}
