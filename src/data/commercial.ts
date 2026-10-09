import type { BusinessDetails, CommercialAutoDetails, CommercialLine, CommercialVehicle, ContractorsDetails, PremiumBreakdown, PremiumLine, WorkersCompDetails } from '@/data/types';

// Illustrative appetite guide and rates for the demo ErieSecure Business® quote. Not ERIE filed rates.
export type BusinessClass = { code: string; label: string; group: string; appetite: 'yes' | 'refer' | 'no'; propRate: number; glRate: number; note: string };

export const businessClasses: BusinessClass[] = [
  { code: '59991', label: 'Florist / gift shop', group: 'Retail', appetite: 'yes', propRate: 0.42, glRate: 1.1, note: 'Real-time quote and bind.' },
  { code: '56111', label: 'Clothing / apparel store', group: 'Retail', appetite: 'yes', propRate: 0.38, glRate: 1.0, note: 'Real-time quote and bind.' },
  { code: '64071', label: 'Accounting / CPA office', group: 'Office', appetite: 'yes', propRate: 0.3, glRate: 0.55, note: 'Real-time quote and bind. Professional liability written separately.' },
  { code: '64111', label: 'Insurance agency', group: 'Office', appetite: 'yes', propRate: 0.3, glRate: 0.5, note: 'Real-time quote and bind.' },
  { code: '80111', label: 'Medical office (non-surgical)', group: 'Office', appetite: 'yes', propRate: 0.35, glRate: 0.9, note: 'Malpractice excluded — write separately.' },
  { code: '58121', label: 'Restaurant — full service (liquor under 30% of sales)', group: 'Food service', appetite: 'yes', propRate: 0.65, glRate: 2.4, note: 'Hood & duct cleaning required semiannually.' },
  { code: '72311', label: 'Hair / nail salon', group: 'Personal services', appetite: 'yes', propRate: 0.45, glRate: 1.6, note: 'Professional services liability included.' },
  { code: '75381', label: 'Auto repair (no body work or painting)', group: 'Auto service', appetite: 'refer', propRate: 0.7, glRate: 2.8, note: 'Refers to commercial underwriting — garagekeepers reviewed.' },
  { code: '91111', label: 'Plumbing contractor', group: 'Contractors', appetite: 'refer', propRate: 0.5, glRate: 3.4, note: 'Refers to underwriting — subcontractor costs and COIs reviewed.' },
  { code: '58131', label: 'Bar / tavern (liquor over 50% of sales)', group: 'Food service', appetite: 'no', propRate: 0, glRate: 0, note: 'Outside appetite for ErieSecure Business.' },
  { code: '91551', label: 'Roofing contractor', group: 'Contractors', appetite: 'no', propRate: 0, glRate: 0, note: 'Outside appetite for ErieSecure Business.' },
];

const constructionFactor: Record<BusinessDetails['construction'], number> = { Frame: 1.25, 'Joisted Masonry': 1.1, 'Non-combustible': 1, 'Masonry Non-combustible': 0.92, 'Fire Resistive': 0.85 };
const deductibleFactor: Record<number, number> = { 500: 1.08, 1000: 1, 2500: 0.9, 5000: 0.82 };
const territory: Record<string, number> = { PA: 1, OH: 0.94, WI: 0.96, NY: 1.32, IL: 1.08, IN: 0.95, KY: 1.05, MD: 1.12, NC: 0.98, TN: 1.01, VA: 1.02, WV: 1.04, DC: 1.25 };

export const suggestedBuildingLimit = (b: BusinessDetails) => Math.round((b.squareFeet * ({ Frame: 165, 'Joisted Masonry': 178, 'Non-combustible': 172, 'Masonry Non-combustible': 190, 'Fire Resistive': 236 }[b.construction])) / 1000) * 1000;

export function rateBusiness(b: BusinessDetails): PremiumBreakdown {
  const cls = businessClasses.find((c) => c.code === b.classCode);
  const round = Math.round;
  if (!cls || cls.appetite === 'no') return { product: 'Business', name: BOP_NAME, lines: [], discounts: [], total: 0 };
  const t = territory[b.state] ?? 1;
  const cf = constructionFactor[b.construction];
  const df = deductibleFactor[b.propertyDeductible] ?? 1;
  const lines: PremiumLine[] = [];
  const building = b.ownsBuilding ? round((b.buildingLimit / 100) * cls.propRate * cf * df * t) : 0;
  const bpp = round((b.bppLimit / 100) * cls.propRate * cf * 1.1 * df * t);
  if (b.ownsBuilding) lines.push({ label: `Building — $${b.buildingLimit.toLocaleString()} (Guaranteed Replacement Cost)`, amount: building });
  lines.push({ label: `Business personal property — $${b.bppLimit.toLocaleString()}`, amount: bpp });
  lines.push({ label: 'Income Protection — 12 months actual loss sustained', amount: round((building + bpp) * 0.09) });
  lines.push({ label: 'Extra Expense', amount: round((building + bpp) * 0.03) });
  lines.push({ label: 'Civil Authority — access prohibited within 1 mile (included)', amount: 0 });
  lines.push({ label: `General liability — ${b.glLimit === '1M/2M' ? '$1M / $2M' : '$2M / $4M'}`, amount: round(Math.max(250, (b.revenue / 1000) * cls.glRate) * (b.glLimit === '2M/4M' ? 1.35 : 1) * t) });
  if (b.cyber) lines.push({ label: 'Cyber & data breach — $100,000', amount: round(175 + (b.revenue / 1000) * 0.15) });
  if (b.epli) lines.push({ label: 'Employment practices liability — $100,000', amount: round(250 + b.employees * 18) });
  if (b.hiredNonOwnedAuto) lines.push({ label: 'Hired & non-owned auto — $1,000,000', amount: 120 });
  if (b.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: 95 });
  if (b.employeeDishonesty) lines.push({ label: 'Employee dishonesty — $25,000', amount: 85 });
  const property = building + bpp;
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discounts: PremiumLine[] = [];
  if (b.sprinklered) discounts.push({ label: 'Automatic sprinkler credit', amount: -round(property * 0.1) });
  if (b.alarm !== 'None') discounts.push({ label: `${b.alarm} fire alarm credit`, amount: -round(property * (b.alarm === 'Central Station' ? 0.07 : 0.03)) });
  if (b.yearsInBusiness >= 5) discounts.push({ label: 'Established business credit (5+ years)', amount: -round(subtotal * 0.05) });
  const total = Math.max(500, subtotal + discounts.reduce((s, l) => s + l.amount, 0));
  return { product: 'Business', name: BOP_NAME, lines, discounts, total };
}

export const BOP_NAME = 'Ultrapack Plus (Business Owners Policy)';
export const CONTRACTORS_NAME = 'Fivestar Contractors Package';

export const commercialLineLabels: Record<CommercialLine, string> = {
  bop: BOP_NAME,
  contractors: CONTRACTORS_NAME,
  commercialAuto: 'Commercial Auto',
  workersComp: "Workers' Compensation",
};

// Trade contractor classes for the Fivestar package (illustrative GL rates per $1,000 of sales).
export const contractorTrades = [
  { code: '91111', label: 'Plumbing contractor', glRate: 3.4, appetite: 'yes' as const },
  { code: '92478', label: 'Electrical contractor', glRate: 3.1, appetite: 'yes' as const },
  { code: '91341', label: 'Carpentry — interior finish', glRate: 3.8, appetite: 'yes' as const },
  { code: '97047', label: 'HVAC contractor', glRate: 3.3, appetite: 'yes' as const },
  { code: '97653', label: 'Painting — interior', glRate: 2.6, appetite: 'yes' as const },
  { code: '91580', label: 'Landscaping', glRate: 2.9, appetite: 'yes' as const },
  { code: '91342', label: 'Carpentry — framing (residential)', glRate: 6.2, appetite: 'refer' as const },
  { code: '98677', label: 'Roofing', glRate: 0, appetite: 'no' as const },
];

export function rateContractors(c: ContractorsDetails, revenue: number, state: string, glLimit: BusinessDetails['glLimit']): PremiumBreakdown {
  const trade = contractorTrades.find((t) => t.code === c.trade);
  const t = territory[state] ?? 1;
  if (!trade || trade.appetite === 'no') return { product: 'Business', name: CONTRACTORS_NAME, lines: [], discounts: [], total: 0 };
  const subLoad = 1 + Math.max(0, c.subcontractedPct - 25) / 100;
  const lines: PremiumLine[] = [
    { label: `Contractors general liability — ${glLimit === '1M/2M' ? '$1M / $2M' : '$2M / $4M'}`, amount: Math.round(Math.max(400, (revenue / 1000) * trade.glRate) * subLoad * (glLimit === '2M/4M' ? 1.35 : 1) * t) },
    { label: `Contractors equipment floater (inland marine) — $${c.equipmentFloater.toLocaleString()}`, amount: Math.round(c.equipmentFloater * 0.018) },
    { label: `Installation floater — $${c.installationFloater.toLocaleString()} per job`, amount: Math.round(c.installationFloater * 0.006) },
    { label: `Tools & small equipment — $${c.toolsLimit.toLocaleString()}`, amount: Math.round(c.toolsLimit * 0.025) },
    { label: 'Fivestar package enhancements (included)', amount: 0 },
  ];
  if (c.additionalInsuredBlanket) lines.push({ label: 'Blanket additional insured — owners & contractors', amount: 150 });
  const discounts: PremiumLine[] = c.subcontractedPct <= 10 ? [{ label: 'Low subcontracting credit', amount: -Math.round(lines[0].amount * 0.05) }] : [];
  const total = Math.max(750, lines.reduce((s, l) => s + l.amount, 0) + discounts.reduce((s, l) => s + l.amount, 0));
  return { product: 'Business', name: CONTRACTORS_NAME, lines, discounts, total };
}

const bodyBase: Record<CommercialVehicle['bodyType'], number> = { 'Private Passenger': 820, 'Light Truck': 980, 'Medium Truck': 1450, 'Heavy Truck': 2600 };
const radiusFactor: Record<CommercialVehicle['radius'], number> = { 'Local (0–50 mi)': 1, 'Intermediate (51–200 mi)': 1.2, 'Long Haul (200+ mi)': 1.55 };

export function rateCommercialAuto(a: CommercialAutoDetails, state: string): PremiumBreakdown {
  const t = territory[state] ?? 1;
  const driverLoad = 1 + a.drivers.reduce((s, d) => s + d.violations * 0.08 + d.accidents * 0.15 + (d.age < 25 ? 0.1 : 0), 0) / Math.max(1, a.drivers.length);
  const limitFactor = a.liability === '1,000,000 CSL' ? 1.18 : 1;
  const dedFactor = a.physicalDamageDeductible >= 1000 ? 0.85 : 1;
  const lines: PremiumLine[] = a.vehicles.flatMap((v) => {
    const label = `${v.year} ${v.make} ${v.model}`;
    return [
      { label: `${label} · Liability ${a.liability} (${v.radius})`, amount: Math.round(bodyBase[v.bodyType] * radiusFactor[v.radius] * limitFactor * driverLoad * t) },
      { label: `${label} · Comprehensive & collision ($${a.physicalDamageDeductible} ded.)`, amount: Math.round(v.costNew * 0.032 * Math.max(0.4, 1 - (new Date().getFullYear() - v.year) * 0.07) * dedFactor) },
    ];
  });
  if (a.garagekeepers) lines.push({ label: `Garagekeepers liability — $${a.garagekeepersLimit.toLocaleString()}`, amount: Math.round(a.garagekeepersLimit * 0.004) });
  if (a.hiredNonOwned) lines.push({ label: 'Hired & non-owned auto', amount: 140 });
  const discounts: PremiumLine[] = a.vehicles.length >= 5 ? [{ label: 'Fleet credit (5+ units)', amount: -Math.round(lines.reduce((s, l) => s + l.amount, 0) * 0.07) }] : [];
  const total = lines.reduce((s, l) => s + l.amount, 0) + discounts.reduce((s, l) => s + l.amount, 0);
  return { product: 'Commercial Auto', name: 'Commercial Auto', lines, discounts, total: Math.max(0, total) };
}

// NCCI-style class codes with illustrative rates per $100 of payroll.
export const wcClasses = [
  { code: '8810', label: 'Clerical office employees', rate: 0.12 },
  { code: '8017', label: 'Retail store', rate: 1.35 },
  { code: '9079', label: 'Restaurant', rate: 1.6 },
  { code: '9586', label: 'Barber shop / beauty parlor', rate: 0.9 },
  { code: '8380', label: 'Automobile service or repair', rate: 3.6 },
  { code: '5183', label: 'Plumbing', rate: 4.2 },
  { code: '5190', label: 'Electrical wiring', rate: 3.2 },
  { code: '5437', label: 'Carpentry — cabinet/interior trim', rate: 5.1 },
  { code: '5645', label: 'Carpentry — residential', rate: 9.4 },
  { code: '7380', label: 'Drivers, chauffeurs & helpers', rate: 4.5 },
  { code: '8742', label: 'Salespersons — outside', rate: 0.35 },
];

export function rateWorkersComp(w: WorkersCompDetails, state: string): PremiumBreakdown {
  const t = territory[state] ?? 1;
  const lines: PremiumLine[] = w.classes.map((c) => {
    const cls = wcClasses.find((x) => x.code === c.code);
    return { label: `${c.code} ${cls?.label ?? ''} — payroll $${c.payroll.toLocaleString()}`, amount: Math.round((c.payroll / 100) * (cls?.rate ?? 1) * t) };
  });
  const manual = lines.reduce((s, l) => s + l.amount, 0);
  const elFactor = { '100/500/100': 0, '500/500/500': 0.011, '1M/1M/1M': 0.017 }[w.employersLiability];
  if (elFactor) lines.push({ label: `Employers liability increased limits ${w.employersLiability}`, amount: Math.round(manual * elFactor) });
  const modified = lines.reduce((s, l) => s + l.amount, 0);
  const discounts: PremiumLine[] = [];
  if (w.experienceMod !== 1) discounts.push({ label: `Experience modification (${w.experienceMod.toFixed(2)})`, amount: Math.round(modified * (w.experienceMod - 1)) });
  const standard = modified + discounts.reduce((s, l) => s + l.amount, 0);
  if (standard > 10000) discounts.push({ label: 'Premium discount (standard premium over $10,000)', amount: -Math.round((standard - 10000) * 0.091) });
  lines.push({ label: 'Expense constant', amount: 160 });
  const total = Math.max(350, lines.reduce((s, l) => s + l.amount, 0) + discounts.reduce((s, l) => s + l.amount, 0));
  return { product: 'Workers Comp', name: "Workers' Compensation", lines, discounts, total };
}
