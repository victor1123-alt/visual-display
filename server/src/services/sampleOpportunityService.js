import { calculateArbitrage } from './arbitrageService.js';

const fixtures = [
  {
    id: 'sample-001',
    sport: 'Football',
    competition: 'Premier League',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    startsAt: '2026-09-22T16:30:00.000Z',
    market: 'Match Winner',
    outcomes: [
      { name: 'Arsenal', bookmaker: 'Bookmaker Alpha', odds: 2.25 },
      { name: 'Draw', bookmaker: 'Bookmaker Beta', odds: 3.6 },
      { name: 'Chelsea', bookmaker: 'Bookmaker Alpha', odds: 3.8 }
    ]
  }
];

export function getSampleOpportunities() {
  return fixtures.map((fixture) => ({
    ...fixture,
    arbitrage: calculateArbitrage(fixture.outcomes)
  })).filter((fixture) => fixture.arbitrage);
}
