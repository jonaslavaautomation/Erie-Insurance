/*
 * State auto requirements for ERIE's operating states (BI per person / per accident, PD, in $1,000s).
 * Sources: state insurance department and DMV guidance as summarized by carinsurance.com, moneygeek.com,
 * cnbc.com and tn.gov (TCA 55-12-102), checked October 2026. North Carolina's 50/100/50 applies to
 * policies issued or renewed on or after July 1, 2025 (S.L. 2023-133); Virginia's 50/100/25 took
 * effect January 1, 2025.
 */

export type StateRule = {
  name: string;
  bi: [number, number];
  pd: number;
  // Uninsured motorists bodily injury that must be carried (null = must be offered, may be rejected).
  umRequired: [number, number] | null;
  // Underinsured motorists: required, or must be offered.
  uimRequired: boolean;
  // First-party medical / no-fault benefits that must be carried.
  firstParty?: { label: string; amount: number; waivable?: boolean };
  // Wisconsin includes $1,000 medical payments unless rejected in writing.
  medPayDefault?: string;
  // Pennsylvania: full or limited tort election.
  tortOption?: boolean;
  noFault?: boolean;
};

export const STATE_RULES: Record<string, StateRule> = {
  PA: { name: 'Pennsylvania', bi: [15, 30], pd: 5, umRequired: null, uimRequired: false, firstParty: { label: 'First Party Benefits (medical) — $5,000', amount: 5000 }, tortOption: true, noFault: true },
  OH: { name: 'Ohio', bi: [25, 50], pd: 25, umRequired: null, uimRequired: false },
  WI: { name: 'Wisconsin', bi: [25, 50], pd: 10, umRequired: [25, 50], uimRequired: false, medPayDefault: '1,000' },
  IL: { name: 'Illinois', bi: [25, 50], pd: 20, umRequired: [25, 50], uimRequired: true },
  IN: { name: 'Indiana', bi: [25, 50], pd: 25, umRequired: null, uimRequired: false },
  KY: { name: 'Kentucky', bi: [25, 50], pd: 25, umRequired: null, uimRequired: false, firstParty: { label: 'Personal Injury Protection (basic reparation benefits) — $10,000', amount: 10000 }, noFault: true },
  MD: { name: 'Maryland', bi: [30, 60], pd: 15, umRequired: [30, 60], uimRequired: true, firstParty: { label: 'Personal Injury Protection — $2,500', amount: 2500, waivable: true } },
  NC: { name: 'North Carolina', bi: [50, 100], pd: 50, umRequired: [50, 100], uimRequired: true },
  TN: { name: 'Tennessee', bi: [25, 50], pd: 25, umRequired: null, uimRequired: false },
  VA: { name: 'Virginia', bi: [50, 100], pd: 25, umRequired: [50, 100], uimRequired: true },
  WV: { name: 'West Virginia', bi: [25, 50], pd: 25, umRequired: [25, 50], uimRequired: false },
  NY: { name: 'New York', bi: [25, 50], pd: 10, umRequired: [25, 50], uimRequired: false, firstParty: { label: 'Personal Injury Protection (no-fault) — $50,000', amount: 50000 }, noFault: true },
  DC: { name: 'District of Columbia', bi: [25, 50], pd: 10, umRequired: [25, 50], uimRequired: false },
};

export const ruleFor = (state: string): StateRule => STATE_RULES[state] ?? STATE_RULES.OH;

/** Split limit "250/500" → [250, 500] (thousands); "500 CSL" → [500, 500]. */
export function splitLimit(v: string): [number, number] {
  if (v.includes('CSL')) { const n = Number(v.replace(/\D/g, '')); return [n, n]; }
  const [a, b] = v.split('/').map(Number);
  return [a || 0, b || 0];
}
export const pdThousands = (v: string) => Number(v.replace(/\D/g, '')) / 1000;
export const meetsBi = (v: string, min: [number, number]) => { const [a, b] = splitLimit(v); return a >= min[0] && b >= min[1]; };
export const biLabel = (min: [number, number]) => `${min[0]}/${min[1]}`;

/** Coverage combinations that a policy in this state cannot be issued with. */
export function autoLimitErrors(state: string, c: { bodilyInjury: string; propertyDamage: string; uninsuredMotorist: string; underinsuredMotorist?: string }): string[] {
  const r = ruleFor(state);
  const out: string[] = [];
  if (!meetsBi(c.bodilyInjury, r.bi)) out.push(`${r.name} requires bodily injury of at least ${biLabel(r.bi)} ($${r.bi[0]},000 per person / $${r.bi[1]},000 per accident).`);
  if (pdThousands(c.propertyDamage) < r.pd) out.push(`${r.name} requires property damage of at least $${r.pd},000.`);
  if (r.umRequired && !meetsBi(c.uninsuredMotorist, r.umRequired)) out.push(`${r.name} requires uninsured motorists of at least ${biLabel(r.umRequired)}.`);
  const [biA, biB] = splitLimit(c.bodilyInjury);
  const [umA, umB] = splitLimit(c.uninsuredMotorist);
  if (umA > biA || umB > biB) out.push('Uninsured motorists limits cannot exceed the bodily injury liability limits.');
  if (c.underinsuredMotorist) {
    const [uA, uB] = splitLimit(c.underinsuredMotorist);
    if (uA > biA || uB > biB) out.push('Underinsured motorists limits cannot exceed the bodily injury liability limits.');
    if (r.uimRequired && (uA < (r.umRequired?.[0] ?? 0) || uB < (r.umRequired?.[1] ?? 0))) out.push(`${r.name} requires underinsured motorists of at least ${biLabel(r.umRequired!)}.`);
  }
  return out;
}
