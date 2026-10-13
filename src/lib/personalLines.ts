import type { AutoCoverages, Driver, PersonalLinesInfo, ProductKey, Property, Quote, ReportRow, Vehicle, VehicleCoverage } from '@/data/types';
import { ageFrom } from '@/lib/rating';

/*
 * Personal lines quoting: Customer → Drivers → Vehicles → Dwelling → Reports → Coverages.
 * Household prefill, VIN decoding, reports and the home cost estimator are mock services:
 * deterministic, local, and populated only with fictional people and vehicles.
 */

export type PlStep = 'customer' | 'drivers' | 'vehicles' | 'dwelling' | 'reports' | 'coverages';
export const PL_STEPS: PlStep[] = ['customer', 'drivers', 'vehicles', 'dwelling', 'reports', 'coverages'];

export const stepsForQuote = (q: Quote): PlStep[] => PL_STEPS.filter((s) => (s === 'drivers' || s === 'vehicles' ? q.products.includes('auto') : s === 'dwelling' ? q.products.includes('home') : true));

export const blankPl = (): PersonalLinesInfo => ({ prefillDone: false, secondNamedInsuredId: '', mailing3Years: '', livesAtMailing: '', isPropertyLocation: '', county: '', township: '', autoCarrier: '', autoYears: '', priorBodilyInjury: '', homeCarrier: '', additionalPolicies: [], completed: [], reports: [], ratingPlan: 'Exchange', rated: false, ratedAt: '', convert: [] });

// ---- Formatting -------------------------------------------------------------------------------

/** ISO date (yyyy-mm-dd) → mm/dd/yyyy */
export const usDate = (iso: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : '');
export const maskDob = (iso: string) => (iso ? `**/**/${iso.slice(0, 4)}` : '--');
export const maskTail = (value?: string, keep = 4) => (value ? `${'*'.repeat(Math.max(0, value.length - keep))}${value.slice(-keep)}` : '--');
export const maskLicense = (state: string, num: string) => (num ? `${state} ${num.slice(0, -4)}****` : state ? `${state} --` : '--');
export const relationshipLabel = (d: Driver) => (d.relationship === 'Named Insured' ? 'Insured' : d.relationship === 'Other Household' ? 'Other' : d.relationship);
export const vehicleUseLabel = (v: Vehicle) => (v.use === 'Commute' ? 'Work/School' : v.use);
export const personName = (d: Pick<Driver, 'firstName' | 'lastName'>) => `${d.firstName} ${d.lastName}`.trim();

// ---- VIN --------------------------------------------------------------------------------------

const VIN_VALUES: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** North American VIN check digit (position 9). */
export function vinCheckDigit(vin: string) {
  const total = [...vin.toUpperCase()].reduce((s, ch, i) => s + (/\d/.test(ch) ? Number(ch) : VIN_VALUES[ch] ?? 0) * VIN_WEIGHTS[i], 0);
  const rem = total % 11;
  return rem === 10 ? 'X' : String(rem);
}
export const isValidVin = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) && vinCheckDigit(vin) === vin[8];
const withCheck = (vin: string) => `${vin.slice(0, 8)}${vinCheckDigit(vin)}${vin.slice(9)}`;

type Decoded = { year: number; make: string; model: string; modelDetails: string };
// Fictional VINs used by the household prefill (valid format and check digit).
const MOCK_VINS: [string, Decoded][] = [
  [withCheck('1C4PJMDX0LD612047'), { year: 2020, make: 'JEEP', model: 'CHEROKEE LIMITED', modelDetails: 'SUV04 4D, 3.2, 6' }],
  [withCheck('1FADP3K20DL104477'), { year: 2013, make: 'FORD', model: 'FOCUS SE', modelDetails: 'HCHBK 4D, 2.0, 4' }],
  [withCheck('1GCGTCE30F1203318'), { year: 2015, make: 'CHEV', model: 'COLORADO LT', modelDetails: 'CREW CAB 4D, 3.6, 6' }],
  [withCheck('1ZVFT80N075301942'), { year: 2007, make: 'FORD', model: 'MUSTANG', modelDetails: 'CPE 2D, 4.0, 6' }],
];
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';
const WMI: Record<string, string> = { '1C4': 'JEEP', '1J4': 'JEEP', '1FA': 'FORD', '1FM': 'FORD', '1FT': 'FORD', '1ZV': 'FORD', '1G1': 'CHEVROLET', '1GC': 'CHEV', '1GN': 'CHEVROLET', '2GN': 'CHEVROLET', '1HG': 'HONDA', '2HG': 'HONDA', '5J6': 'HONDA', '19X': 'HONDA', '4T1': 'TOYOTA', '2T3': 'TOYOTA', 'JTD': 'TOYOTA', '5YJ': 'TESLA', '4S4': 'SUBARU', 'JF2': 'SUBARU', 'KL4': 'BUICK', 'KM8': 'HYUNDAI', '5XY': 'KIA', 'JM3': 'MAZDA', '3VW': 'VOLKSWAGEN', 'WBA': 'BMW', '1N4': 'NISSAN', '3C6': 'RAM' };

/** Mock VIN decoder: known prefill VINs decode fully; others decode year and make from the VIN. */
export function decodeVin(vin: string): Decoded | null {
  if (!isValidVin(vin)) return null;
  const known = MOCK_VINS.find(([v]) => v === vin);
  if (known) return known[1];
  const code = YEAR_CODES.indexOf(vin[9]);
  // Position 10 cycles every 30 years; position 7 being a letter means 2010 or later.
  const year = code < 0 ? new Date().getFullYear() : 1980 + code + (/[A-Z]/.test(vin[6]) && 1980 + code < 2010 ? 30 : 0);
  return { year, make: WMI[vin.slice(0, 3)] ?? 'UNKNOWN MAKE', model: 'MODEL PER VIN', modelDetails: 'Verify body style with the customer' };
}

// ---- Household prefill ------------------------------------------------------------------------

export type HouseholdPerson = { id: string; firstName: string; lastName: string; gender: Driver['gender']; dob: string; taxId: string; licenseState: string; licenseNumber: string; client?: boolean };
export type HouseholdVehicle = { id: string; vin: string; registeredOwner: string } & Decoded;

const seedOf = (q: Quote) => [...`${q.applicant.lastName}${q.applicant.zip}`].reduce((t, c) => t + c.charCodeAt(0), 0);
const fakeDl = (seed: number, n: number) => `${'DGHKLMPRSTW'[(seed + n) % 11]}${String(4100000000000 + ((seed * 7919 + n * 104729) % 899999999999)).slice(0, 13)}`;

/** Fictional household returned by the prefill service for any applicant (client first). */
export function householdFor(q: Quote): { people: HouseholdPerson[]; vehicles: HouseholdVehicle[] } {
  const seed = seedOf(q);
  const a = q.applicant;
  const last = a.lastName.toUpperCase();
  const birth = Number(a.dob.slice(0, 4)) || 1970;
  const spouseNames = ['PAMELA', 'KAREN', 'MICHELLE', 'LAURA'];
  const people: HouseholdPerson[] = [
    { id: 'HH1', firstName: a.firstName.toUpperCase(), lastName: last, gender: 'M', dob: a.dob, taxId: `${String(100 + (seed % 800))}${String(10 + (seed % 89))}${String(1000 + (seed % 8999))}`, licenseState: a.state, licenseNumber: fakeDl(seed, 1) },
    { id: 'HH2', firstName: spouseNames[seed % 4], lastName: last, gender: 'F', dob: `${birth + 1}-03-22`, taxId: '', licenseState: a.state, licenseNumber: fakeDl(seed, 2) },
    { id: 'HH3', firstName: 'COLE', lastName: 'HARLAN', gender: 'M', dob: '2004-09-18', taxId: '', licenseState: a.state, licenseNumber: fakeDl(seed, 3) },
    { id: 'HH4', firstName: 'EVAN', lastName: 'HARLAN', gender: 'M', dob: '2004-09-18', taxId: '', licenseState: '', licenseNumber: '' },
    { id: 'HH5', firstName: 'JORDAN', lastName: last, gender: '', dob: '2006-05-30', taxId: '', licenseState: a.state, licenseNumber: fakeDl(seed, 5) },
  ];
  const owner = `${a.firstName} ${a.lastName}`.toUpperCase();
  const spouseOwner = `${people[1].firstName} ${last}`;
  const vehicles = MOCK_VINS.map(([vin, d], i) => ({ id: `HV${i + 1}`, vin, registeredOwner: i === 0 ? `${spouseOwner} & ${owner}` : i === 2 ? `${owner}` : owner, ...d }));
  return { people, vehicles };
}

/** Vehicle coverages start from the quote's auto template. */
export const defaultVehicleCoverage = (a?: AutoCoverages): VehicleCoverage => ({ include: true, medPay: a?.medicalPayments && a.medicalPayments !== 'None' ? a.medicalPayments : '10,000', comp: [100, 250, 500, 1000].includes(a?.comprehensiveDeductible ?? 0) ? a!.comprehensiveDeductible : 250, coll: [250, 500, 1000].includes(a?.collisionDeductible ?? 0) ? a!.collisionDeductible : 500, roadside: 'Class 1 - Compact Sedan (Included)', autoSecurity: '- None -' });

/** Driver record created from a household person; prefilled records are incomplete until reviewed. */
export function driverFromPerson(p: HouseholdPerson, q: Quote, namedInsured: boolean): Driver {
  const isClient = p.id === 'HH1';
  return {
    id: `D-${p.id}`, firstName: titleCase(p.firstName), lastName: titleCase(p.lastName), dob: p.dob, gender: p.gender,
    // The first named insured's marital status, relationship and license history come from the application.
    maritalStatus: isClient ? 'Married' : '', relationship: isClient ? 'Named Insured' : namedInsured ? 'Spouse' : '',
    licenseState: p.licenseState, licenseNumber: p.licenseNumber, yearsLicensed: Math.max(0, ageFrom(p.dob) - 16), violations: 0, accidents: 0, driverTraining: false, goodStudent: false,
    driverType: 'Insured Driver', taxId: p.taxId, taxIdType: 'SSN', dateFirstLicensed: isClient || namedInsured ? `06/${Number(p.dob.slice(0, 4)) + 16}` : '', yearsInState: '', collegeStudentAway: '', reviewed: false,
  };
}

export function vehicleFromHousehold(h: HouseholdVehicle, q: Quote): Vehicle {
  return { id: `V-${h.id}`, year: h.year, make: h.make, model: h.model, modelDetails: h.modelDetails, vin: h.vin, use: 'Commute', annualMiles: 0, garagingZip: q.applicant.zip, antiTheft: false, airbags: true, antiLock: true, lienholder: '', reducedUsage: false, vehicleType: 'Private Passenger', antiTheftDevice: '', primaryOperatorId: '', daysPerWeek: 5, milesToWork: 10, drivenYearRound: true, garagingAddress: mailingLine(q), registeredOwner: h.registeredOwner, reviewed: false, coverage: defaultVehicleCoverage(q.autoCoverages) };
}

export const mailingLine = (q: Quote) => `${q.applicant.address}, ${q.applicant.city}, ${q.applicant.state} ${q.applicant.zip}`.toUpperCase();
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ---- Validation -------------------------------------------------------------------------------

export type Errors = Record<string, string>;

export function driverErrors(d: Driver, isFirst: boolean): Errors {
  const e: Errors = {};
  if (!d.driverType) e.driverType = 'Driver/Non-Driver Type is required';
  if (!d.firstName.trim()) e.firstName = 'Legal First Name is required';
  if (!d.lastName.trim()) e.lastName = 'Legal Last Name is required';
  if (!d.dob) e.dob = 'Date Of Birth is required';
  else if (ageFrom(d.dob) < 14 || ageFrom(d.dob) > 110) e.dob = 'Date Of Birth is invalid';
  if (!d.gender) e.gender = 'Gender is required';
  if (!isFirst && !d.relationship) e.relationship = 'Relationship is required';
  if (!d.maritalStatus) e.maritalStatus = 'Marital Status is required';
  if (d.driverType !== 'Non-Driver') {
    if (!d.dateFirstLicensed) e.dateFirstLicensed = 'Date First Licensed is required';
    else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(d.dateFirstLicensed)) e.dateFirstLicensed = 'Date First Licensed must be mm/yyyy';
    else if (d.dob && Number(d.dateFirstLicensed.slice(3)) < Number(d.dob.slice(0, 4)) + 14) e.dateFirstLicensed = 'Date First Licensed is before the driver could be licensed';
    if (!d.licenseState) e.licenseState = 'License State is required';
    if (!d.yearsInState) e.yearsInState = 'Years Licensed in State is required';
  }
  if (needsStudentQuestion(d) && !d.collegeStudentAway) e.collegeStudentAway = 'Full-Time Student Living at College answer is required';
  if (d.taxId && !/^\d{9}$/.test(d.taxId)) e.taxId = 'Tax ID Number must be 9 digits';
  return e;
}
export const needsStudentQuestion = (d: Driver) => d.relationship === 'Child' && !!d.dob && ageFrom(d.dob) < 25 && d.driverType !== 'Non-Driver';

export function vehicleErrors(v: Vehicle, drivers: Driver[]): Errors {
  const e: Errors = {};
  if (!v.vin) e.vin = 'VIN is required';
  else if (!isValidVin(v.vin)) e.vin = 'VIN is invalid';
  if (!v.antiTheftDevice) e.antiTheftDevice = 'Anti-Theft is required';
  if (!v.primaryOperatorId || !drivers.some((d) => d.id === v.primaryOperatorId)) e.primaryOperatorId = 'Primary Operator is required';
  if (!v.use) e.use = 'Primary Use is required';
  if (!v.daysPerWeek) e.daysPerWeek = 'Days Driven per Week is required';
  if (v.use === 'Commute' && !(v.milesToWork && v.milesToWork > 0)) e.milesToWork = 'Miles Driven to Work is required';
  if (!(v.annualMiles > 0)) e.annualMiles = 'Annual Miles is required';
  if (v.drivenYearRound === undefined) e.drivenYearRound = 'Driven Year-Round is required';
  if (!v.garagingAddress) e.garagingAddress = 'Garaging Address is required';
  return e;
}

export function dwellingErrors(p: Property, dwelling: number, osPct: number, ppPct: number, policyType?: string): Errors {
  const e: Errors = {};
  const year = new Date().getFullYear();
  if (!policyType) e.policyType = 'Policy Type is required';
  if (!(p.yearBuilt >= 1800 && p.yearBuilt <= year)) e.yearBuilt = 'Year Built is required';
  if (!(p.squareFeet >= 300)) e.squareFeet = 'Square Feet is required';
  if (p.swimmingPool === undefined) e.swimmingPool = 'Swimming Pool is required';
  if (!p.construction) e.construction = 'Construction is required';
  if (!p.dwellingStyle) e.dwellingStyle = 'Dwelling Style is required';
  if (!(p.stories > 0)) e.stories = 'Number of Stories is required';
  if (!p.alarm) e.alarm = 'Alarm System is required';
  if (p.sprinklers === undefined) e.sprinklers = 'Sprinkler System is required';
  if (!(p.roofYear >= 1900 && p.roofYear <= year)) e.roofYear = 'Roof Installation Year is required';
  else if (p.yearBuilt && p.roofYear < p.yearBuilt) e.roofYear = 'Roof Installation Year cannot be before Year Built';
  if (!p.roofMaterial) e.roofMaterial = 'Roof Material is required';
  if (!p.lossSettlement) e.lossSettlement = 'Loss Settlement is required';
  if (!p.perils) e.perils = 'Perils is required';
  if (!p.ppLossSettlement) e.ppLossSettlement = 'Loss Settlement is required';
  if (!p.ppPerils) e.ppPerils = 'Perils is required';
  if (!(dwelling >= 50000)) e.dwelling = 'Dwelling Amount is required';
  if (!(osPct > 0)) e.otherStructures = 'Other Structures Amount is required';
  if (!(ppPct > 0)) e.personalProperty = 'Personal Property Amount is required';
  return e;
}

export function customerErrors(q: Quote): Errors {
  const e: Errors = {};
  const pl = q.pl!;
  const first = q.drivers[0];
  if (!first?.gender) e.gender1 = 'Gender is required';
  if (!q.applicant.dob) e.dob1 = 'Date of Birth is required';
  if (!/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(q.applicant.phone)) e.phone = q.applicant.phone ? 'Primary Phone Number is invalid' : 'Primary Phone Number is required';
  if (q.applicant.email && !/^\S+@\S+\.\S+$/.test(q.applicant.email)) e.email = 'Primary Email is invalid';
  const second = q.drivers.find((d) => d.id === pl.secondNamedInsuredId);
  if (second && !second.gender) e.gender2 = 'Gender is required';
  if (!pl.mailing3Years) e.mailing3Years = 'Answer is required';
  if (!pl.livesAtMailing) e.livesAtMailing = 'Answer is required';
  if (!pl.county) e.county = 'County is required';
  if (q.products.includes('home') && !pl.isPropertyLocation) e.isPropertyLocation = 'Answer is required';
  if (q.products.includes('auto') && !pl.autoCarrier) e.autoCarrier = 'Current Auto Carrier is required';
  if (q.products.includes('auto') && pl.autoCarrier && pl.autoCarrier !== 'No Prior Insurance' && !pl.autoYears) e.autoYears = 'Years with Carrier is required';
  if (q.products.includes('home') && !pl.homeCarrier) e.homeCarrier = 'Current Home Carrier is required';
  return e;
}

/** Whether a step's data is complete (drives the green check in the step bar). */
export function stepComplete(q: Quote, step: PlStep): boolean {
  if (!q.pl) return false;
  if (step === 'customer') return q.pl.completed.includes('customer') && !Object.keys(customerErrors(q)).length;
  if (step === 'drivers') return q.drivers.length > 0 && q.drivers.every((d, i) => d.reviewed && !Object.keys(driverErrors(d, i === 0)).length);
  if (step === 'vehicles') return q.vehicles.length > 0 && q.vehicles.every((v) => v.reviewed && !Object.keys(vehicleErrors(v, q.drivers)).length);
  if (step === 'dwelling') return q.pl.completed.includes('dwelling') && !Object.keys(dwellingErrors(q.property, q.homeCoverages.dwelling, q.homeCoverages.otherStructuresPct, q.homeCoverages.personalPropertyPct, q.homePolicyType)).length;
  if (step === 'reports') return q.pl.rated;
  return q.pl.rated;
}

// ---- Home cost estimator ----------------------------------------------------------------------

const constructionRate: Record<string, number> = { Frame: 178, 'Masonry Veneer': 186, Masonry: 196, 'Fire Resistive': 210 };
const styleFactor: Record<string, number> = { Ranch: 1, Colonial: 0.96, 'Cape Cod': 0.98, 'Bi-Level': 0.95, 'Tri-Level': 0.97, 'Split Level': 0.97, Contemporary: 1.08 };
/** Replacement cost: square feet × construction rate × style factor, rounded to $1,000. */
export function estimateDwelling(p: Property) {
  const raw = p.squareFeet * (constructionRate[p.construction] ?? 178) * (styleFactor[p.dwellingStyle ?? 'Ranch'] ?? 1) * (p.stories >= 2 ? 0.97 : 1);
  return Math.round(raw / 1000) * 1000;
}

// ---- Reports ----------------------------------------------------------------------------------

export function orderReports(q: Quote): ReportRow[] {
  const date = new Date().toISOString().slice(0, 10);
  const insureds = [q.drivers[0], q.drivers.find((d) => d.id === q.pl?.secondNamedInsuredId)].filter(Boolean) as Driver[];
  const rows: ReportRow[] = [];
  const kinds = [...(q.products.includes('auto') ? ['Auto'] : []), ...(q.products.includes('home') ? ['Property'] : [])];
  kinds.forEach((kind) => insureds.forEach((d) => rows.push({ id: `R-${kind}-${d.id}`, driverId: d.id, name: personName(d), driverType: d.driverType ?? 'Insured Driver', report: `Insurance Score (${kind})`, date, status: 'Hit', lossDate: '', amount: null, detail: `Insurance score returned for ${personName(d)}. Score band: favorable (tier 3 of 12).` })));
  // CLUE: one prior at-fault loss with no payment for the first named insured.
  const lossDate = new Date(); lossDate.setMonth(lossDate.getMonth() - 30);
  if (insureds[0]) rows.push({ id: `R-CLUE-${insureds[0].id}`, driverId: insureds[0].id, name: personName(insureds[0]), driverType: insureds[0].driverType ?? 'Insured Driver', report: 'CLUE', date, status: 'Accident', lossDate: lossDate.toISOString().slice(0, 10), amount: 0, detail: 'Comprehensive Loss Underwriting Exchange: auto accident reported by prior carrier, closed without payment. Not chargeable.' });
  q.drivers.filter((d) => d.driverType !== 'Non-Driver').forEach((d) => rows.push({ id: `R-MVR-${d.id}`, driverId: d.id, name: personName(d), driverType: d.driverType ?? 'Insured Driver', report: 'MVR', date, status: d.violations ? 'Violation' : 'Clear', lossDate: '', amount: null, detail: `Motor vehicle record (${d.licenseState || 'state not entered'}): ${d.violations ? `${d.violations} moving violation(s) in 3 years` : 'no violations or suspensions in 3 years'}.` }));
  return rows;
}

/** Illustrative underwriting scores (lower is better). */
export function underwritingScores(q: Quote) {
  const chargeable = q.drivers.reduce((s, d) => s + d.accidents * 40 + d.violations * 25, 0);
  const auto = q.products.includes('auto') ? chargeable : 0;
  const roofAge = new Date().getFullYear() - q.property.roofYear;
  const home = q.products.includes('home') ? 120 + Math.max(0, roofAge) * 4 + (q.property.construction === 'Frame' ? 20 : 0) + Math.max(0, new Date().getFullYear() - q.property.yearBuilt - 40) : 0;
  return { auto, home, account: Math.max(auto, home) };
}

// ---- Numbers & status -------------------------------------------------------------------------

/** Next 10-digit quote numbers, sequential across all quotes. */
export function nextQuoteNumbers(quotes: Quote[], products: ProductKey[]): Partial<Record<ProductKey, string>> {
  const used = quotes.flatMap((q) => Object.values(q.numbers ?? {})).map(Number).filter(Boolean);
  let n = Math.max(91877254, ...used);
  return Object.fromEntries(products.map((p) => [p, String((n += 1)).padStart(10, '0')]));
}

export function quoteStatusLabel(q: Quote) {
  if (q.status === 'Quote') return q.flow === 'pl' && !q.pl?.rated ? 'Quote - Incomplete' : 'Quote - Rated';
  if (q.status === 'Application') return 'Application - Started';
  if (q.status === 'Issued') return 'Issued';
  return q.status;
}
