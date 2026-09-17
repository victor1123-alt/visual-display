export function calculateArbitrage(outcomes, totalStake = 100) {
  if (!Array.isArray(outcomes) || outcomes.length < 2 || !Number.isFinite(Number(totalStake)) || Number(totalStake) <= 0) return null;

  const validOutcomes = outcomes.filter((outcome) => Number.isFinite(Number(outcome?.odds)) && Number(outcome.odds) > 1);
  if (validOutcomes.length !== outcomes.length) return null;

  const impliedProbability = validOutcomes.reduce(
    (total, outcome) => total + (1 / Number(outcome.odds)),
    0
  );

  const margin = (1 - impliedProbability) * 100;
  if (margin <= 0) return null;

  return {
    margin: Number(margin.toFixed(2)),
    impliedProbability: Number(impliedProbability.toFixed(6)),
    totalStake: Number(Number(totalStake).toFixed(2)),
    totalReturn: Number((Number(totalStake) / impliedProbability).toFixed(2)),
    profit: Number((Number(totalStake) * margin / 100 / impliedProbability).toFixed(2)),
    stakes: validOutcomes.map((outcome) => ({
      outcome: outcome.name,
      bookmaker: outcome.bookmaker,
      odds: Number(Number(outcome.odds).toFixed(3)),
      stake: Number(((Number(totalStake) / Number(outcome.odds)) / impliedProbability).toFixed(2)),
      return: Number((Number(totalStake) / impliedProbability).toFixed(2))
    }))
  };
}
