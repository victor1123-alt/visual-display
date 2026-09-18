import { env } from '../config/env.js';
import { calculateArbitrage } from './arbitrageService.js';
import { isPreferredBookmaker, selectBookmakers } from './bookmakerSelectionService.js';

function buildOddsUrl() {
  const params = new URLSearchParams({
    regions: env.oddsApi.regions,
    markets: env.oddsApi.markets,
    oddsFormat: 'decimal',
    apiKey: env.oddsApi.key
  });
  return `https://api.the-odds-api.com/v4/sports/${env.oddsApi.sport}/odds?${params}`;
}

function normalizeEvent(event) {
  const selection = selectBookmakers(
    event.bookmakers,
    env.oddsApi.preferredBookmakers,
    env.oddsApi.preferredMinimum
  );
  const bestByOutcome = new Map();
  for (const bookmaker of selection.bookmakers) {
    const preferred = isPreferredBookmaker(bookmaker, env.oddsApi.preferredBookmakers);
    for (const market of bookmaker.markets || []) {
      if (market.key !== 'h2h') continue;
      for (const outcome of market.outcomes || []) {
        const price = Number(outcome.price);
        if (!outcome.name || !Number.isFinite(price) || price <= 1) continue;
        const current = bestByOutcome.get(outcome.name);
        if (!current || price > current.odds || (price === current.odds && preferred && !current.preferred)) bestByOutcome.set(outcome.name, {
          name: outcome.name, odds: price, bookmaker: bookmaker.title,
          bookmakerKey: bookmaker.key, updatedAt: bookmaker.last_update, preferred
        });
      }
    }
  }
  const outcomes = [...bestByOutcome.values()];
  const arbitrage = calculateArbitrage(outcomes);
  if (!arbitrage) return null;
  return {
    id: event.id, sport: event.sport_title, sportKey: event.sport_key, competition: event.sport_title,
    homeTeam: event.home_team, awayTeam: event.away_team,
    startsAt: event.commence_time, market: 'Match Winner', outcomes, arbitrage,
    bookmakerSelection: {
      mode: selection.mode,
      availableCount: selection.availableCount,
      selectedCount: selection.selectedCount,
      preferredAvailableCount: selection.preferredAvailableCount,
      preferredAvailable: selection.preferredAvailable,
      preferredMinimum: selection.preferredMinimum
    }
  };
}

export async function fetchOddsApiSnapshot() {
  if (!env.oddsApi.key) throw new Error('ODDS_API_KEY is not configured');
  const response = await fetch(buildOddsUrl(), { signal: AbortSignal.timeout(20000) });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The Odds API returned an unreadable response (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(payload.message || `The Odds API returned HTTP ${response.status}`);
  if (!Array.isArray(payload)) throw new Error('The Odds API returned an unexpected payload');

  const capturedAt = new Date().toISOString();
  const opportunities = payload
    .map(normalizeEvent)
    .filter(Boolean)
    .sort((left, right) => {
      const priorityDifference = Number(right.bookmakerSelection.mode === 'preferred') - Number(left.bookmakerSelection.mode === 'preferred');
      return priorityDifference || Number(right.arbitrage.margin) - Number(left.arbitrage.margin);
    });
  return {
    provider: 'the-odds-api', capturedAt,
    sport: env.oddsApi.sport,
    requestUsage: { remaining: response.headers.get('x-requests-remaining'), used: response.headers.get('x-requests-used') },
    events: payload, opportunities,
    eventCount: payload.length,
    bookmakerPolicy: {
      strategy: 'preferred-first-with-fallback',
      preferred: env.oddsApi.preferredBookmakers,
      preferredMinimum: env.oddsApi.preferredMinimum,
      fallback: 'all-bookmakers-returned-by-provider'
    }
  };
}
