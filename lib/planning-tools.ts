/** Local arithmetic scenarios. No valuation, verified review or commitments. */
export type FundingMode = 'cap-discount' | 'cap-only' | 'discount-only';
export type FundingInputs = { mode: FundingMode; investmentINR: number; capINR: number; discountPercent: number; nextRoundPriceINR: number; fullyDilutedShares: number };
export function fundingScenario(input: FundingInputs) {
  const usesCap = input.mode !== 'discount-only', usesDiscount = input.mode !== 'cap-only';
  if (!['cap-discount', 'cap-only', 'discount-only'].includes(input.mode)
    || ![input.investmentINR, input.fullyDilutedShares].every(value => Number.isFinite(value) && value > 0)
    || usesCap && (!Number.isFinite(input.capINR) || input.capINR <= 0)
    || usesDiscount && (!Number.isFinite(input.nextRoundPriceINR) || input.nextRoundPriceINR <= 0)
    || usesDiscount && (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent >= 100)) return null;
  const capPrice = usesCap ? input.capINR / input.fullyDilutedShares : null;
  const discountPrice = usesDiscount ? input.nextRoundPriceINR * (1 - input.discountPercent / 100) : null;
  const conversionPrice = Math.min(capPrice ?? Infinity, discountPrice ?? Infinity);
  const newShares = input.investmentINR / conversionPrice;
  const illustrativeOwnership = newShares / (input.fullyDilutedShares + newShares) * 100;
  if (![conversionPrice, newShares, illustrativeOwnership].every(Number.isFinite) || conversionPrice <= 0) return null;
  return { capPrice, discountPrice, conversionPrice, newShares, illustrativeOwnership };
}

export type AllocationTier = { amountINR: number; count: number };
export function allocationScenario(targetINR: number, leadINR: number, tiers: readonly AllocationTier[]) {
  if (!Number.isFinite(targetINR) || targetINR <= 0 || !Number.isFinite(leadINR) || leadINR < 0
    || !tiers.every(tier => Number.isFinite(tier.amountINR) && tier.amountINR >= 0 && Number.isSafeInteger(tier.count) && tier.count >= 0)) return null;
  const additionalINR = tiers.reduce((sum, tier) => sum + tier.amountINR * tier.count, 0);
  const totalINR = leadINR + additionalINR, additionalSlots = tiers.reduce((sum, tier) => sum + tier.count, 0), differenceINR = targetINR - totalINR;
  if (![additionalINR, totalINR, additionalSlots, differenceINR, totalINR / targetINR].every(Number.isFinite)) return null;
  return { additionalINR, totalINR, additionalSlots, slots: additionalSlots + (leadINR > 0 ? 1 : 0), differenceINR, percent: totalINR / targetINR * 100, status: differenceINR > 0 ? 'under' as const : differenceINR < 0 ? 'over' as const : 'equal' as const };
}

export type FounderContribution = { id: string; name: string; role: string; ideaGenesis: number; timeCommitment: number; technicalExecution: number; domainNetwork: number; cashContributed: number };
export function nextFounderId(founders: readonly { id: string }[]) {
  const used = new Set(founders.map(founder => founder.id)); let index = 1;
  while (used.has(`f${index}`)) index++;
  return `f${index}`;
}

/** Arbitrary disclosed weighting, not a recommendation about a fair split.
 * Largest-remainder rounding keeps displayed founder+reserve units at100%. */
export function founderAllocation(founders: readonly FounderContribution[], poolPercent: number) {
  if (!founders.length || !Number.isFinite(poolPercent) || poolPercent < 0 || poolPercent > 100 || Math.abs(poolPercent * 10 - Math.round(poolPercent * 10)) > .000001
    || new Set(founders.map(founder => founder.id)).size !== founders.length
    || !founders.every(founder => [founder.ideaGenesis, founder.timeCommitment, founder.technicalExecution, founder.domainNetwork].every(value => Number.isFinite(value) && value >= 0 && value <= 100)
      && Number.isFinite(founder.cashContributed) && founder.cashContributed >= 0)) return null;
  const scores = founders.map(founder => Math.max(1, founder.ideaGenesis * .2 + founder.timeCommitment * .35 + founder.technicalExecution * .25 + Math.min(20, founder.domainNetwork * .12 + founder.cashContributed / 500000 * 8)));
  const total = scores.reduce((sum, score) => sum + score, 0), availableUnits = Math.round((100 - poolPercent) * 10);
  const rawUnits = scores.map(score => score / total * availableUnits), units = rawUnits.map(Math.floor);
  const remaining = availableUnits - units.reduce((sum, value) => sum + value, 0);
  const rank = rawUnits.map((value, index) => ({ index, fraction: value - units[index] })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index++) units[rank[index].index]++;
  return founders.map((founder, index) => ({ ...founder, calculatedEquity: units[index] / 10 }));
}

export function vestingFraction(month: number, totalMonths: number, cliffMonths: number) {
  if (![month, totalMonths, cliffMonths].every(Number.isFinite) || month < 0 || totalMonths <= 0 || cliffMonths < 0 || cliffMonths > totalMonths) return null;
  return month < cliffMonths ? 0 : Math.min(1, month / totalMonths);
}
