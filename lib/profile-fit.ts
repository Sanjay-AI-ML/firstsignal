import type { Profile } from './data';

export type FitSignal = { label: string; status: 'aligned' | 'different' | 'unknown'; explanation: string };

export function profileFit(startup: Profile, investor: Profile): FitSignal[] {
  const preferences = (values: string[] | undefined, fallback: string) => values?.length ? values : fallback ? [fallback] : [];
  const compare = (label: string, value: string, accepted: string[]): FitSignal => ({
    label,
    status: !value || !accepted.length || value === 'Other' || accepted.includes('Other') ? 'unknown' : accepted.includes(value) ? 'aligned' : 'different',
    explanation: `${value || 'Not specified'} · Investor interests: ${accepted.join(', ') || 'Not specified'}`,
  });
  const range = investor.checkRangeINR;
  const validRange = range?.length === 2 && range.every(n => Number.isFinite(n) && n > 0) && range[0] <= range[1];
  const amount = startup.fundingIntentINR;
  return [
    compare('Sector', startup.sector, preferences(investor.sectors, investor.sector)),
    compare('Product stage', startup.stage, preferences(investor.stages, investor.stage)),
    { label: 'Planning budget', status: !validRange || !(amount > 0) ? 'unknown' : amount >= range![0] && amount <= range![1] ? 'aligned' : 'different', explanation: validRange ? `Founder planning budget ${amount.toLocaleString('en-IN')} INR · Indicative investor range ${range![0].toLocaleString('en-IN')}–${range![1].toLocaleString('en-IN')} INR. A planning budget is not necessarily a fundraising target.` : 'Investor has not provided a check range. A single indicative check size is not a minimum or maximum.' },
    { label: 'Evidence expectations', status: 'unknown', explanation: investor.requiredEvidence || investor.validation || 'Ask which evidence the investor needs. Evidence quality is not automatically assessed.' },
    { label: 'Geography and availability', status: 'unknown', explanation: 'City does not establish geographic eligibility or availability. Confirm both before requesting an introduction.' },
  ];
}
