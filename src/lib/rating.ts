import { ruleFor } from '@/lib/stateRules';
import type { AutoCoverages, BoatDetails, Driver, HomeCoverages, HomeForm, LifeDetails, PayPlan, PremiumBreakdown, PremiumLine, Property, RatingPlan, UmbrellaDetails, Vehicle } from '@/data/types';

// Illustrative rating factors for the demo portal. These are not ERIE filed rates.
export const stateFactor: Record<string, number> = { PA: 1, OH: 0.92, WI: 0.95, NY: 1.38, IL: 1.06, IN: 0.94, KY: 1.12, MD: 1.18, NC: 0.97, TN: 1.02, VA: 1.03, WV: 1.08, DC: 1.3 };

// Liability options from state minimums up to a combined single limit (CSL).
export const BI_OPTIONS = ['15/30', '25/50', '30/60', '50/100', '100/300', '250/500', '500/500', '300 CSL', '500 CSL'] as const;
export const PD_OPTIONS = ['5,000', '10,000', '15,000', '20,000', '25,000', '50,000', '100,000', '250,000'] as const;
export const UM_OPTIONS = ['15/30', '25/50', '30/60', '50/100', '100/300', '250/500', '500/500', '500 CSL'] as const;
const biFactor: Record<string, number> = { '15/30': 0.74, '25/50': 0.82, '30/60': 0.85, '50/100': 0.92, '100/300': 1, '250/500': 1.14, '500/500': 1.24, '300 CSL': 1.1, '500 CSL': 1.22 };
const pdFactor: Record<string, number> = { '5,000': 0.78, '10,000': 0.8, '15,000': 0.82, '20,000': 0.84, '25,000': 0.86, '50,000': 0.93, '100,000': 1, '250,000': 1.08 };
const medFactor: Record<string, number> = { None: 0, '1,000': 18, '5,000': 34, '10,000': 52 };
const compDed: Record<number, number> = { 0: 1.35, 100: 1.18, 250: 1, 500: 0.86, 1000: 0.72 };
const collDed: Record<number, number> = { 100: 1.32, 250: 1.16, 500: 1, 1000: 0.82, 2000: 0.7 };

// Per-vehicle roadside / rental options and auto rating plans (illustrative).
export const ROADSIDE_OPTIONS: Record<string, number> = { 'Class 1 - Compact Sedan (Included)': 24, 'Class 2 - Mid-Size Sedan': 32, 'Class 3 - Full-Size / SUV': 44, 'Class 4 - Minivan / Pickup': 52, None: 0 };
export const AUTO_SECURITY_OPTIONS: Record<string, number> = { '- None -': 0, 'New Auto Security': 42 };
export const ratingPlanFactor: Record<RatingPlan, number> = { Exchange: 1, Company: 0.97, 'ErieSecure Auto': 0.93 };

export const PAY_PLANS: PayPlan[] = ['Annual', 'Semi-Annual', 'Quarterly', '9 Month', 'Monthly'];
export const payPlanInstallments: Record<PayPlan, number> = { Annual: 1, 'Semi-Annual': 2, Quarterly: 4, '9 Month': 9, Monthly: 12 };
export const payPlanLabel: Record<PayPlan, string> = { Annual: 'Pay in full', 'Semi-Annual': '2-pay', Quarterly: '4-pay', '9 Month': '9-pay', Monthly: 'Monthly' };
export const INSTALLMENT_FEE = 3;

const round = (value: number) => Math.round(value);
const sum = (lines: PremiumLine[]) => lines.reduce((total, line) => total + line.amount, 0);
export const MINIMUM_PREMIUM_LABEL = 'Minimum premium adjustment';
const withTotal = (b: Omit<PremiumBreakdown, 'total'>, minimum = 0): PremiumBreakdown => {
  const raw = sum(b.lines) + sum(b.discounts);
  if (raw >= minimum) return { ...b, total: raw };
  return { ...b, discounts: [...b.discounts, { label: MINIMUM_PREMIUM_LABEL, amount: minimum - raw }], total: minimum };
};

export function ageFrom(dob: string, asOf = new Date()) {
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00`) : new Date(dob);
  if (Number.isNaN(birth.getTime())) return 40;
  let age = asOf.getFullYear() - birth.getFullYear();
  const beforeBirthday = asOf.getMonth() < birth.getMonth() || (asOf.getMonth() === birth.getMonth() && asOf.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// Underlying limits an umbrella needs: 250/500 split (or 500 CSL) with $100,000 property damage.
export const meetsUmbrellaAutoMinimum = (bi: string, pd: string) => ['250/500', '500/500', '500 CSL'].includes(bi) && ['100,000', '250,000'].includes(pd);
export const UMBRELLA_HOME_MINIMUM = 300000;

// Driver class factor: age, marital status, licensing experience and 3-year incident history.
export function driverFactor(driver: Driver) {
  const age = ageFrom(driver.dob);
  let factor = age < 18 ? 2.3 : age < 20 ? 1.95 : age < 21 ? 1.75 : age < 25 ? 1.4 : age < 30 ? 1.12 : age >= 75 ? 1.15 : age >= 65 ? 0.97 : 1;
  if (driver.maritalStatus === 'Married' && age < 30) factor *= 0.92;
  const licensed = driver.dateFirstLicensed && /^\d{2}\/\d{4}$/.test(driver.dateFirstLicensed) ? new Date().getFullYear() - Number(driver.dateFirstLicensed.slice(3)) : driver.yearsLicensed;
  if (licensed < 1) factor += 0.35; else if (licensed < 3) factor += 0.2;
  factor += driver.violations * 0.18 + driver.accidents * 0.28;
  // A full-time student away at school (100+ miles) without a vehicle is rated as an occasional operator.
  if (driver.collegeStudentAway === 'yes') factor = 1 + (factor - 1) * 0.35;
  return factor;
}

// Vehicle rating symbol from body style (illustrative): [liability, physical damage].
function vehicleSymbol(v: Vehicle): [number, number] {
  const name = `${v.make} ${v.model}`.toUpperCase();
  if (/MUSTANG|CAMARO|CORVETTE|CHALLENGER|CHARGER|WRX|911|MIATA|GT-R/.test(name)) return [1.15, 1.35];
  if (/BMW|TESLA|AUDI|MERCEDES|LEXUS|PORSCHE|CADILLAC|LINCOLN|VOLVO/.test(name)) return [1.02, 1.4];
  if (/F-?150|F-?250|SILVERADO|COLORADO|RAM|TACOMA|TUNDRA|SIERRA|CANYON|RANGER|FRONTIER/.test(name)) return [1.05, 0.95];
  if (/CHEROKEE|CR-V|ESCAPE|EQUINOX|EXPLORER|RAV4|OUTBACK|ENCORE|TAHOE|FORESTER|PILOT|HIGHLANDER|TRAVERSE|ROGUE/.test(name)) return [0.97, 1];
  return [1, 1];
}

const mileageFactor = (miles: number) => (miles <= 0 ? 1 : miles < 5000 ? 0.88 : miles < 10000 ? 0.95 : miles <= 15000 ? 1 : miles <= 20000 ? 1.08 : 1.15);
const useFactor = (v: Vehicle) => (v.use === 'Business' ? 1.2 : v.use === 'Farm' ? 0.9 : v.use === 'Commute' ? ((v.milesToWork ?? 10) > 15 ? 1.12 : 1.05) : 1);

// First-party medical / no-fault premium per vehicle where the state requires it.
const FIRST_PARTY_RATE: Record<string, number> = { PA: 38, KY: 95, NY: 140, MD: 45 };

export type AutoContext = { insuranceScoreHit?: boolean; priorCarrier?: string; priorYears?: string; priorBI?: string };

export function rateAuto(state: string, allDrivers: Driver[], vehicles: Vehicle[], coverages: AutoCoverages, options: { multiPolicy: boolean; payPlan: PayPlan; autoPay: boolean; ratingPlan?: RatingPlan; context?: AutoContext }): PremiumBreakdown {
  // Excluded drivers (named driver exclusion) and non-drivers are not rated.
  const drivers = allDrivers.filter((d) => !d.excluded && d.driverType !== 'Excluded Driver' && d.driverType !== 'Non-Driver');
  const plan = ratingPlanFactor[options.ratingPlan ?? 'Exchange'];
  const perVehicle = vehicles.some((v) => v.coverage);
  const territory = stateFactor[state] ?? 1;
  const rule = ruleFor(state);
  const ctx = options.context ?? {};
  const tort = rule.tortOption && coverages.tort === 'Limited Tort' ? 0.85 : 1;

  // Each vehicle is rated on its assigned operators; drivers not assigned to any vehicle are
  // rated on the vehicle with the highest physical damage exposure (newest). Without
  // assignments (older quotes), the highest-rated driver applies to every vehicle.
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const assigned = vehicles.some((v) => v.primaryOperatorId && byId.has(v.primaryOperatorId));
  const maxFactor = drivers.length ? Math.max(...drivers.map(driverFactor)) : 1;
  const unassigned = drivers.filter((d) => !vehicles.some((v) => v.primaryOperatorId === d.id || v.partTimeOperatorId === d.id));
  const unassignedMax = unassigned.length ? Math.max(...unassigned.map(driverFactor)) : 0;
  const newest = vehicles.reduce<Vehicle | undefined>((best, v) => (!best || v.year > best.year ? v : best), undefined);
  const operatorFactor = (v: Vehicle) => {
    if (!assigned) return maxFactor;
    const primary = byId.get(v.primaryOperatorId ?? '');
    const part = byId.get(v.partTimeOperatorId ?? '');
    let f = primary ? driverFactor(primary) : maxFactor;
    if (part) f = Math.max(f, f * 0.6 + driverFactor(part) * 0.4);
    if (v.id === newest?.id) f = Math.max(f, unassignedMax);
    return f;
  };

  const lines: PremiumLine[] = [];
  vehicles.forEach((vehicle) => {
    const age = Math.max(0, new Date().getFullYear() - vehicle.year);
    const physicalDamage = Math.max(0.35, 1 - age * 0.06);
    const [symLiab, symPhys] = vehicleSymbol(vehicle);
    const base = territory * operatorFactor(vehicle) * useFactor(vehicle) * mileageFactor(vehicle.annualMiles) * plan;
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const ref = vehicle.id;
    const cov = vehicle.coverage;
    const med = cov?.medPay ?? coverages.medicalPayments;
    const comp = cov?.comp ?? coverages.comprehensiveDeductible;
    const coll = cov?.coll ?? coverages.collisionDeductible;
    lines.push({ ref, label: `${label} · Liability`, amount: round(310 * base * symLiab * tort * (biFactor[coverages.bodilyInjury] ?? 1) * (pdFactor[coverages.propertyDamage] ?? 1)) });
    lines.push({ ref, label: `${label} · Uninsured Motorists`, amount: round(30 * territory * plan * tort * (biFactor[coverages.uninsuredMotorist] ?? 1)) });
    lines.push({ ref, label: `${label} · Underinsured Motorists`, amount: round(16 * territory * plan * tort * (biFactor[coverages.underinsuredMotorist ?? coverages.uninsuredMotorist] ?? 1)) });
    if (rule.firstParty && !(rule.firstParty.waivable && coverages.pipWaived)) lines.push({ ref, label: `${label} · ${rule.firstParty.label}`, amount: round((FIRST_PARTY_RATE[state] ?? 40) * territory * plan) });
    if (medFactor[med] && !rule.noFault) lines.push({ ref, label: `${label} · Medical Payments`, amount: round(medFactor[med] * territory * plan) });
    if (cov?.include === false) return;
    lines.push({ ref, label: `${label} · Comprehensive ($${comp} ded.)`, amount: round(118 * base * symPhys * physicalDamage * (compDed[comp] ?? 1)) });
    lines.push({ ref, label: `${label} · Collision ($${coll} ded.)`, amount: round(285 * base * symPhys * physicalDamage * (collDed[coll] ?? 1)) });
    if (cov && ROADSIDE_OPTIONS[cov.roadside]) lines.push({ ref, label: `${label} · Roadside and/or Rental`, amount: ROADSIDE_OPTIONS[cov.roadside] });
    if (cov && AUTO_SECURITY_OPTIONS[cov.autoSecurity]) lines.push({ ref, label: `${label} · ${cov.autoSecurity}`, amount: AUTO_SECURITY_OPTIONS[cov.autoSecurity] });
  });
  const count = Math.max(1, vehicles.length);
  if (coverages.autoPlus) lines.push({ label: 'ERIE Auto Plus® endorsement', amount: 30 });
  if (coverages.emergencyRoadService && !perVehicle) lines.push({ label: `Emergency road service (${count} vehicle${count > 1 ? 's' : ''})`, amount: 14 * count });
  if (coverages.transportationExpense && !perVehicle) lines.push({ label: `Transportation expenses (${count} vehicle${count > 1 ? 's' : ''})`, amount: 22 * count });
  if (coverages.newAutoSecurity && !perVehicle) lines.push({ label: 'New Auto Security', amount: 42 * vehicles.filter((v) => new Date().getFullYear() - v.year <= 2).length });

  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (ctx.priorCarrier === 'No Prior Insurance') discounts.push({ label: 'No prior insurance surcharge', amount: round(subtotal * 0.15) });
  if (options.multiPolicy) discounts.push({ label: 'Multi-policy discount (auto + home) — 10%', amount: -round(subtotal * 0.1) });
  if (vehicles.length >= 2 || vehicles.some((v) => v.forceMultiCar)) discounts.push({ label: 'Multi-car discount', amount: -round(subtotal * 0.12) });
  if (drivers.length > 0 && drivers.every((d) => d.violations === 0 && d.accidents === 0)) discounts.push({ label: 'Safe driving discount', amount: -round(subtotal * 0.1) });
  if (drivers.some((d) => ageFrom(d.dob) < 21 && d.maritalStatus !== 'Married' && d.relationship === 'Child')) discounts.push({ label: 'Young driver discount (under 21, living at home)', amount: -round(subtotal * 0.05) });
  if (drivers.some((d) => d.driverTraining && ageFrom(d.dob) < 25)) discounts.push({ label: 'Driver training discount', amount: -round(subtotal * 0.03) });
  if (vehicles.some((v) => v.reducedUsage)) discounts.push({ label: 'Reduced usage discount (90+ days)', amount: -round(subtotal * 0.04) });
  if (vehicles.some((v) => v.antiTheft || v.airbags || v.antiLock || (v.antiTheftDevice && v.antiTheftDevice !== 'No'))) discounts.push({ label: 'Car safety equipment discount', amount: -round(subtotal * 0.05) });
  if (ctx.insuranceScoreHit) discounts.push({ label: 'Insurance score (favorable tier)', amount: -round(subtotal * 0.08) });
  if (ctx.priorCarrier && ctx.priorCarrier !== 'No Prior Insurance' && /3|4|5/.test(ctx.priorYears ?? '')) discounts.push({ label: 'Prior insurance (3+ years continuous)', amount: -round(subtotal * 0.05) });
  if (options.payPlan === 'Annual') discounts.push({ label: 'Annual payment plan discount', amount: -round(subtotal * 0.05) });

  return withTotal({ product: 'Auto', name: 'ERIE Auto', lines, discounts });
}

export const homeFormName: Record<HomeForm, string> = { 'HO-3': 'ErieSecure Home® (HO-3)', 'HO-4': 'Renters (HO-4)', 'HO-6': 'Condominium Unit-Owners (HO-6)', 'DP-3': 'Rental Dwelling / Landlord (DP-3)' };

// HO-4, HO-6 and DP-3 forms. HO-3 is rated by rateHome below.
function rateHomeForm(state: string, property: Property, c: HomeCoverages, form: Exclude<HomeForm, 'HO-3'>, options: { multiPolicy: boolean; earlyQuote: boolean; context?: HomeContext }): PremiumBreakdown {
  const territory = stateFactor[state] ?? 1;
  const dedFactor = ({ 500: 1.12, 1000: 1, 2500: 0.86, 5000: 0.76 } as Record<number, number>)[c.deductible] ?? 1;
  const protectionLoad = 0.88 + property.protectionClass * 0.035;
  const contents = c.contentsLimit ?? 0;
  const lines: PremiumLine[] = [];
  if (form === 'HO-4') {
    const cPrem = round((contents / 1000) * 4.2 * territory * protectionLoad * dedFactor);
    lines.push({ label: `Coverage C · Personal property — ${money(contents)} (replacement cost)`, amount: cPrem });
    lines.push({ label: `Coverage D · Loss of use — ${money(contents * 0.3)}`, amount: round(cPrem * 0.08) });
  } else if (form === 'HO-6') {
    const aPrem = round((c.dwelling / 1000) * 2.1 * territory * protectionLoad * dedFactor);
    const cPrem = round((contents / 1000) * 3.4 * territory * protectionLoad * dedFactor);
    lines.push({ label: `Coverage A · Building additions & alterations — ${money(c.dwelling)}`, amount: aPrem });
    lines.push({ label: `Coverage C · Personal property — ${money(contents)}`, amount: cPrem });
    lines.push({ label: `Coverage D · Loss of use — ${money(contents * 0.4)}`, amount: round(cPrem * 0.1) });
    lines.push({ label: 'Loss assessment — $50,000', amount: 28 });
  } else {
    const age = Math.max(0, new Date().getFullYear() - property.yearBuilt);
    const roofLoad = new Date().getFullYear() - property.roofYear > 20 ? 1.18 : 1;
    const aPrem = round((c.dwelling / 1000) * 3.6 * territory * (age > 50 ? 1.15 : 1) * roofLoad * (property.construction === 'Frame' ? 1.06 : 0.95) * protectionLoad * dedFactor);
    lines.push({ label: `Coverage A · Dwelling (rental) — ${money(c.dwelling)}`, amount: aPrem });
    lines.push({ label: `Coverage B · Other structures — ${money(c.dwelling * (c.otherStructuresPct ?? 10) / 100)}`, amount: round(aPrem * 0.04) });
    if (contents) lines.push({ label: `Coverage C · Landlord furnishings — ${money(contents)}`, amount: round((contents / 1000) * 3 * territory) });
    lines.push({ label: `Coverage D · Fair rental value — ${money(c.dwelling * (c.lossOfUsePct ?? 10) / 100)}`, amount: round(aPrem * 0.05) });
  }
  const liabilityLabel = form === 'DP-3' ? 'Coverage L · Premises liability' : 'Coverage E · Personal liability';
  lines.push({ label: `${liabilityLabel} — ${money(c.personalLiability)}`, amount: round((form === 'DP-3' ? 45 : 18) + c.personalLiability / (form === 'DP-3' ? 15000 : 30000)) });
  lines.push({ label: `${form === 'DP-3' ? 'Coverage M' : 'Coverage F'} · Medical payments — ${money(c.medicalPayments)}`, amount: round(5 + c.medicalPayments / 1000) });
  if (c.waterBackup) lines.push({ label: 'Water backup & sump discharge', amount: form === 'DP-3' ? 65 : 35 });
  if (c.identityRecovery && form !== 'DP-3') lines.push({ label: 'Identity recovery', amount: 25 });
  if (c.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: form === 'DP-3' ? 30 : 20 });
  if (c.serviceLine && form === 'DP-3') lines.push({ label: 'Service line (underground utility lines)', amount: 22 });
  if (c.scheduledValuables > 0 && form !== 'DP-3') lines.push({ label: `Scheduled valuables — ${money(c.scheduledValuables)}`, amount: round(c.scheduledValuables * 0.012) });

  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (options.multiPolicy) discounts.push({ label: `Multi-policy discount (auto + home) — 15%`, amount: -round(subtotal * 0.15) });
  const protective = (property.smokeAlarms ? 1 : 0) + (property.alarm === 'Central' || property.burglarAlarm ? 1 : property.alarm === 'Local' ? 0.5 : 0) + (property.sprinklers ? 1 : 0);
  if (protective) discounts.push({ label: 'Protective device discount', amount: -round(subtotal * 0.03 * protective) });
  if (options.earlyQuote) discounts.push({ label: 'Advance quote discount (7+ days)', amount: -round(subtotal * 0.04) });
  if (options.context?.insuranceScoreHit) discounts.push({ label: 'Insurance score (favorable tier)', amount: -round(subtotal * 0.08) });
  if (options.context?.propertyClaims) discounts.push({ label: `Prior property loss surcharge (${options.context.propertyClaims})`, amount: round(subtotal * 0.12 * options.context.propertyClaims) });
  // Small policies still carry a minimum premium.
  return withTotal({ product: 'Home', name: homeFormName[form], lines, discounts }, form === 'HO-4' ? 120 : 175);
}

export type HomeContext = { insuranceScoreHit?: boolean; propertyClaims?: number };

export function rateHome(state: string, property: Property, coverages: HomeCoverages, options: { multiPolicy: boolean; earlyQuote: boolean; payPlan: PayPlan; context?: HomeContext }): PremiumBreakdown {
  const form = coverages.form ?? 'HO-3';
  if (form !== 'HO-3') return rateHomeForm(state, property, coverages, form, options);
  const territory = stateFactor[state] ?? 1;
  const age = Math.max(0, new Date().getFullYear() - property.yearBuilt);
  const ageLoad = age > 60 ? 1.22 : age > 30 ? 1.1 : 1;
  const roofAge = new Date().getFullYear() - property.roofYear;
  const roofLoad = roofAge > 20 ? 1.18 : roofAge > 12 ? 1.06 : 1;
  const constructionLoad = property.construction === 'Frame' ? 1.06 : property.construction === 'Fire Resistive' ? 0.88 : 0.95;
  const protectionLoad = 0.88 + property.protectionClass * 0.035;
  const dedFactor: Record<number, number> = { 500: 1.12, 1000: 1, 2500: 0.86, 5000: 0.76 };
  // Roof surface, loss settlement and perils options (illustrative relativities).
  const roofMaterialLoad = ({ Metal: 0.95, Slate: 0.95, Tile: 0.97, 'Wood Shake': 1.15, '3-Tab Composition Shingle': 1.04 } as Record<string, number>)[property.roofMaterial ?? ''] ?? 1;
  const settlement = property.lossSettlement ?? 'Guaranteed Replacement Cost';
  const settlementLoad = settlement === 'Actual Cash Value' ? 0.82 : settlement === 'Replacement Cost' ? 0.95 : 1;
  const perilsLoad = property.perils === 'Named Perils' ? 0.88 : 1;
  const familiesLoad = 1 + Math.max(0, (property.families ?? 1) - 1) * 0.1;
  const dwellingPremium = round((coverages.dwelling / 1000) * 2.9 * territory * ageLoad * roofLoad * roofMaterialLoad * constructionLoad * protectionLoad * settlementLoad * perilsLoad * familiesLoad * (dedFactor[coverages.deductible] ?? 1));
  const contentsLoad = (property.ppLossSettlement === 'Actual Cash Value' ? 0.85 : 1) * (property.ppPerils === 'Named Perils' ? 0.9 : 1);
  const b = coverages.otherStructuresPct ?? 10;
  const c = coverages.personalPropertyPct ?? 70;
  const d = coverages.lossOfUsePct ?? 20;

  const lines: PremiumLine[] = [
    { label: `Coverage A · Dwelling — ${money(coverages.dwelling)} (${settlement}${property.perils === 'Named Perils' ? ', named perils' : ''})`, amount: dwellingPremium },
    { label: `Coverage B · Other structures (${Math.round(b)}%) — ${money(coverages.dwelling * b / 100)}`, amount: round(dwellingPremium * 0.04 * (b / 10)) },
    { label: `Coverage C · Personal property (${Math.round(c)}%) — ${money(coverages.dwelling * c / 100)}${property.ppLossSettlement === 'Actual Cash Value' ? ' (actual cash value)' : ''}`, amount: round(dwellingPremium * 0.12 * (c / 70) * contentsLoad) },
    { label: `Coverage D · Loss of use (${d}%) — ${money(coverages.dwelling * d / 100)}`, amount: round(dwellingPremium * 0.03 * (d / 20)) },
    { label: `Coverage E · Personal liability — ${money(coverages.personalLiability)}`, amount: round(24 + coverages.personalLiability / 25000) },
    { label: `Coverage F · Medical payments — ${money(coverages.medicalPayments)}`, amount: round(6 + coverages.medicalPayments / 1000) },
  ];
  // A percentage wind/hail deductible earns a credit on the dwelling premium.
  const windHail = { '1% of Dwelling': 0.04, '2% of Dwelling': 0.07 }[coverages.windHailDeductible ?? ''] ?? 0;
  if (windHail) lines.push({ label: `Wind/hail deductible credit (${coverages.windHailDeductible})`, amount: -round(dwellingPremium * windHail) });
  // Roof surfaces settled on a payment schedule by roof age for wind or hail losses.
  if (property.roofWindHailSettlement === 'Yes') lines.push({ label: 'Roof surfaces wind/hail payment schedule credit', amount: -round(dwellingPremium * 0.06) });
  if (property.swimmingPool) lines.push({ label: 'Swimming pool liability exposure', amount: 45 });
  if (coverages.waterBackup) lines.push({ label: 'Water backup & sump discharge', amount: 65 });
  if (coverages.identityRecovery) lines.push({ label: 'Identity recovery', amount: 25 });
  if (coverages.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: 30 });
  if (coverages.serviceLine) lines.push({ label: 'Service line (underground utility lines)', amount: 22 });
  if (coverages.homeSharing) lines.push({ label: 'Home-sharing host coverage', amount: 55 });
  if (coverages.scheduledValuables > 0) lines.push({ label: `Scheduled valuables — ${money(coverages.scheduledValuables)}`, amount: round(coverages.scheduledValuables * 0.012) });

  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (options.multiPolicy) discounts.push({ label: 'Multi-policy discount (auto + home) — 15%', amount: -round(subtotal * 0.15) });
  // Smoke alarms, a burglar alarm (central counts fully, local half) and automatic sprinklers.
  const protective = (property.smokeAlarms ? 1 : 0) + (property.alarm === 'Central' || property.burglarAlarm ? 1 : property.alarm === 'Local' ? 0.5 : 0) + (property.sprinklers ? 1 : 0);
  if (protective) discounts.push({ label: 'Protective device discount', amount: -round(subtotal * 0.03 * protective) });
  if (options.earlyQuote) discounts.push({ label: 'Advance quote discount (7+ days)', amount: -round(subtotal * 0.04) });
  if (age < 10) discounts.push({ label: 'Newer home discount', amount: -round(subtotal * 0.05) });
  if (options.context?.insuranceScoreHit) discounts.push({ label: 'Insurance score (favorable tier)', amount: -round(subtotal * 0.08) });
  if (options.context?.propertyClaims) discounts.push({ label: `Prior property loss surcharge (${options.context.propertyClaims})`, amount: round(subtotal * 0.12 * options.context.propertyClaims) });

  return withTotal({ product: 'Home', name: 'ErieSecure Home®', lines, discounts });
}

export function rateUmbrella(state: string, u: UmbrellaDetails): PremiumBreakdown {
  const territory = stateFactor[state] ?? 1;
  const millions = Math.max(1, Math.round(u.limit / 1000000));
  // ~$200/yr for the first $1M, with each additional million cheaper than the last.
  const base = [0, 205, 330, 435, 525, 605][millions] ?? 605;
  const lines: PremiumLine[] = [{ label: `Personal Catastrophe Liability — ${money(u.limit)}`, amount: round(base * territory) }];
  const extraAutos = Math.max(0, u.autoExposures - 2);
  const extraHomes = Math.max(0, u.residences - 1);
  if (extraAutos) lines.push({ label: `Additional autos (${extraAutos})`, amount: round(28 * extraAutos * territory) });
  if (u.youthfulOperators) lines.push({ label: `Youthful operators under 25 (${u.youthfulOperators})`, amount: round(85 * u.youthfulOperators * territory) });
  if (u.watercraft) lines.push({ label: `Watercraft (${u.watercraft})`, amount: 32 * u.watercraft });
  if (u.recreationalVehicles) lines.push({ label: `Recreational vehicles — golf carts, ATVs (${u.recreationalVehicles})`, amount: 18 * u.recreationalVehicles });
  if (extraHomes) lines.push({ label: `Additional residences (${extraHomes})`, amount: 30 * extraHomes });
  return withTotal({ product: 'Umbrella', name: 'Personal Catastrophe Liability (Umbrella)', lines, discounts: [] });
}

export function rateBoat(state: string, boat: BoatDetails, options: { multiPolicy: boolean; payPlan: PayPlan }): PremiumBreakdown {
  const territory = stateFactor[state] ?? 1;
  const engineRate = { Outboard: 0.014, 'Inboard/Outboard': 0.017, Inboard: 0.018, Jet: 0.026 }[boat.engine];
  const hullRate = boat.hullType === 'Personal Watercraft' ? 0.026 : engineRate;
  const watersLoad = { 'Inland lakes & rivers': 1, 'Great Lakes': 1.15, Coastal: 1.3 }[boat.waters];
  const hpLoad = boat.horsepower > 200 ? 1.15 : boat.horsepower < 60 ? 0.9 : 1;
  const storageLoad = boat.storage === 'Marina slip' ? 1.05 : 1;
  const dedFactor: Record<number, number> = { 250: 1.12, 500: 1, 1000: 0.88, 2500: 0.75 };
  const lines: PremiumLine[] = [
    { label: `Physical damage — agreed value ${money(boat.agreedValue)} (${money(boat.deductible)} ded.)`, amount: round(boat.agreedValue * hullRate * watersLoad * hpLoad * storageLoad * (dedFactor[boat.deductible] ?? 1) * territory) },
    { label: `Watercraft liability — ${money(boat.liability)}`, amount: round(({ 300000: 85, 500000: 110, 1000000: 140 }[boat.liability] ?? 85) * territory * hpLoad) },
    { label: 'Medical payments — $5,000', amount: 20 },
    { label: 'Uninsured boaters', amount: 18 },
  ];
  if (boat.trailerValue > 0) lines.push({ label: `Trailer — ${money(boat.trailerValue)}`, amount: round(boat.trailerValue * 0.01) });
  if (boat.towing) lines.push({ label: 'On-water towing & assistance', amount: 25 });
  if (boat.fishingEquipment > 0) lines.push({ label: `Fishing equipment — ${money(boat.fishingEquipment)}`, amount: round(boat.fishingEquipment * 0.02) });
  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (options.multiPolicy) discounts.push({ label: 'Multi-policy discount', amount: -round(subtotal * 0.1) });
  if (boat.safetyCourse) discounts.push({ label: 'Boating safety course discount', amount: -round(subtotal * 0.1) });
  if (boat.operatorYears >= 5) discounts.push({ label: 'Experienced operator discount', amount: -round(subtotal * 0.05) });
  if (options.payPlan === 'Annual') discounts.push({ label: 'Pay-in-full discount', amount: -round(subtotal * 0.05) });
  return withTotal({ product: 'Boat', name: 'Boat & Watercraft', lines, discounts }, 100);
}

export const bmi = (heightIn: number, weightLb: number) => (heightIn > 0 ? Math.round(((weightLb / (heightIn * heightIn)) * 703) * 10) / 10 : 0);

// Health class actually rated: build (BMI) and tobacco can move the applicant below the requested class.
export function ratedLifeClass(life: LifeDetails): LifeDetails['healthClass'] {
  const order: LifeDetails['healthClass'][] = ['Preferred Plus', 'Preferred', 'Standard Plus', 'Standard'];
  const value = bmi(life.heightIn, life.weightLb);
  let index = order.indexOf(life.healthClass);
  if (value > 30) index = Math.max(index, 2);
  if (value > 34) index = 3;
  if (life.tobacco) index = Math.max(index, 2);
  return order[index];
}

export function rateLife(age: number, life: LifeDetails): PremiumBreakdown {
  const termFactor = { 10: 0.8, 15: 0.9, 20: 1, 30: 1.3 }[life.term];
  const ratedClass = ratedLifeClass(life);
  const classFactor = { 'Preferred Plus': 0.85, Preferred: 1, 'Standard Plus': 1.2, Standard: 1.45 }[ratedClass];
  const perThousand = (0.25 + age * age * 0.0005) * termFactor * classFactor * (life.tobacco ? 2.6 : 1);
  const lines: PremiumLine[] = [
    { label: `${money(life.faceAmount)} · ${life.term}-year level term · ${ratedClass} ${life.tobacco ? 'tobacco' : 'non-tobacco'}`, amount: round((life.faceAmount / 1000) * perThousand) },
    { label: 'Annual policy fee', amount: 60 },
  ];
  if (life.acceleratedBenefit) lines.push({ label: 'Accelerated death benefit rider', amount: 0 });
  if (life.childRider) lines.push({ label: 'Children’s term rider — $10,000', amount: 50 });
  if (life.waiverOfPremium) lines.push({ label: 'Waiver of premium rider', amount: round(lines[0].amount * 0.06) });
  return withTotal({ product: 'Life', name: 'ERIExpress Life', lines, discounts: [] });
}

export function installmentSchedule(total: number, plan: PayPlan, autoPay: boolean) {
  const count = payPlanInstallments[plan];
  const fee = count > 1 && !autoPay ? INSTALLMENT_FEE : 0;
  const installment = Math.round((total / count) * 100) / 100;
  const last = Math.round((total - installment * (count - 1)) * 100) / 100;
  return { count, installment, last, fee, perPayment: installment + fee, totalCost: Math.round((total + fee * count) * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Account-level quote: bundle credits, taxes and payment schedule across lines.
// ---------------------------------------------------------------------------

export interface RatingFactors {
  homeCoverageA: number;
  autoVehiclesCount: number;
  autoDriversCount: number;
  umbrellaLimit: number;
  commercialPayroll: number;
  commercialRevenue: number;
  hasMultiPolicyBundle: boolean;
}

export type QuoteLineKey = 'auto' | 'home' | 'umbrella' | 'boat' | 'life' | `commercial:${string}`;
export type RatedLine = { key: QuoteLineKey; breakdown: PremiumBreakdown; tax: number };

export type ErieQuoteResult = {
  lines: RatedLine[];
  bundleCredits: PremiumLine[];
  taxes: PremiumLine[];
  premium: number;
  total: number;
  factors: RatingFactors;
  schedule: ReturnType<typeof installmentSchedule>;
};

// State premium taxes and surcharges passed to the policyholder (illustrative rates).
function taxRate(state: string, key: QuoteLineKey) {
  if (key === 'life') return { rate: 0, label: '' };
  if (state === 'KY') return { rate: 0.05, label: 'Kentucky local government premium tax (est. 5%)' };
  if (state === 'WV') return { rate: 0.01, label: 'West Virginia premium surcharge (1%)' };
  return { rate: 0, label: '' };
}

function applyCredit(b: PremiumBreakdown, label: string, pct: number): PremiumBreakdown {
  if (b.discounts.some((d) => d.label === MINIMUM_PREMIUM_LABEL)) return b;
  const credit = -round(b.total * pct);
  return credit ? { ...b, discounts: [...b.discounts, { label, amount: credit }], total: b.total + credit } : b;
}

/**
 * Combines per-line breakdowns into one account quote.
 * Auto + home multi-policy discounts (10% auto / 15% home) are applied inside rateAuto/rateHome.
 * Here: auto + home + umbrella earns an extra 5% on those lines, and any personal + commercial
 * account earns a further 5% multi-policy credit on every line.
 */
export function calculateErieQuote(input: { state: string; payPlan: PayPlan; autoPay: boolean; lines: { key: QuoteLineKey; breakdown: PremiumBreakdown }[]; factors: Omit<RatingFactors, 'hasMultiPolicyBundle'> }): ErieQuoteResult {
  const has = (k: string) => input.lines.some((l) => l.key === k || l.key.startsWith(`${k}:`));
  const personal = input.lines.some((l) => !l.key.startsWith('commercial:'));
  const tripleBundle = has('auto') && has('home') && has('umbrella');
  const crossBundle = personal && has('commercial');
  const bundleCredits: PremiumLine[] = [];

  const lines: RatedLine[] = input.lines.map(({ key, breakdown }) => {
    let b = breakdown;
    if (tripleBundle && (key === 'auto' || key === 'home' || key === 'umbrella')) b = applyCredit(b, 'Auto + Home + Umbrella bundle credit — 5%', 0.05);
    if (crossBundle) b = applyCredit(b, 'Personal + commercial multi-policy credit — 5%', 0.05);
    const { rate } = taxRate(input.state, key);
    return { key, breakdown: b, tax: round(b.total * rate) };
  });

  input.lines.forEach(({ key, breakdown }, i) => {
    breakdown.discounts.filter((d) => /multi-policy/i.test(d.label)).forEach((d) => bundleCredits.push({ label: `${breakdown.name ?? key}: ${d.label}`, amount: d.amount }));
    lines[i].breakdown.discounts.slice(breakdown.discounts.length).forEach((d) => bundleCredits.push({ label: `${breakdown.name ?? key}: ${d.label}`, amount: d.amount }));
  });

  const taxes: PremiumLine[] = [];
  lines.forEach((l) => {
    const { label } = taxRate(input.state, l.key);
    if (!l.tax) return;
    const existing = taxes.find((t) => t.label === label);
    if (existing) existing.amount += l.tax; else taxes.push({ label, amount: l.tax });
  });

  const premium = lines.reduce((s, l) => s + l.breakdown.total, 0);
  const total = premium + sum(taxes);
  return {
    lines,
    bundleCredits,
    taxes,
    premium,
    total,
    factors: { ...input.factors, hasMultiPolicyBundle: (has('auto') && has('home')) || tripleBundle || crossBundle },
    schedule: installmentSchedule(total, input.payPlan, input.autoPay),
  };
}

export const money = (value: number, cents = false) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
