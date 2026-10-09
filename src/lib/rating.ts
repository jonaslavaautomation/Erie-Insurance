import type { AutoCoverages, BoatDetails, Driver, HomeCoverages, LifeDetails, PayPlan, PremiumBreakdown, PremiumLine, Property, Vehicle } from '@/data/types';

// Illustrative rating factors for the demo portal. These are not ERIE filed rates.
const stateFactor: Record<string, number> = { PA: 1, OH: 0.92, WI: 0.95, NY: 1.38, IL: 1.06, IN: 0.94, KY: 1.12, MD: 1.18, NC: 0.97, TN: 1.02, VA: 1.03, WV: 1.08, DC: 1.3 };
const biFactor: Record<string, number> = { '25/50': 0.82, '50/100': 0.92, '100/300': 1, '250/500': 1.14, '500/500': 1.24 };
const pdFactor: Record<string, number> = { '25,000': 0.86, '50,000': 0.93, '100,000': 1, '250,000': 1.08 };
const medFactor: Record<string, number> = { None: 0, '1,000': 18, '5,000': 34, '10,000': 52 };
const compDed: Record<number, number> = { 0: 1.35, 100: 1.18, 250: 1, 500: 0.86, 1000: 0.72 };
const collDed: Record<number, number> = { 250: 1.16, 500: 1, 1000: 0.82, 2000: 0.7 };

export const payPlanInstallments: Record<PayPlan, number> = { Annual: 1, Quarterly: 4, '9 Month': 9, Monthly: 12 };
export const INSTALLMENT_FEE = 3;

const round = (value: number) => Math.round(value);
const sum = (lines: PremiumLine[]) => lines.reduce((total, line) => total + line.amount, 0);

export function ageFrom(dob: string, asOf = new Date()) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 40;
  let age = asOf.getFullYear() - birth.getFullYear();
  const beforeBirthday = asOf.getMonth() < birth.getMonth() || (asOf.getMonth() === birth.getMonth() && asOf.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function driverFactor(driver: Driver) {
  const age = ageFrom(driver.dob);
  let factor = age < 21 ? 1.85 : age < 25 ? 1.4 : age < 30 ? 1.12 : age > 75 ? 1.15 : 1;
  factor += driver.violations * 0.18 + driver.accidents * 0.28;
  return factor;
}

export function rateAuto(state: string, drivers: Driver[], vehicles: Vehicle[], coverages: AutoCoverages, options: { multiPolicy: boolean; payPlan: PayPlan; autoPay: boolean }): PremiumBreakdown {
  const territory = stateFactor[state] ?? 1;
  const driverLoad = drivers.length === 0 ? 1 : Math.max(...drivers.map(driverFactor));
  const lines: PremiumLine[] = [];
  vehicles.forEach((vehicle) => {
    const age = Math.max(0, new Date().getFullYear() - vehicle.year);
    const physicalDamage = Math.max(0.35, 1 - age * 0.06);
    const useLoad = vehicle.use === 'Business' ? 1.2 : vehicle.use === 'Commute' ? 1.08 : 1;
    const mileLoad = vehicle.annualMiles > 15000 ? 1.08 : vehicle.annualMiles < 7500 ? 0.94 : 1;
    const base = territory * driverLoad * useLoad * mileLoad;
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    lines.push({ label: `${label} · Liability`, amount: round(310 * base * (biFactor[coverages.bodilyInjury] ?? 1) * (pdFactor[coverages.propertyDamage] ?? 1)) });
    lines.push({ label: `${label} · Uninsured/Underinsured Motorists`, amount: round(46 * territory * (biFactor[coverages.uninsuredMotorist] ?? 1)) });
    if (medFactor[coverages.medicalPayments]) lines.push({ label: `${label} · Medical/First Party Benefits`, amount: round(medFactor[coverages.medicalPayments] * territory) });
    lines.push({ label: `${label} · Comprehensive ($${coverages.comprehensiveDeductible} ded.)`, amount: round(118 * base * physicalDamage * (compDed[coverages.comprehensiveDeductible] ?? 1)) });
    lines.push({ label: `${label} · Collision ($${coverages.collisionDeductible} ded.)`, amount: round(285 * base * physicalDamage * (collDed[coverages.collisionDeductible] ?? 1)) });
  });
  if (coverages.autoPlus) lines.push({ label: 'ERIE Auto Plus® endorsement', amount: 30 });
  if (coverages.roadsideRentals) lines.push({ label: 'Roadside & Rentals package', amount: 34 * Math.max(1, vehicles.length) });
  if (coverages.newAutoSecurity) lines.push({ label: 'New Auto Security', amount: 42 * vehicles.filter((v) => new Date().getFullYear() - v.year <= 2).length });

  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (options.multiPolicy) discounts.push({ label: 'Multi-policy discount', amount: -round(subtotal * 0.16) });
  if (drivers.length > 0 && drivers.every((d) => d.violations === 0 && d.accidents === 0)) discounts.push({ label: 'Safe driving discount', amount: -round(subtotal * 0.1) });
  if (drivers.some((d) => ageFrom(d.dob) < 21 && d.maritalStatus === 'Single' && d.relationship === 'Child')) discounts.push({ label: 'Youthful driver discount', amount: -round(subtotal * 0.05) });
  if (drivers.some((d) => d.driverTraining && ageFrom(d.dob) < 25)) discounts.push({ label: 'Driver training discount', amount: -round(subtotal * 0.03) });
  if (vehicles.some((v) => v.reducedUsage)) discounts.push({ label: 'Reduced usage discount (90+ days)', amount: -round(subtotal * 0.04) });
  if (vehicles.some((v) => v.antiTheft || v.airbags || v.antiLock)) discounts.push({ label: 'Car safety equipment discount', amount: -round(subtotal * 0.05) });
  if (options.payPlan === 'Annual') discounts.push({ label: 'Pay-in-full discount', amount: -round(subtotal * 0.05) });

  return { product: 'Auto', lines, discounts, total: Math.max(0, subtotal + sum(discounts)) };
}

export function rateHome(state: string, property: Property, coverages: HomeCoverages, options: { multiPolicy: boolean; earlyQuote: boolean; payPlan: PayPlan }): PremiumBreakdown {
  const territory = stateFactor[state] ?? 1;
  const age = Math.max(0, new Date().getFullYear() - property.yearBuilt);
  const ageLoad = age > 60 ? 1.22 : age > 30 ? 1.1 : age < 10 ? 0.9 : 1;
  const roofAge = new Date().getFullYear() - property.roofYear;
  const roofLoad = roofAge > 20 ? 1.18 : roofAge > 12 ? 1.06 : 1;
  const constructionLoad = property.construction === 'Frame' ? 1.06 : 0.95;
  const protectionLoad = 0.88 + property.protectionClass * 0.035;
  const dedFactor: Record<number, number> = { 500: 1.12, 1000: 1, 2500: 0.86, 5000: 0.76 };
  const dwellingPremium = round((coverages.dwelling / 1000) * 2.9 * territory * ageLoad * roofLoad * constructionLoad * protectionLoad * (dedFactor[coverages.deductible] ?? 1));

  const lines: PremiumLine[] = [
    { label: `Dwelling — $${coverages.dwelling.toLocaleString()} (Guaranteed Replacement Cost)`, amount: dwellingPremium },
    { label: `Other structures — $${round(coverages.dwelling * 0.1).toLocaleString()}`, amount: round(dwellingPremium * 0.04) },
    { label: `Personal property — $${round(coverages.dwelling * 0.7).toLocaleString()}`, amount: round(dwellingPremium * 0.12) },
    { label: 'Loss of use — actual loss sustained', amount: round(dwellingPremium * 0.03) },
    { label: `Personal liability — $${coverages.personalLiability.toLocaleString()}`, amount: round(24 + coverages.personalLiability / 25000) },
    { label: `Medical payments — $${coverages.medicalPayments.toLocaleString()}`, amount: round(6 + coverages.medicalPayments / 1000) },
  ];
  if (coverages.waterBackup) lines.push({ label: 'Sewer or drain backup / sump overflow', amount: 65 });
  if (coverages.identityRecovery) lines.push({ label: 'Identity recovery', amount: 25 });
  if (coverages.equipmentBreakdown) lines.push({ label: 'Equipment breakdown', amount: 30 });
  if (coverages.serviceLine) lines.push({ label: 'Service line coverage', amount: 22 });
  if (coverages.homeSharing) lines.push({ label: 'Home-sharing host coverage', amount: 55 });
  if (coverages.scheduledValuables > 0) lines.push({ label: `Scheduled valuables — $${coverages.scheduledValuables.toLocaleString()}`, amount: round(coverages.scheduledValuables * 0.012) });

  const subtotal = sum(lines);
  const discounts: PremiumLine[] = [];
  if (options.multiPolicy) discounts.push({ label: 'Multi-policy discount', amount: -round(subtotal * 0.2) });
  const protective = [property.smokeAlarms, property.burglarAlarm, property.sprinklers].filter(Boolean).length;
  if (protective) discounts.push({ label: 'Protective device discount', amount: -round(subtotal * 0.03 * protective) });
  if (options.earlyQuote) discounts.push({ label: 'Advance quote discount (7+ days)', amount: -round(subtotal * 0.04) });
  if (age < 10) discounts.push({ label: 'Newer home discount', amount: -round(subtotal * 0.05) });

  return { product: 'Home', lines, discounts, total: Math.max(0, subtotal + sum(discounts)) };
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
  return { product: 'Boat', lines, discounts, total: Math.max(100, subtotal + sum(discounts)) };
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
  return { product: 'Life', lines, discounts: [], total: sum(lines) };
}

export function installmentSchedule(total: number, plan: PayPlan, autoPay: boolean) {
  const count = payPlanInstallments[plan];
  const fee = count > 1 && !autoPay ? INSTALLMENT_FEE : 0;
  const installment = Math.round((total / count) * 100) / 100;
  return { count, installment, fee, perPayment: installment + fee, totalCost: Math.round((installment + fee) * count * 100) / 100 };
}

export const money = (value: number, cents = false) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
