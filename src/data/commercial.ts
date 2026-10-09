import type { BusinessDetails, PremiumBreakdown, PremiumLine } from '@/data/types';

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
  if (!cls || cls.appetite === 'no') return { product: 'Business', lines: [], discounts: [], total: 0 };
  const t = territory[b.state] ?? 1;
  const cf = constructionFactor[b.construction];
  const df = deductibleFactor[b.propertyDeductible] ?? 1;
  const lines: PremiumLine[] = [];
  const building = b.ownsBuilding ? round((b.buildingLimit / 100) * cls.propRate * cf * df * t) : 0;
  const bpp = round((b.bppLimit / 100) * cls.propRate * cf * 1.1 * df * t);
  if (b.ownsBuilding) lines.push({ label: `Building — $${b.buildingLimit.toLocaleString()} (Guaranteed Replacement Cost)`, amount: building });
  lines.push({ label: `Business personal property — $${b.bppLimit.toLocaleString()}`, amount: bpp });
  lines.push({ label: 'Business income & extra expense — 12 months ALS', amount: round((building + bpp) * 0.12) });
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
  return { product: 'Business', lines, discounts, total };
}
