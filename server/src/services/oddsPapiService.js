import { env } from '../config/env.js';
import { calculateArbitrage } from './arbitrageService.js';
import { isPreferredBookmaker, selectBookmakers } from './bookmakerSelectionService.js';

const API_BASE_URL = 'https://api.oddspapi.io/v4';
const REQUEST_COOLDOWN_MS = 1100;
let bookmakerCatalog;

function providerUrl(path, parameters = {}) {
  const url = new URL(`${API_BASE_URL}/${path}`);
  url.searchParams.set('apiKey', env.oddsPapi.key);
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function readProviderResponse(response, label) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`OddsPapi returned an unreadable response for ${label} (HTTP ${response.status})`);
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    const error = new Error(`OddsPapi ${label} request failed: ${message}`);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

async function fetchBookmakerCatalog() {
  if (bookmakerCatalog) return bookmakerCatalog;
  const response = await fetch(providerUrl('bookmakers'), { signal: AbortSignal.timeout(20000) });
  const payload = await readProviderResponse(response, 'bookmakers');
  bookmakerCatalog = new Map((Array.isArray(payload) ? payload : []).map((bookmaker) => [
    String(bookmaker.slug || '').toLowerCase(),
    bookmaker.bookmakerName || bookmaker.slug
  ]));
  return bookmakerCatalog;
}

function pause() {
  return new Promise((resolve) => setTimeout(resolve, REQUEST_COOLDOWN_MS));
}

async function fetchBookmakerOdds(bookmaker) {
  const response = await fetch(providerUrl('odds-by-tournaments', {
    tournamentIds: env.oddsPapi.tournamentIds.join(','),
    bookmaker,
    language: 'en',
    verbosity: 3,
    oddsFormat: 'decimal'
  }), { signal: AbortSignal.timeout(30000) });

  try {
    const payload = await readProviderResponse(response, `${bookmaker} odds`);
    return { bookmaker, fixtures: Array.isArray(payload) ? payload : [], error: null };
  } catch (error) {
    if (error.status === 400 && error.code === 'INVALID_PARAMETER') {
      return { bookmaker, fixtures: [], error: error.message };
    }
    throw error;
  }
}

async function fetchBookmakerGroup(bookmakers) {
  const results = [];
  for (const bookmaker of bookmakers) {
    results.push(await fetchBookmakerOdds(bookmaker));
    await pause();
  }
  return results;
}

function bestActivePlayer(outcome) {
  const players = Object.values(outcome?.players || {}).filter((player) => player?.active !== false);
  return players.find((player) => player.mainLine) || players[0] || null;
}

function canonicalBookmaker(fixture, slug, title) {
  const rawBookmaker = fixture.bookmakerOdds?.[slug];
  const rawMarket = rawBookmaker?.markets?.[env.oddsPapi.marketId];
  if (!rawBookmaker || rawBookmaker.bookmakerIsActive === false || rawBookmaker.suspended || !rawMarket || rawMarket.marketActive === false) return null;

  const outcomeNames = {
    101: fixture.participant1Name || 'Home',
    102: 'Draw',
    103: fixture.participant2Name || 'Away'
  };
  const outcomes = Object.entries(rawMarket.outcomes || {}).map(([outcomeId, outcome]) => {
    const player = bestActivePlayer(outcome);
    const price = Number(player?.price);
    if (!outcomeNames[outcomeId] || !Number.isFinite(price) || price <= 1) return null;
    return { name: outcomeNames[outcomeId], price };
  }).filter(Boolean);
  if (outcomes.length !== 3) return null;

  return {
    key: slug,
    title: title || slug,
    last_update: fixture.updatedAt,
    markets: [{ key: 'h2h', outcomes }]
  };
}

function mergeProviderResults(results, catalog) {
  const fixtures = new Map();
  for (const result of results) {
    for (const fixture of result.fixtures) {
      const existing = fixtures.get(fixture.fixtureId) || { ...fixture, bookmakers: [] };
      const bookmaker = canonicalBookmaker(fixture, result.bookmaker, catalog.get(result.bookmaker));
      if (bookmaker) existing.bookmakers.push(bookmaker);
      fixtures.set(fixture.fixtureId, existing);
    }
  }
  return [...fixtures.values()].map((fixture) => ({
    id: fixture.fixtureId,
    sport_title: fixture.sportName || `Sport ${fixture.sportId}`,
    sport_key: `oddspapi-${fixture.sportId}`,
    competition: fixture.tournamentName || fixture.tournamentSlug || `Tournament ${fixture.tournamentId}`,
    home_team: fixture.participant1Name || 'Home team',
    away_team: fixture.participant2Name || 'Away team',
    commence_time: fixture.startTime,
    completed: Number(fixture.statusId) === 2,
    bookmakers: fixture.bookmakers
  })).filter((fixture) => fixture.bookmakers.length > 0);
}

function normalizeEvent(event) {
  const selection = selectBookmakers(event.bookmakers, env.oddsPapi.preferredBookmakers, env.oddsPapi.preferredMinimum);
  const bestByOutcome = new Map();
  for (const bookmaker of selection.bookmakers) {
    const preferred = isPreferredBookmaker(bookmaker, env.oddsPapi.preferredBookmakers);
    for (const market of bookmaker.markets || []) {
      if (market.key !== 'h2h') continue;
      for (const outcome of market.outcomes || []) {
        const price = Number(outcome.price);
        if (!outcome.name || !Number.isFinite(price) || price <= 1) continue;
        const current = bestByOutcome.get(outcome.name);
        if (!current || price > current.odds || (price === current.odds && preferred && !current.preferred)) {
          bestByOutcome.set(outcome.name, {
            name: outcome.name,
            odds: price,
            bookmaker: bookmaker.title,
            bookmakerKey: bookmaker.key,
            updatedAt: bookmaker.last_update,
            preferred
          });
        }
      }
    }
  }
  const outcomes = [...bestByOutcome.values()];
  const arbitrage = calculateArbitrage(outcomes);
  if (!arbitrage) return null;
  return {
    id: event.id,
    sport: event.sport_title,
    sportKey: event.sport_key,
    competition: event.competition,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    startsAt: event.commence_time,
    market: 'Full Time Result',
    outcomes,
    arbitrage,
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

export async function fetchOddsPapiSnapshot() {
  if (!env.oddsPapi.key) throw new Error('ODDSPAPI_API_KEY is not configured');
  const catalog = await fetchBookmakerCatalog();
  const preferredSupported = env.oddsPapi.preferredBookmakers.filter((slug) => catalog.has(slug));
  const preferredResults = await fetchBookmakerGroup(preferredSupported);
  const preferredWithCoverage = preferredResults.filter((result) => result.fixtures.length > 0).length;
  const fallbackResults = preferredWithCoverage >= env.oddsPapi.preferredMinimum
    ? []
    : await fetchBookmakerGroup(env.oddsPapi.fallbackBookmakers.filter((slug) => catalog.has(slug)));
  const requestResults = [...preferredResults, ...fallbackResults];
  const events = mergeProviderResults(requestResults, catalog);
  const capturedAt = new Date().toISOString();
  const opportunities = events.map(normalizeEvent).filter(Boolean).sort((left, right) => {
    const priorityDifference = Number(right.bookmakerSelection.mode === 'preferred') - Number(left.bookmakerSelection.mode === 'preferred');
    return priorityDifference || Number(right.arbitrage.margin) - Number(left.arbitrage.margin);
  });

  return {
    provider: 'oddspapi',
    capturedAt,
    sportId: env.oddsPapi.sportId,
    tournamentIds: env.oddsPapi.tournamentIds,
    events,
    opportunities,
    eventCount: events.length,
    bookmakerCoverage: requestResults.map((result) => ({
      bookmaker: result.bookmaker,
      fixtureCount: result.fixtures.length,
      available: result.fixtures.length > 0,
      error: result.error
    })),
    bookmakerPolicy: {
      strategy: 'preferred-first-with-fallback',
      preferred: env.oddsPapi.preferredBookmakers,
      preferredMinimum: env.oddsPapi.preferredMinimum,
      fallback: env.oddsPapi.fallbackBookmakers
    }
  };
}
