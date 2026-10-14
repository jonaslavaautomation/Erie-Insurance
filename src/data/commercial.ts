import type { BusinessDetails, CommercialAutoDetails, CommercialDetails, CommercialLine, CommercialVehicle, ContractorsDetails, PremiumBreakdown, PremiumLine, WorkersCompDetails } from '@/data/types';

/*
 * Commercial rating for the demo portal.
 *
 * Rating STRUCTURE follows industry practice (sources in the project notes):
 *  - General liability is rated per $1,000 of the class's premium basis — gross sales, payroll,
 *    or area per 1,000 sq ft — as in the ISO commercial lines manual.
 *  - Property: ISO construction classes 1–6, public protection class, coinsurance, valuation.
 *  - Commercial auto: ISO size class by gross vehicle weight (light ≤10,000 lb, medium
 *    10,001–20,000, heavy 20,001–45,000, extra-heavy >45,000, truck-tractors on combined weight)
 *    and radius (local ≤50 mi, intermediate 51–200, long distance >200).
 *  - Workers' comp: payroll / 100 × class rate, experience mod, tiered premium discount
 *    (0% / 9.1% / 11.3% / 12.3%), expense constant.
 *
 * NUMBERS: workers' comp class rates are Wisconsin WCRB filed rates effective 10/1/2026 with the
 * $220 expense constant. All other rates and credits are illustrative — not ERIE filed rates.
 */

const round = Math.round;
const sum = (lines: PremiumLine[]) => lines.reduce((s, l) => s + l.amount, 0);

// ---- Classes & appetite ------------------------------------------------------------------------

export type PremiumBasis = 'sales' | 'payroll' | 'area';
export const basisLabel: Record<PremiumBasis, string> = { sales: 'per $1,000 gross sales', payroll: 'per $1,000 payroll', area: 'per 1,000 sq ft' };

export type BusinessClass = {
  code: string;
  // ISO GL class code where verified against published class-code guides; otherwise blank.
  iso?: string;
  label: string;
  group: string;
  appetite: 'yes' | 'refer' | 'no';
  basis: PremiumBasis;
  glRate: number;
  propRate: number;
  note: string;
};

// Appetite follows published descriptions of ERIE's commercial appetite: contractors, retail,
// wholesale, offices, healthcare offices, restaurants, nonprofits and habitational are preferred;
// bars are reviewed; heavy manufacturing, cannabis and environmental contractors are declined.
export const businessClasses: BusinessClass[] = [
  { code: 'RET-FLOR', label: 'Florist / gift shop', group: 'Retail', appetite: 'yes', basis: 'sales', glRate: 1.15, propRate: 0.42, note: 'Real-time quote and bind.' },
  { code: 'RET-CLOTH', label: 'Clothing / apparel store', group: 'Retail', appetite: 'yes', basis: 'sales', glRate: 1.0, propRate: 0.38, note: 'Real-time quote and bind.' },
  { code: 'RET-HDW', label: 'Hardware store', group: 'Retail', appetite: 'yes', basis: 'sales', glRate: 1.45, propRate: 0.44, note: 'Real-time quote and bind.' },
  { code: 'WHL-NOC', label: 'Wholesale distributor — non-hazardous goods', group: 'Wholesale', appetite: 'yes', basis: 'sales', glRate: 0.85, propRate: 0.4, note: 'Products-completed operations included.' },
  { code: 'OFF-CPA', label: 'Accounting / CPA office', group: 'Office & professional', appetite: 'yes', basis: 'area', glRate: 42, propRate: 0.3, note: 'Professional liability written separately.' },
  { code: 'OFF-INS', label: 'Insurance agency', group: 'Office & professional', appetite: 'yes', basis: 'area', glRate: 40, propRate: 0.3, note: 'E&O written separately.' },
  { code: 'OFF-MED', label: 'Medical office (non-surgical)', group: 'Office & professional', appetite: 'yes', basis: 'area', glRate: 55, propRate: 0.35, note: 'Malpractice excluded — write separately.' },
  { code: '16910', iso: '16910', label: 'Restaurant — table service, alcohol under 30% of receipts', group: 'Food service', appetite: 'yes', basis: 'sales', glRate: 2.4, propRate: 0.65, note: 'Hood & duct cleaning required semiannually.' },
  { code: '16911', iso: '16911', label: 'Restaurant — no table service, alcohol under 30% of receipts', group: 'Food service', appetite: 'yes', basis: 'sales', glRate: 1.9, propRate: 0.6, note: 'Hood & duct cleaning required semiannually.' },
  { code: 'FOOD-BAR', label: 'Bar / tavern — alcohol over 50% of receipts', group: 'Food service', appetite: 'refer', basis: 'sales', glRate: 6.5, propRate: 0.8, note: 'Underwriting review — liquor liability, hours and security.' },
  { code: 'SVC-SALON', label: 'Hair / nail salon', group: 'Personal services', appetite: 'yes', basis: 'area', glRate: 68, propRate: 0.45, note: 'Professional services liability included.' },
  { code: 'SVC-AUTO', label: 'Auto repair — no body work or painting', group: 'Auto service', appetite: 'refer', basis: 'payroll', glRate: 9.8, propRate: 0.7, note: 'Refers to underwriting — garagekeepers reviewed.' },
  { code: 'HAB-APT', label: 'Apartment building — up to 4 stories', group: 'Habitational', appetite: 'yes', basis: 'area', glRate: 30, propRate: 0.36, note: 'Lessor’s risk; tenant leases and COIs reviewed.' },
  { code: 'NP-CHURCH', label: 'Church / house of worship', group: 'Nonprofit', appetite: 'yes', basis: 'area', glRate: 26, propRate: 0.34, note: 'Abuse & molestation coverage reviewed separately.' },
  { code: 'MFG-LIGHT', label: 'Light manufacturing — assembly, no hazardous processes', group: 'Manufacturing', appetite: 'refer', basis: 'sales', glRate: 2.1, propRate: 0.55, note: 'Not BOP-eligible under ISO rules — underwriter reviews for a package policy.' },
  { code: 'MFG-HEAVY', label: 'Heavy / high-hazard manufacturing', group: 'Manufacturing', appetite: 'no', basis: 'sales', glRate: 0, propRate: 0, note: 'Outside appetite (chemical, heavy metalworking, petroleum, explosives).' },
  { code: 'CANNABIS', label: 'Cannabis dispensary or grower', group: 'Retail', appetite: 'no', basis: 'sales', glRate: 0, propRate: 0, note: 'Outside appetite.' },
];

export type ContractorTrade = { code: string; iso?: string; label: string; glRate: number; appetite: 'yes' | 'refer' | 'no'; note?: string };

// Contractors' liability is rated on payroll. ISO codes verified against published class-code guides.
export const contractorTrades: ContractorTrade[] = [
  { code: '98482', iso: '98482', label: 'Plumbing — commercial and industrial', glRate: 9.6, appetite: 'yes' },
  { code: '92478', iso: '92478', label: 'Electrical work — within buildings', glRate: 7.8, appetite: 'yes' },
  { code: '91341', iso: '91341', label: 'Carpentry — interior', glRate: 11.2, appetite: 'yes' },
  { code: 'CON-HVAC', label: 'HVAC — installation, service and repair', glRate: 9.0, appetite: 'yes' },
  { code: '98305', iso: '98305', label: 'Painting — interior, buildings or structures', glRate: 8.4, appetite: 'yes' },
  { code: '97047', iso: '97047', label: 'Landscape gardening', glRate: 7.2, appetite: 'yes' },
  { code: '91340', iso: '91340', label: 'Carpentry — residential construction, 3 stories or less', glRate: 16.5, appetite: 'refer', note: 'Framing exposure — underwriter review.' },
  { code: '98678', iso: '98678', label: 'Roofing — residential, 3 stories or less', glRate: 31, appetite: 'refer', note: 'Height and slope restrictions apply.' },
  { code: '98677', iso: '98677', label: 'Roofing — commercial or residential over 3 stories', glRate: 0, appetite: 'no', note: 'Outside appetite.' },
  { code: 'CON-ENV', label: 'Environmental — remediation, asbestos or lead abatement', glRate: 0, appetite: 'no', note: 'Outside appetite.' },
];

// Older saved quotes used different class identifiers.
export const LEGACY_CODES: Record<string, string> = {
  59991: 'RET-FLOR', 56111: 'RET-CLOTH', 64071: 'OFF-CPA', 64111: 'OFF-INS', 80111: 'OFF-MED', 58121: '16910', 72311: 'SVC-SALON', 75381: 'SVC-AUTO', 58131: 'FOOD-BAR',
  // Former contractor codes saved as BOP classes have no BOP equivalent: the agent must reselect.
  91551: '', 91111: '', 97653: '', 91580: '', 91342: '',
};
// 97047 was previously used for HVAC; trades keep that mapping only when the old label was HVAC.
export const LEGACY_TRADES: Record<string, string> = { 91111: '98482', 97047: 'CON-HVAC', 97653: '98305', 91580: '97047', 91342: '91340', 98677: '98678' };

// ---- Shared property factors -------------------------------------------------------------------

export const CONSTRUCTION_CLASSES: BusinessDetails['construction'][] = ['Frame', 'Joisted Masonry', 'Non-combustible', 'Masonry Non-combustible', 'Modified Fire Resistive', 'Fire Resistive'];
const constructionFactor: Record<BusinessDetails['construction'], number> = { Frame: 1.25, 'Joisted Masonry': 1.1, 'Non-combustible': 1, 'Masonry Non-combustible': 0.92, 'Modified Fire Resistive': 0.88, 'Fire Resistive': 0.85 };
const replacementPerSqFt: Record<BusinessDetails['construction'], number> = { Frame: 165, 'Joisted Masonry': 178, 'Non-combustible': 172, 'Masonry Non-combustible': 190, 'Modified Fire Resistive': 214, 'Fire Resistive': 236 };
const deductibleFactor: Record<number, number> = { 500: 1.08, 1000: 1, 2500: 0.9, 5000: 0.82, 10000: 0.74 };
const territory: Record<string, number> = { PA: 1, OH: 0.94, WI: 0.96, NY: 1.32, IL: 1.08, IN: 0.95, KY: 1.05, MD: 1.12, NC: 0.98, TN: 1.01, VA: 1.02, WV: 1.04, DC: 1.25 };

// Public protection class 1 (best) to 10 (unprotected).
const protectionFactor = (pc = 4) => (pc >= 10 ? 1.6 : pc === 9 ? 1.35 : 0.9 + pc * 0.03);
// Higher coinsurance earns a lower rate in exchange for insuring closer to full value.
const coinsuranceFactor: Record<number, number> = { 80: 1.05, 90: 1, 100: 0.95 };
const windHailFactor: Record<number, number> = { 0: 1, 1: 0.97, 2: 0.94, 5: 0.88 };

export const suggestedBuildingLimit = (b: Pick<BusinessDetails, 'squareFeet' | 'construction'>) => round((b.squareFeet * replacementPerSqFt[b.construction]) / 1000) * 1000;

/** Coinsurance check: the building limit must be at least coinsurance % of replacement cost or losses are penalized. */
export function coinsuranceShortfall(b: BusinessDetails) {
  if (!b.ownsBuilding) return null;
  const replacement = suggestedBuildingLimit(b);
  const required = round((replacement * (b.coinsurance ?? 90)) / 100);
  return b.buildingLimit < required ? { replacement, required, ratio: b.buildingLimit / required } : null;
}

function propertyLines(b: BusinessDetails, rate: number) {
  const t = territory[b.state] ?? 1;
  const factor = constructionFactor[b.construction] * protectionFactor(b.protectionClass) * (coinsuranceFactor[b.coinsurance ?? 90] ?? 1) * (b.valuation === 'Actual Cash Value' ? 0.9 : 1) * (windHailFactor[b.windHailPct ?? 0] ?? 1) * (deductibleFactor[b.propertyDeductible] ?? 1) * ((b.stories ?? 1) > 3 ? 1.06 : 1) * t;
  const building = b.ownsBuilding ? round((b.buildingLimit / 100) * rate * factor) : 0;
  const bpp = round((b.bppLimit / 100) * rate * factor * 1.1);
  const valuation = `${b.valuation ?? 'Replacement Cost'}, ${b.coinsurance ?? 90}% coinsurance`;
  const lines: PremiumLine[] = [];
  if (b.ownsBuilding) lines.push({ label: `Building — ${money0(b.buildingLimit)} (${valuation}, ISO ${b.construction}, PC ${b.protectionClass ?? 4})`, amount: building });
  lines.push({ label: `Business personal property — ${money0(b.bppLimit)}`, amount: bpp });
  if ((b.windHailPct ?? 0) > 0) lines.push({ label: `Wind/hail deductible — ${b.windHailPct}% of building value (credit applied)`, amount: 0 });
  return { lines, property: building + bpp };
}

function protectionCredits(b: BusinessDetails, property: number): PremiumLine[] {
  const credits: PremiumLine[] = [];
  if (b.sprinklered) credits.push({ label: 'Automatic sprinkler credit', amount: -round(property * 0.1) });
  if (b.alarm !== 'None') credits.push({ label: `${b.alarm} fire alarm credit`, amount: -round(property * (b.alarm === 'Central Station' ? 0.07 : 0.03)) });
  return credits;
}

// TRIA requires the terrorism offer; accepted coverage is charged, a rejection is noted.
function terrorismLine(b: BusinessDetails, base: number): PremiumLine {
  return b.terrorism === false ? { label: 'Certified acts of terrorism (TRIA) — rejected in writing', amount: 0 } : { label: 'Certified acts of terrorism (TRIA) — accepted', amount: Math.max(25, round(base * 0.01)) };
}

const money0 = (n: number) => `$${round(n).toLocaleString()}`;

/** GL exposure in rating units for the class basis. */
export function glExposure(b: Pick<BusinessDetails, 'revenue' | 'payroll' | 'squareFeet'>, basis: PremiumBasis) {
  return basis === 'sales' ? b.revenue / 1000 : basis === 'payroll' ? b.payroll / 1000 : b.squareFeet / 1000;
}

function glLine(exposureUnits: number, rate: number, basis: PremiumBasis, limit: BusinessDetails['glLimit'], state: string, minimum: number, label = 'General liability') {
  const t = territory[state] ?? 1;
  const amount = round(Math.max(minimum, exposureUnits * rate) * (limit === '2M/4M' ? 1.35 : 1) * t);
  return { label: `${label} — ${limit === '1M/2M' ? '$1M / $2M' : '$2M / $4M'} (${exposureUnits.toLocaleString(undefined, { maximumFractionDigits: 1 })} units × $${rate} ${basisLabel[basis]})`, amount };
}

// ---- Ultrapack Plus (BOP) -----------------------------------------------------------------------

export const BOP_NAME = 'Ultrapack Plus (Business Owners Policy)';
export const CONTRACTORS_NAME = 'Fivestar Contractors Package';
export const UMBRELLA_NAME = 'Commercial Umbrella';

// ISO BOP size limits: 35,000 sq ft and $6,000,000 gross sales per location, 6 stories.
export const BOP_LIMITS = { squareFeet: 35000, sales: 6000000, stories: 6 };

export function rateBusiness(b: BusinessDetails): PremiumBreakdown {
  const cls = businessClasses.find((c) => c.code === b.classCode);
  if (!cls || cls.appetite === 'no') return { product: 'Business', name: BOP_NAME, lines: [], discounts: [], total: 0 };
  const { lines, property } = propertyLines(b, cls.propRate);
  lines.push({ label: 'Income Protection — 12 months actual loss sustained', amount: round(property * 0.09) });
  lines.push({ label: 'Extra Expense', amount: round(property * 0.03) });
  lines.push({ label: 'Civil Authority — access prohibited within 1 mile (included)', amount: 0 });
  const gl = glLine(glExposure(b, cls.basis), cls.glRate, cls.basis, b.glLimit, b.state, 250);
  lines.push(gl);
  if (b.cyber) lines.push({ label: 'Cyber & data breach — $100,000', amount: round(175 + (b.revenue / 1000) * 0.15) });
  if (b.epli) lines.push({ label: 'Employment practices liability — $100,000', amount: round(250 + b.employees * 18) });
  if (b.hiredNonOwnedAuto) lines.push({ label: 'Hired & non-owned auto — $1,000,000', amount: 120 });
  if (b.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: 95 });
  if (b.employeeDishonesty) lines.push({ label: 'Employee dishonesty — $25,000', amount: 85 });
  lines.push(terrorismLine(b, property + gl.amount));
  const subtotal = sum(lines);
  const discounts = protectionCredits(b, property);
  if (b.yearsInBusiness >= 5) discounts.push({ label: 'Established business credit (5+ years)', amount: -round(subtotal * 0.05) });
  if ((b.lossCount5yr ?? 0) === 0 && (b.priorYears ?? 0) >= 3) discounts.push({ label: 'Loss-free credit (5 years, 3+ years prior insurance)', amount: -round(subtotal * 0.05) });
  return { product: 'Business', name: BOP_NAME, lines, discounts, total: Math.max(500, subtotal + sum(discounts)) };
}

// ---- Monoline commercial property -------------------------------------------------------------

export function rateCommercialProperty(b: BusinessDetails): PremiumBreakdown {
  const { lines, property } = propertyLines(b, 0.34);
  lines.push({ label: 'Income Protection — 12 months actual loss sustained', amount: round(property * 0.09) });
  lines.push({ label: 'Extra Expense', amount: round(property * 0.03) });
  if (b.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: round(150 + b.squareFeet * 0.01) });
  if (b.employeeDishonesty) lines.push({ label: 'Employee dishonesty — $25,000', amount: 85 });
  lines.push(terrorismLine(b, property));
  return { product: 'Business', name: 'Commercial Property', lines, discounts: protectionCredits(b, property), total: Math.max(750, sum(lines) + sum(protectionCredits(b, property))) };
}

// ---- Fivestar contractors ---------------------------------------------------------------------

export function rateContractors(c: ContractorsDetails, b: BusinessDetails, state: string): PremiumBreakdown {
  const trade = contractorTrades.find((t) => t.code === c.trade);
  if (!trade || trade.appetite === 'no') return { product: 'Business', name: CONTRACTORS_NAME, lines: [], discounts: [], total: 0 };
  const lines: PremiumLine[] = [glLine(b.payroll / 1000, trade.glRate, 'payroll', b.glLimit, state, 500, 'Contractors general liability')];
  // Subcontracted work is rated on its total cost; uninsured subs would be rated as payroll.
  const subCost = (b.revenue * c.subcontractedPct) / 100;
  if (subCost > 0) lines.push({ label: `Subcontracted work — ${money0(subCost)} total cost (certificates of insurance required)`, amount: round((subCost / 1000) * 1.4 * (territory[state] ?? 1)) });
  lines.push({ label: `Contractors equipment floater (inland marine) — ${money0(c.equipmentFloater)}`, amount: round(c.equipmentFloater * 0.018) });
  lines.push({ label: `Installation floater — ${money0(c.installationFloater)} per job`, amount: round(c.installationFloater * 0.006) });
  lines.push({ label: `Tools & small equipment — ${money0(c.toolsLimit)}`, amount: round(c.toolsLimit * 0.025) });
  lines.push({ label: 'Fivestar package enhancements (included)', amount: 0 });
  if (c.additionalInsuredBlanket) lines.push({ label: 'Blanket additional insured — owners, lessees or contractors', amount: 150 });
  lines.push(terrorismLine(b, lines[0].amount));
  const discounts: PremiumLine[] = c.subcontractedPct <= 10 ? [{ label: 'Low subcontracting credit (10% or less)', amount: -round(lines[0].amount * 0.05) }] : [];
  return { product: 'Business', name: CONTRACTORS_NAME, lines, discounts, total: Math.max(750, sum(lines) + sum(discounts)) };
}

// ---- Commercial auto --------------------------------------------------------------------------

export const CDL_GVW = 26001; // Federal CDL threshold: vehicles with GVWR of 26,001 lb or more.

/** ISO size class from gross vehicle weight. */
export function sizeClass(gvw: number | undefined, tractor = false, privatePassenger = false): CommercialVehicle['bodyType'] {
  if (privatePassenger) return 'Private Passenger';
  if (tractor) return 'Truck-Tractor';
  const w = gvw ?? 0;
  if (w <= 10000) return 'Light Truck';
  if (w <= 20000) return 'Medium Truck';
  if (w <= 45000) return 'Heavy Truck';
  return 'Extra-Heavy Truck';
}

const sizeBase: Record<CommercialVehicle['bodyType'], number> = { 'Private Passenger': 820, 'Light Truck': 980, 'Medium Truck': 1450, 'Heavy Truck': 2350, 'Extra-Heavy Truck': 3100, 'Truck-Tractor': 3600 };
const radiusFactor: Record<CommercialVehicle['radius'], number> = { 'Local (0–50 mi)': 1, 'Intermediate (51–200 mi)': 1.2, 'Long Haul (200+ mi)': 1.55 };
const useFactor: Record<NonNullable<CommercialVehicle['use']>, number> = { Service: 1, Retail: 1.1, Commercial: 1.15 };

export function rateCommercialAuto(a: CommercialAutoDetails, state: string): PremiumBreakdown {
  const t = territory[state] ?? 1;
  const driverLoad = 1 + a.drivers.reduce((s, d) => s + d.violations * 0.08 + d.accidents * 0.15 + (d.age < 25 ? 0.1 : 0) + ((d.yearsLicensed ?? 10) < 3 ? 0.08 : 0), 0) / Math.max(1, a.drivers.length);
  const limitFactor = a.liability === '1,000,000 CSL' ? 1.18 : 1;
  const dedFactor = a.physicalDamageDeductible >= 2500 ? 0.75 : a.physicalDamageDeductible >= 1000 ? 0.85 : 1;
  const lines: PremiumLine[] = a.vehicles.flatMap((v) => {
    const label = `${v.year} ${v.make} ${v.model}`;
    const cls = v.bodyType;
    const age = Math.max(0, new Date().getFullYear() - v.year);
    return [
      { label: `${label} · Liability ${a.liability} (${cls}${v.gvw ? `, ${v.gvw.toLocaleString()} lb` : ''}, ${v.use ?? 'Service'}, ${v.radius})`, amount: round(sizeBase[cls] * radiusFactor[v.radius] * useFactor[v.use ?? 'Service'] * limitFactor * driverLoad * t) },
      { label: `${label} · Comprehensive & collision ($${a.physicalDamageDeductible} ded., cost new ${money0(v.costNew)})`, amount: round(v.costNew * 0.032 * Math.max(0.4, 1 - age * 0.07) * dedFactor) },
    ];
  });
  const units = Math.max(1, a.vehicles.length);
  if (a.uninsuredMotorist && a.uninsuredMotorist !== 'None') lines.push({ label: `Uninsured / underinsured motorists — ${a.uninsuredMotorist} (${units} unit${units > 1 ? 's' : ''})`, amount: round(units * (a.uninsuredMotorist === '1,000,000 CSL' ? 78 : 58) * t) });
  if (a.medicalPayments) lines.push({ label: `Medical payments — ${money0(a.medicalPayments)} each person`, amount: round(units * (a.medicalPayments >= 10000 ? 34 : 22)) });
  if (a.garagekeepers) lines.push({ label: `Garagekeepers liability — ${money0(a.garagekeepersLimit)}`, amount: round(a.garagekeepersLimit * 0.004) });
  if (a.hiredNonOwned) lines.push({ label: 'Hired & non-owned auto', amount: 140 });
  const tr = a.trucking;
  if (tr) {
    if (tr.trailers) lines.push({ label: `Owned trailers (${tr.trailers}) — physical damage`, amount: round(tr.trailers * 420 * t) });
    lines.push({ label: `Motor truck cargo — ${money0(tr.cargoLimit)} (${tr.commodity})`, amount: round(tr.cargoLimit * 0.011 * t) });
    if (tr.trailerInterchange) lines.push({ label: 'Trailer interchange — $40,000', amount: 380 });
    lines.push({ label: 'MCS-90 endorsement & federal filings', amount: 0 });
  }
  const discounts: PremiumLine[] = a.vehicles.length >= 5 ? [{ label: 'Fleet credit (5+ units)', amount: -round(sum(lines) * 0.07) }] : [];
  return { product: 'Commercial Auto', name: tr ? 'Trucking (Motor Carrier)' : 'Commercial Auto', lines, discounts, total: Math.max(0, sum(lines) + sum(discounts)) };
}

// ---- Workers' compensation --------------------------------------------------------------------

// Wisconsin WCRB filed rates per $100 of payroll, effective October 1, 2026 (General Circular
// Letter 3273). Wisconsin restaurants use 9082 / 9083 rather than NCCI's 9079.
export const WC_RATES_EFFECTIVE = '2026-10-01';
export const WC_EXPENSE_CONSTANT = 220;
export const wcClasses = [
  { code: '8810', label: 'Clerical office employees NOC', rate: 0.162 },
  { code: '8742', label: 'Salespersons — outside', rate: 0.261 },
  { code: '8832', label: 'Physician & clerical', rate: 0.256 },
  { code: '8017', label: 'Store — retail NOC', rate: 1.319 },
  { code: '8006', label: 'Grocery store — retail', rate: 2.028 },
  { code: '8018', label: 'Store — wholesale NOC', rate: 3.167 },
  { code: '9082', label: 'Restaurant NOC', rate: 1.188 },
  { code: '9083', label: 'Restaurant — fast food, including delivery', rate: 1.101 },
  { code: '2003', label: 'Bakery', rate: 2.959 },
  { code: '9586', label: 'Barber shop or beauty parlor', rate: 0.388 },
  { code: '9015', label: 'Building operation — all other employees', rate: 2.978 },
  { code: '9014', label: 'Janitorial services — by contractor', rate: 2.535 },
  { code: '8380', label: 'Automobile service or repair center & drivers', rate: 2.703 },
  { code: '3632', label: 'Machine shop NOC', rate: 2.43 },
  { code: '5183', label: 'Plumbing NOC & drivers', rate: 2.212 },
  { code: '5190', label: 'Electrical wiring — within buildings & drivers', rate: 2.028 },
  { code: '5403', label: 'Carpentry NOC', rate: 5.325 },
  { code: '5437', label: 'Carpentry — cabinet work or interior trim', rate: 6.087 },
  { code: '5645', label: 'Carpentry — detached one or two family dwellings', rate: 8.516 },
  { code: '5551', label: 'Roofing — all kinds & drivers', rate: 12.789 },
  { code: '7380', label: 'Drivers, chauffeurs & helpers NOC — commercial', rate: 4.706 },
  { code: '7219', label: 'Trucking — long distance hauling', rate: 5.886 },
];

// Relativity to Wisconsin for other ERIE states — illustrative only; those states file their own rates.
const wcStateRelativity: Record<string, number> = { WI: 1, PA: 1.05, OH: 0.9, NY: 1.55, IL: 1.35, IN: 0.75, KY: 0.95, MD: 1.1, NC: 0.95, TN: 0.9, VA: 0.85, WV: 0.95, DC: 1.2 };

// Tiered premium discount on standard premium: first $10,000 0%, next $190,000 9.1%,
// next $1,550,000 11.3%, over $1,750,000 12.3%.
export function premiumDiscount(standard: number) {
  const tiers = [[10000, 0], [200000, 0.091], [1750000, 0.113], [Infinity, 0.123]] as const;
  let previous = 0;
  let discount = 0;
  for (const [ceiling, pct] of tiers) {
    if (standard > previous) discount += (Math.min(standard, ceiling) - previous) * pct;
    previous = ceiling;
  }
  return round(discount);
}

export function rateWorkersComp(w: WorkersCompDetails, state: string): PremiumBreakdown {
  const relativity = wcStateRelativity[state] ?? 1;
  const lines: PremiumLine[] = w.classes.map((c) => {
    const cls = wcClasses.find((x) => x.code === c.code);
    const rate = Math.round((cls?.rate ?? 1) * relativity * 1000) / 1000;
    return { label: `${c.code} ${cls?.label ?? 'Unknown class'} — $${c.payroll.toLocaleString()} payroll × $${rate.toFixed(3)} per $100${state === 'WI' ? '' : ' (illustrative)'}`, amount: round((c.payroll / 100) * rate) };
  });
  const manual = sum(lines);
  const elFactor = { '100/500/100': 0, '500/500/500': 0.011, '1M/1M/1M': 0.017 }[w.employersLiability];
  if (elFactor) lines.push({ label: `Employers liability increased limits ${w.employersLiability}`, amount: round(manual * elFactor) });
  const modified = sum(lines);
  const discounts: PremiumLine[] = [];
  if (w.experienceMod !== 1) discounts.push({ label: `Experience modification (${w.experienceMod.toFixed(2)})`, amount: round(modified * (w.experienceMod - 1)) });
  const standard = modified + sum(discounts);
  const pd = premiumDiscount(standard);
  if (pd) discounts.push({ label: 'Premium discount (tiered on standard premium over $10,000)', amount: -pd });
  lines.push({ label: `Expense constant${state === 'WI' ? '' : ' (illustrative)'}`, amount: WC_EXPENSE_CONSTANT });
  return { product: 'Workers Comp', name: "Workers' Compensation", lines, discounts, total: Math.max(350, sum(lines) + sum(discounts)) };
}

// ---- Commercial umbrella ----------------------------------------------------------------------

// Typical required underlying limits: GL $1M/$2M, auto $1M CSL, employers liability $500K.
export const UMBRELLA_UNDERLYING = { gl: '1M/2M', auto: '1,000,000 CSL', el: ['500/500/500', '1M/1M/1M'] };

/** Liability portion of a rated line (GL, auto liability, employers liability) — the umbrella's rating base. */
export function liabilityPremium(b: PremiumBreakdown) {
  if (b.product === 'Workers Comp') return round(b.total * 0.1);
  return b.lines.filter((l) => /liability|Uninsured/i.test(l.label)).reduce((s, l) => s + l.amount, 0);
}

export function rateCommercialUmbrella(limit: number, underlyingLiabilityPremium: number, hasHeavyUnits: boolean, state: string): PremiumBreakdown {
  const millions = Math.max(1, round(limit / 1000000));
  const first = Math.max(750, round(underlyingLiabilityPremium * 0.12 * (hasHeavyUnits ? 1.4 : 1) * (territory[state] ?? 1)));
  const lines: PremiumLine[] = [{ label: `First $1,000,000 — 12% of underlying liability premium (${money0(underlyingLiabilityPremium)})${hasHeavyUnits ? ', heavy-vehicle load' : ''}`, amount: first }];
  for (let m = 2; m <= millions; m += 1) lines.push({ label: `Layer ${m} — additional $1,000,000`, amount: round(first * (m === 2 ? 0.6 : 0.45)) });
  return { product: 'Business', name: `${UMBRELLA_NAME} — ${money0(millions * 1000000)}`, lines, discounts: [], total: sum(lines) };
}

export const commercialLineLabels: Record<CommercialLine, string> = {
  bop: BOP_NAME,
  contractors: CONTRACTORS_NAME,
  commercialAuto: 'Commercial Auto',
  workersComp: "Workers' Compensation",
  umbrella: UMBRELLA_NAME,
};

// ---- Underwriting rules -----------------------------------------------------------------------

export type Rule = { outcome: 'refer' | 'decline'; text: string };

/** Eligibility and referral rules for the commercial account. */
export function commercialRules(c: CommercialDetails): Rule[] {
  const out: Rule[] = [];
  const b = c.business;
  if (c.lines.includes('bop')) {
    const cls = businessClasses.find((x) => x.code === b.classCode);
    if (cls?.appetite === 'no') out.push({ outcome: 'decline', text: `${cls.label}: ${cls.note}` });
    if (cls?.appetite === 'refer') out.push({ outcome: 'refer', text: `${cls.label}: ${cls.note}` });
    if (b.squareFeet > BOP_LIMITS.squareFeet) out.push({ outcome: 'decline', text: `${b.squareFeet.toLocaleString()} sq ft exceeds the BOP limit of ${BOP_LIMITS.squareFeet.toLocaleString()} — quote Commercial Property / package instead.` });
    if (b.revenue > BOP_LIMITS.sales) out.push({ outcome: 'decline', text: `Gross sales over ${money0(BOP_LIMITS.sales)} per location exceed BOP eligibility — quote a package policy.` });
    if ((b.stories ?? 1) > BOP_LIMITS.stories) out.push({ outcome: 'decline', text: `Buildings over ${BOP_LIMITS.stories} stories are not BOP-eligible.` });
  }
  if (c.lines.includes('contractors')) {
    const trade = contractorTrades.find((t) => t.code === c.contractors.trade);
    if (trade?.appetite === 'no') out.push({ outcome: 'decline', text: `${trade.label}: ${trade.note ?? 'outside appetite'}.` });
    if (trade?.appetite === 'refer') out.push({ outcome: 'refer', text: `${trade.label}: ${trade.note ?? 'underwriter review'}` });
    if (c.contractors.subcontractedPct > 50) out.push({ outcome: 'refer', text: 'More than 50% of work subcontracted — underwriter reviews subcontractor agreements and certificates.' });
  }
  if (c.lines.includes('commercialAuto')) {
    const a = c.commercialAuto;
    const big = (v: CommercialVehicle) => ['Heavy Truck', 'Extra-Heavy Truck', 'Truck-Tractor'].includes(v.bodyType);
    if (a.vehicles.some((v) => big(v) && v.radius === 'Long Haul (200+ mi)')) out.push({ outcome: 'decline', text: 'Long-haul trucking (heavy units over 200 miles) is outside appetite.' });
    if (a.vehicles.some((v) => !big(v) && v.radius === 'Long Haul (200+ mi)')) out.push({ outcome: 'refer', text: 'Long-distance radius on light/medium units — underwriter review.' });
    if (a.vehicles.length > 25) out.push({ outcome: 'refer', text: 'Fleets over 25 units are individually underwritten.' });
    if (a.drivers.some((d) => d.violations + d.accidents >= 3)) out.push({ outcome: 'refer', text: 'A driver has 3+ violations/accidents in 3 years — MVR review.' });
    if (a.vehicles.some((v) => (v.gvw ?? 0) >= CDL_GVW || v.bodyType === 'Truck-Tractor') && a.drivers.some((d) => d.age < 21)) out.push({ outcome: 'refer', text: 'Drivers under 21 are limited to intrastate operation of commercial motor vehicles — underwriter review.' });
  }
  if (c.lines.includes('workersComp')) {
    if (c.workersComp.experienceMod > 1.25) out.push({ outcome: 'refer', text: `E-Mod ${c.workersComp.experienceMod.toFixed(2)} exceeds 1.25 — workers’ compensation refers to underwriting.` });
    if (c.workersComp.classes.some((x) => x.code === '5551')) out.push({ outcome: 'refer', text: 'Roofing payroll (5551) — height and slope restrictions reviewed.' });
    if (c.workersComp.classes.some((x) => x.code === '7219')) out.push({ outcome: 'refer', text: 'Long-distance trucking payroll (7219) — underwriter review.' });
  }
  if ((b.lossCount5yr ?? 0) >= 3) out.push({ outcome: 'refer', text: `${b.lossCount5yr} losses in 5 years — loss runs reviewed by underwriting.` });
  if ((b.lossIncurred5yr ?? 0) > 50000) out.push({ outcome: 'refer', text: `${money0(b.lossIncurred5yr ?? 0)} incurred losses in 5 years — underwriter review.` });
  if (b.yearsInBusiness < 1) out.push({ outcome: 'refer', text: 'New venture — underwriter evaluates the owner’s industry experience and projections.' });
  return out;
}

/** Required information that must be complete before the account can be rated and bound. */
export function commercialValidation(c: CommercialDetails): string[] {
  const p: string[] = [];
  const b = c.business;
  if (!b.businessName.trim()) p.push('Enter the legal business name.');
  if (!b.address.trim() || !/^\d{5}$/.test(b.zip)) p.push('Enter the business location with a 5-digit ZIP.');
  if (b.fein && !/^\d{2}-?\d{7}$/.test(b.fein)) p.push('FEIN must be 9 digits (12-3456789).');
  if (!c.lines.length) p.push('Select at least one commercial line.');
  if (b.revenue <= 0) p.push('Enter annual gross sales.');
  if ((b.protectionClass ?? 4) < 1 || (b.protectionClass ?? 4) > 10) p.push('Protection class must be 1–10.');
  if (c.lines.includes('bop')) {
    if (!b.classCode || !businessClasses.some((x) => x.code === b.classCode)) p.push('Ultrapack Plus: select a business class.');
    if (b.bppLimit < 5000) p.push('Ultrapack Plus: business personal property must be at least $5,000.');
    if (b.squareFeet < 100) p.push('Ultrapack Plus: enter the occupied square footage.');
    const cls = businessClasses.find((x) => x.code === b.classCode);
    if (cls?.basis === 'payroll' && b.payroll <= 0) p.push('Ultrapack Plus: this class is rated on payroll — enter annual payroll.');
    const short = coinsuranceShortfall(b);
    if (short) p.push(`Building limit ${money0(b.buildingLimit)} is below ${b.coinsurance ?? 90}% of estimated replacement cost (${money0(short.required)}) — a coinsurance penalty would apply. Raise the limit.`);
  }
  if (c.lines.includes('contractors')) {
    if (!c.contractors.trade) p.push('Fivestar Contractors: select the trade.');
    if (b.payroll <= 0) p.push('Fivestar Contractors: liability is rated on payroll — enter annual payroll.');
    if (c.contractors.subcontractedPct < 0 || c.contractors.subcontractedPct > 100) p.push('Fivestar Contractors: subcontracted work must be 0–100%.');
  }
  if (c.lines.includes('commercialAuto')) {
    const a = c.commercialAuto;
    if (!a.vehicles.length || !a.drivers.length) p.push('Commercial Auto: add at least one vehicle and one driver.');
    a.vehicles.forEach((v, i) => {
      const name = `Vehicle ${i + 1}${v.make ? ` (${v.year} ${v.make} ${v.model})` : ''}`;
      if (!v.vin || !/^[A-HJ-NPR-Z0-9]{17}$/.test(v.vin)) p.push(`Commercial Auto: ${name} needs a valid 17-character VIN.`);
      if (v.bodyType !== 'Private Passenger' && !(v.gvw && v.gvw > 0)) p.push(`Commercial Auto: ${name} needs its gross vehicle weight.`);
      if (v.costNew <= 0) p.push(`Commercial Auto: ${name} needs a cost new / stated amount.`);
    });
    a.drivers.forEach((d, i) => {
      if (!d.name.trim()) p.push(`Commercial Auto: driver ${i + 1} needs a name for the MVR order.`);
      if (d.age < 18 || d.age > 85) p.push(`Commercial Auto: driver ${d.name || i + 1} age must be 18–85.`);
    });
    if (a.vehicles.some((v) => (v.gvw ?? 0) >= CDL_GVW || v.bodyType === 'Truck-Tractor') && a.drivers.some((d) => !d.cdl)) p.push('Commercial Auto: vehicles of 26,001 lb or more require CDL drivers — mark each driver’s CDL or remove non-CDL drivers.');
  }
  if (c.lines.includes('workersComp')) {
    if (!c.workersComp.classes.some((x) => x.payroll > 0)) p.push('Workers’ Comp: add at least one class code with payroll.');
    if (c.workersComp.classes.some((x) => x.payroll < 0)) p.push('Workers’ Comp: payroll can’t be negative.');
    if (new Set(c.workersComp.classes.map((x) => x.code)).size !== c.workersComp.classes.length) p.push('Workers’ Comp: each class code should appear once — combine the payroll.');
    if (c.workersComp.experienceMod < 0.5 || c.workersComp.experienceMod > 2) p.push('Workers’ Comp: experience mod must be between 0.50 and 2.00.');
  }
  if (c.lines.includes('umbrella')) {
    if (!c.lines.some((l) => l === 'bop' || l === 'contractors')) p.push('Commercial Umbrella: requires underlying general liability (Ultrapack Plus or Fivestar) on this account.');
    if (c.lines.includes('commercialAuto') && c.commercialAuto.liability !== UMBRELLA_UNDERLYING.auto) p.push('Commercial Umbrella: underlying auto liability must be $1,000,000 CSL.');
    if (c.lines.includes('workersComp') && !UMBRELLA_UNDERLYING.el.includes(c.workersComp.employersLiability)) p.push('Commercial Umbrella: underlying employers liability must be at least 500/500/500.');
  }
  return p;
}
