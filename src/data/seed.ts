import type { AutoCoverages, BillingAccount, Mortgagee, PaymentMethod, BusinessDetails, CommercialAutoDetails, BoatDetails, Claim, CommercialDetails, Customer, Driver, Envelope, HomeCoverages, Lead, LifeDetails, Policy, Property, Quote, UmbrellaDetails, Vehicle } from '@/data/types';
import { payPlanInstallments, rateAuto, rateHome } from '@/lib/rating';
import { rateCommercialAuto, rateCommercialProperty } from '@/data/commercial';

// Sample data for the demo portal. None of these are real ERIE customers.
export const AGENT = {
  name: 'Nash Rosauro',
  sortName: 'Rosauro, Nash',
  agency: 'Rosauro Insurance Agency, LLC',
  state: 'Wisconsin',
  stateCode: 'WI',
  agentNumbers: ['Agent #10492', 'Agent #20941'],
  phone: '(608) 555-0142',
  email: 'nash@rosauroagency.example',
  address: '2200 University Ave, Madison, WI 53726',
  districtOffice: 'Wisconsin Branch — Waukesha',
};

export const defaultAutoCoverages: AutoCoverages = {
  bodilyInjury: '100/300',
  propertyDamage: '100,000',
  uninsuredMotorist: '100/300',
  medicalPayments: '5,000',
  comprehensiveDeductible: 250,
  collisionDeductible: 500,
  rateLock: true,
  autoPlus: false,
  emergencyRoadService: false,
  transportationExpense: false,
  newAutoSecurity: false,
};

export const defaultProperty: Property = {
  yearBuilt: 1998,
  squareFeet: 2100,
  construction: 'Frame',
  roofType: 'Asphalt Shingle',
  roofYear: 2016,
  stories: 2,
  heating: 'Gas Forced Air',
  protectionClass: 4,
  smokeAlarms: true,
  burglarAlarm: false,
  sprinklers: false,
  dwellingType: 'Single Family',
};

export const defaultHomeCoverages: HomeCoverages = {
  dwelling: 325000,
  otherStructuresPct: 10,
  personalPropertyPct: 70,
  lossOfUsePct: 20,
  personalLiability: 300000,
  medicalPayments: 5000,
  deductible: 1000,
  waterBackup: false,
  identityRecovery: false,
  equipmentBreakdown: false,
  serviceLine: false,
  homeSharing: false,
  scheduledValuables: 0,
};

export const defaultBoat: BoatDetails = {
  year: 2019,
  make: 'Lund',
  model: '',
  length: 18,
  horsepower: 115,
  hullType: 'Aluminum',
  engine: 'Outboard',
  agreedValue: 28000,
  trailerValue: 2500,
  storage: 'Trailer at residence',
  waters: 'Inland lakes & rivers',
  operatorYears: 5,
  safetyCourse: false,
  liability: 300000,
  deductible: 500,
  towing: false,
  fishingEquipment: 0,
};

export const defaultUmbrella: UmbrellaDetails = {
  limit: 1000000,
  autoExposures: 2,
  youthfulOperators: 0,
  watercraft: 0,
  recreationalVehicles: 0,
  residences: 1,
  otherAutoLimits: '',
  otherHomeLiability: 0,
};

export const defaultCommercial: CommercialDetails = {
  lines: ['bop'],
  business: {
    businessName: '', ownerFirst: '', ownerLast: '', entity: 'LLC', fein: '', yearsInBusiness: 3, classCode: '', description: '', revenue: 450000, payroll: 120000, employees: 4,
    address: '', city: '', state: 'WI', zip: '', phone: '', email: '', ownsBuilding: false, construction: 'Joisted Masonry', yearBuilt: 1990, squareFeet: 2400, sprinklered: false, alarm: 'None',
    buildingLimit: 0, bppLimit: 75000, glLimit: '1M/2M', propertyDeductible: 1000, cyber: false, epli: false, hiredNonOwnedAuto: false, equipmentBreakdown: false, employeeDishonesty: false,
  },
  contractors: { trade: '', subcontractedPct: 10, equipmentFloater: 25000, installationFloater: 15000, toolsLimit: 5000, additionalInsuredBlanket: true },
  commercialAuto: { vehicles: [], drivers: [], liability: '1,000,000 CSL', physicalDamageDeductible: 1000, garagekeepers: false, garagekeepersLimit: 50000, hiredNonOwned: false },
  workersComp: { classes: [], experienceMod: 1, employersLiability: '500/500/500' },
};

export const defaultLife: LifeDetails = {
  faceAmount: 250000,
  term: 20,
  tobacco: false,
  healthClass: 'Preferred',
  heightIn: 68,
  weightLb: 170,
  beneficiary: '',
  beneficiaryRelation: 'Spouse',
  acceleratedBenefit: true,
  childRider: false,
  waiverOfPremium: false,
};

const customers: Customer[] = [
  { id: 'C-100231', firstName: 'David', middleName: '', lastName: 'Guttenberg', address: '509 Erie Insurance Way', city: 'Waunakee', state: 'WI', zip: '53597', dob: '1968-07-14', phone: '(608) 555-0187', email: 'd.guttenberg@example.com', customerSince: '2014-03-01' },
  { id: 'C-100458', firstName: 'Maria', middleName: 'Elena', lastName: 'Johnson', address: '120 Lakeview Drive', city: 'Madison', state: 'WI', zip: '53703', dob: '1984-11-23', phone: '(608) 555-0119', email: 'maria.johnson@example.com', customerSince: '2019-06-15' },
  { id: 'C-100772', firstName: 'Robert', middleName: 'J', lastName: 'Kowalski', address: '88 Mill Pond Road', city: 'Waukesha', state: 'WI', zip: '53186', dob: '1957-02-09', phone: '(262) 555-0163', email: 'rkowalski@example.com', customerSince: '2008-09-10' },
  { id: 'C-101034', firstName: 'Aisha', middleName: '', lastName: 'Thompson', address: '4410 Cherokee Drive', city: 'Fitchburg', state: 'WI', zip: '53711', dob: '1991-05-30', phone: '(608) 555-0134', email: 'aisha.t@example.com', customerSince: '2022-01-20' },
  { id: 'C-101290', firstName: 'Daniel', middleName: 'P', lastName: 'Nguyen', address: '17 Willow Bend Court', city: 'Middleton', state: 'WI', zip: '53562', dob: '1979-08-12', phone: '(608) 555-0177', email: 'dnguyen@example.com', customerSince: '2017-04-05' },
  { id: 'C-101533', firstName: 'Linda', middleName: 'M', lastName: 'Schaefer', address: '903 Harbor View Lane', city: 'Sun Prairie', state: 'WI', zip: '53590', dob: '1962-12-03', phone: '(608) 555-0101', email: 'lschaefer@example.com', customerSince: '2011-07-22' },
  // Dummy test insureds: a personal household with every home form, and a commercial account.
  { id: 'C-900101', firstName: 'Taylor', middleName: 'R', lastName: 'Morgan', address: '1450 Prairie Ridge Road', city: 'Verona', state: 'WI', zip: '53593', dob: '1981-08-14', phone: '(608) 555-0164', email: 'taylor.morgan@example.com', customerSince: '2016-05-01' },
  { id: 'C-900201', firstName: 'Chris', middleName: '', lastName: 'Delgado', address: '3100 Commerce Drive', city: 'Sun Prairie', state: 'WI', zip: '53590', dob: '1975-02-19', phone: '(608) 555-0193', email: 'chris@delgadotransport.example', customerSince: '2018-01-15' },
];

const driver = (id: string, firstName: string, lastName: string, dob: string, extra: Partial<Driver> = {}): Driver => ({ id, firstName, lastName, dob, gender: 'M', maritalStatus: 'Married', relationship: 'Named Insured', licenseState: 'WI', licenseNumber: `${lastName[0]}${id.replace(/\D/g, '').padEnd(12, '4')}`.slice(0, 13), yearsLicensed: 20, violations: 0, accidents: 0, driverTraining: false, goodStudent: false, ...extra });
const vehicle = (id: string, year: number, make: string, model: string, vin: string, extra: Partial<Vehicle> = {}): Vehicle => ({ id, year, make, model, vin, use: 'Commute', annualMiles: 11000, garagingZip: '53703', antiTheft: true, airbags: true, antiLock: true, lienholder: '', reducedUsage: false, ...extra });

type PolicySeed = Omit<Policy, 'premium' | 'documents' | 'history'> & { premium?: number };

const autoPolicy = (seed: PolicySeed, multiPolicy: boolean): Policy => {
  const premium = seed.premium ?? rateAuto('WI', seed.drivers, seed.vehicles, seed.autoCoverages!, { multiPolicy, payPlan: seed.payPlan, autoPay: seed.autoPay }).total;
  return { ...seed, premium, documents: baseDocs(seed, true), history: baseHistory(seed) };
};
const homePolicy = (seed: PolicySeed, multiPolicy: boolean): Policy => {
  const premium = seed.premium ?? rateHome('WI', seed.property!, seed.homeCoverages!, { multiPolicy, earlyQuote: false, payPlan: seed.payPlan }).total;
  return { ...seed, premium, documents: baseDocs(seed, false), history: baseHistory(seed) };
};
const simplePolicy = (seed: PolicySeed): Policy => ({ ...seed, premium: seed.premium ?? 0, documents: baseDocs(seed, false), history: baseHistory(seed) });

function baseDocs(seed: PolicySeed, auto: boolean): Policy['documents'] {
  const docs: Policy['documents'] = [
    { name: 'Declarations Page', date: seed.effective, kind: 'Declarations' },
    { name: 'Renewal Bill', date: seed.effective, kind: 'Bill' },
  ];
  if (auto) docs.unshift({ name: 'Auto ID Cards', date: seed.effective, kind: 'ID Card' });
  return docs;
}
function baseHistory(seed: PolicySeed): Policy['history'] {
  return [{ date: seed.effective, text: `Policy renewed for term ${seed.effective} – ${seed.expiration}`, by: 'System' }];
}

// Delgado Transport & Properties LLC — shared business profile for its commercial policies.
const delgadoBusiness: BusinessDetails = {
  businessName: 'Delgado Transport & Properties LLC', ownerFirst: 'Chris', ownerLast: 'Delgado', entity: 'LLC', fein: '39-4817265', yearsInBusiness: 12, classCode: '',
  description: 'Regional freight hauling, local delivery and warehouse leasing', revenue: 3800000, payroll: 1450000, employees: 22,
  address: '3100 Commerce Drive', city: 'Sun Prairie', state: 'WI', zip: '53590', phone: '(608) 555-0193', email: 'chris@delgadotransport.example',
  ownsBuilding: true, construction: 'Non-combustible', yearBuilt: 2004, squareFeet: 18000, sprinklered: true, alarm: 'Central Station',
  buildingLimit: 2400000, bppLimit: 350000, glLimit: '2M/4M', propertyDeductible: 2500, cyber: false, epli: false, hiredNonOwnedAuto: false, equipmentBreakdown: true, employeeDishonesty: true,
};
const delgadoAuto: CommercialAutoDetails = {
  vehicles: [
    { id: 'CV1', year: 2024, make: 'Ford', model: 'Transit 250', bodyType: 'Light Truck', costNew: 52000, radius: 'Local (0–50 mi)' },
    { id: 'CV2', year: 2023, make: 'Ram', model: 'ProMaster 2500', bodyType: 'Light Truck', costNew: 48000, radius: 'Local (0–50 mi)' },
    { id: 'CV3', year: 2022, make: 'Chevrolet', model: 'Silverado 2500HD', bodyType: 'Light Truck', costNew: 61000, radius: 'Intermediate (51–200 mi)' },
  ],
  drivers: [
    { id: 'CD1', name: 'Chris Delgado', age: 51, violations: 0, accidents: 0 },
    { id: 'CD2', name: 'Marco Ruiz', age: 34, violations: 0, accidents: 0 },
    { id: 'CD3', name: 'Dana Kim', age: 27, violations: 1, accidents: 0 },
  ],
  liability: '1,000,000 CSL', physicalDamageDeductible: 1000, garagekeepers: false, garagekeepersLimit: 0, hiredNonOwned: true,
};
const delgadoTrucking: CommercialAutoDetails = {
  vehicles: [
    { id: 'TR1', year: 2022, make: 'Freightliner', model: 'Cascadia 126', bodyType: 'Heavy Truck', costNew: 168000, radius: 'Intermediate (51–200 mi)' },
    { id: 'TR2', year: 2020, make: 'Peterbilt', model: '579', bodyType: 'Heavy Truck', costNew: 152000, radius: 'Intermediate (51–200 mi)' },
    { id: 'TR3', year: 2021, make: 'International', model: 'LT625', bodyType: 'Heavy Truck', costNew: 145000, radius: 'Intermediate (51–200 mi)' },
  ],
  drivers: [
    { id: 'TD1', name: 'Luis Ortega (CDL-A)', age: 46, violations: 0, accidents: 0 },
    { id: 'TD2', name: 'Brenda Haskins (CDL-A)', age: 39, violations: 0, accidents: 0 },
    { id: 'TD3', name: 'Terrence Cole (CDL-A)', age: 52, violations: 0, accidents: 1 },
  ],
  liability: '1,000,000 CSL', physicalDamageDeductible: 1000, garagekeepers: false, garagekeepersLimit: 0, hiredNonOwned: false,
  trucking: { usdot: '3184427', mcNumber: 'MC-1092215', commodity: 'General freight — dry van', cargoLimit: 100000, trailerInterchange: true, trailers: 4 },
};

const policies: Policy[] = [
  autoPolicy({ number: 'A05-2817734', type: 'Auto', customerId: 'C-100231', status: 'Active', effective: '2026-03-01', expiration: '2027-03-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #10492', description: '2 vehicles · 2 drivers', drivers: [driver('D1', 'David', 'Guttenberg', '1968-07-14'), driver('D2', 'Karen', 'Guttenberg', '1970-04-02', { gender: 'F', relationship: 'Spouse' })], vehicles: [vehicle('V1', 2022, 'Subaru', 'Outback', '4S4BTANC5N3184471', { garagingZip: '53597' }), vehicle('V2', 2019, 'Ford', 'F-150', '1FTEW1E53KFA77210', { garagingZip: '53597', use: 'Pleasure' })], autoCoverages: { ...defaultAutoCoverages, autoPlus: true } }, true),
  homePolicy({ number: 'H07-1938842', type: 'Home', customerId: 'C-100231', status: 'Active', effective: '2026-03-01', expiration: '2027-03-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 509 Erie Insurance Way', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 1987, squareFeet: 2450 }, homeCoverages: { ...defaultHomeCoverages, dwelling: 385000, waterBackup: true } }, true),
  autoPolicy({ number: 'A05-3302915', type: 'Auto', customerId: 'C-100458', status: 'Active', effective: '2026-06-15', expiration: '2027-06-15', payPlan: 'Quarterly', autoPay: false, agentNumber: 'Agent #20941', description: '1 vehicle · 1 driver', drivers: [driver('D1', 'Maria', 'Johnson', '1984-11-23', { gender: 'F', maritalStatus: 'Single' })], vehicles: [vehicle('V1', 2024, 'Toyota', 'RAV4 Hybrid', '2T3RWRFV4RW210984')], autoCoverages: { ...defaultAutoCoverages, newAutoSecurity: true, emergencyRoadService: true, transportationExpense: true } }, false),
  simplePolicy({ number: 'L22-0045871', type: 'Life', customerId: 'C-100458', status: 'Active', effective: '2023-02-01', expiration: '2043-02-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #20941', description: 'ERIE Lifetime Term · $500,000 face', drivers: [], vehicles: [], premium: 384 }),
  autoPolicy({ number: 'A05-1120456', type: 'Auto', customerId: 'C-100772', status: 'Pending Cancel', effective: '2026-09-10', expiration: '2027-09-10', payPlan: 'Monthly', autoPay: false, agentNumber: 'Agent #10492', description: '3 vehicles · 3 drivers', drivers: [driver('D1', 'Robert', 'Kowalski', '1957-02-09'), driver('D2', 'Janet', 'Kowalski', '1959-10-17', { gender: 'F', relationship: 'Spouse' }), driver('D3', 'Tyler', 'Kowalski', '2007-03-21', { maritalStatus: 'Single', relationship: 'Child', yearsLicensed: 2, driverTraining: true, violations: 1 })], vehicles: [vehicle('V1', 2021, 'Chevrolet', 'Silverado 1500', '3GCUYDED2MG142256', { garagingZip: '53186' }), vehicle('V2', 2017, 'Honda', 'Civic', '19XFC2F59HE019944', { garagingZip: '53186' }), vehicle('V3', 2008, 'Harley-Davidson', 'Sportster', '1HD1CT3138K431209', { garagingZip: '53186', use: 'Pleasure', reducedUsage: true, annualMiles: 2500 })], autoCoverages: defaultAutoCoverages }, true),
  homePolicy({ number: 'H07-0821193', type: 'Home', customerId: 'C-100772', status: 'Active', effective: '2026-09-10', expiration: '2027-09-10', payPlan: '9 Month', autoPay: true, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 88 Mill Pond Road', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 1964, construction: 'Masonry', roofYear: 2009 }, homeCoverages: { ...defaultHomeCoverages, dwelling: 290000, equipmentBreakdown: true } }, true),
  simplePolicy({ number: 'B09-0402218', type: 'Boat', customerId: 'C-100772', status: 'Active', effective: '2026-04-01', expiration: '2027-04-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: '2015 Lund 1875 Impact · 150 HP', drivers: [], vehicles: [], premium: 412 }),
  autoPolicy({ number: 'A05-4471802', type: 'Auto', customerId: 'C-101034', status: 'Active', effective: '2026-01-20', expiration: '2027-01-20', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #20941', description: '1 vehicle · 1 driver', drivers: [driver('D1', 'Aisha', 'Thompson', '1991-05-30', { gender: 'F', maritalStatus: 'Single', accidents: 1 })], vehicles: [vehicle('V1', 2020, 'Mazda', 'CX-5', 'JM3KFBCM4L0812345', { garagingZip: '53711', lienholder: 'UW Credit Union' })], autoCoverages: { ...defaultAutoCoverages, collisionDeductible: 1000 } }, false),
  homePolicy({ number: 'H07-2290571', type: 'Home', customerId: 'C-101290', status: 'Active', effective: '2025-11-01', expiration: '2026-11-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 17 Willow Bend Court', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 2018, construction: 'Masonry Veneer', roofYear: 2018, burglarAlarm: true }, homeCoverages: { ...defaultHomeCoverages, dwelling: 520000, serviceLine: true, scheduledValuables: 18000 } }, false),
  simplePolicy({ number: 'U03-0098154', type: 'Umbrella', customerId: 'C-101290', status: 'Active', effective: '2025-11-01', expiration: '2026-11-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'Personal Catastrophe Liability · $1,000,000', drivers: [], vehicles: [], premium: 245, umbrella: { limit: 1000000, autoExposures: 2, youthfulOperators: 0, watercraft: 0, recreationalVehicles: 0, residences: 1, otherAutoLimits: '250/500', otherHomeLiability: 300000 } }),
  simplePolicy({ number: 'Q97-5520193', type: 'Business', customerId: 'C-101533', status: 'Active', effective: '2026-07-01', expiration: '2027-07-01', payPlan: 'Quarterly', autoPay: true, agentNumber: 'Agent #10492', description: 'ErieSecure Business® · Schaefer Floral & Gifts', drivers: [], vehicles: [], premium: 3180 }),
  autoPolicy({ number: 'A05-6620418', type: 'Auto', customerId: 'C-101533', status: 'Cancelled', effective: '2026-05-28', expiration: '2027-05-28', payPlan: 'Monthly', autoPay: false, agentNumber: 'Agent #10492', description: '1 vehicle · 1 driver', drivers: [driver('LD1', 'Linda', 'Schaefer', '1962-12-03', { gender: 'F', maritalStatus: 'Widowed' })], vehicles: [vehicle('LV1', 2022, 'Subaru', 'Forester Premium', 'JF2SKAEC0NH412377', { garagingZip: '53590', use: 'Pleasure', annualMiles: 7000 })], autoCoverages: defaultAutoCoverages }, false),
  // Taylor Morgan household — 2 auto policies, HO-3, HO-4, HO-6 and a DP-3 landlord policy.
  autoPolicy({ number: 'A05-9100101', type: 'Auto', customerId: 'C-900101', status: 'Active', effective: '2026-04-01', expiration: '2027-04-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #10492', description: '2 vehicles · 2 drivers', drivers: [driver('MD1', 'Taylor', 'Morgan', '1981-08-14', { gender: 'X' }), driver('MD2', 'Jamie', 'Morgan', '1982-01-27', { gender: 'F', relationship: 'Spouse' })], vehicles: [vehicle('MV1', 2024, 'Toyota', 'Highlander XLE', '5TDKDRAH2RS512345', { garagingZip: '53593', lienholder: 'Toyota Financial Services' }), vehicle('MV2', 2021, 'Honda', 'Accord EX', '1HGCV1F45MA012346', { garagingZip: '53593' })], autoCoverages: { ...defaultAutoCoverages, bodilyInjury: '250/500', uninsuredMotorist: '250/500', autoPlus: true, emergencyRoadService: true, transportationExpense: true } }, true),
  autoPolicy({ number: 'A05-9100102', type: 'Auto', customerId: 'C-900101', status: 'Active', effective: '2026-04-01', expiration: '2027-04-01', payPlan: 'Quarterly', autoPay: false, agentNumber: 'Agent #10492', description: '2 vehicles · 2 drivers (includes youthful driver)', drivers: [driver('MD3', 'Taylor', 'Morgan', '1981-08-14', { gender: 'X' }), driver('MD4', 'Riley', 'Morgan', '2007-03-02', { maritalStatus: 'Single', relationship: 'Child', yearsLicensed: 3, driverTraining: true, goodStudent: true })], vehicles: [vehicle('MV3', 2019, 'Jeep', 'Wrangler Sport', '1C4GJXAG5KW512347', { garagingZip: '53593', use: 'Pleasure', annualMiles: 6000 }), vehicle('MV4', 2015, 'Honda', 'Civic LX', '19XFB2F55FE012348', { garagingZip: '53703', annualMiles: 8000 })], autoCoverages: { ...defaultAutoCoverages, collisionDeductible: 1000 } }, true),
  homePolicy({ number: 'H07-9100103', type: 'Home', customerId: 'C-900101', status: 'Active', effective: '2026-04-01', expiration: '2027-04-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'ErieSecure Home (HO-3) · 1450 Prairie Ridge Road, Verona', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 2006, squareFeet: 2850, roofYear: 2019, burglarAlarm: true }, homeCoverages: { ...defaultHomeCoverages, form: 'HO-3', dwelling: 465000, personalLiability: 500000, waterBackup: true, serviceLine: true, identityRecovery: true } }, true),
  homePolicy({ number: 'H07-9100104', type: 'Home', customerId: 'C-900101', status: 'Active', effective: '2026-08-15', expiration: '2027-08-15', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'Renters (HO-4) · 215 N Frances St Apt 4B, Madison — student residence for Riley Morgan', drivers: [], vehicles: [], property: { ...defaultProperty, dwellingType: 'Apartment', yearBuilt: 1972, squareFeet: 780, construction: 'Masonry', roofYear: 2015, stories: 1, protectionClass: 3 }, homeCoverages: { ...defaultHomeCoverages, form: 'HO-4', dwelling: 0, contentsLimit: 30000, personalLiability: 300000, medicalPayments: 1000, deductible: 500, identityRecovery: true } }, false),
  homePolicy({ number: 'H07-9100105', type: 'Home', customerId: 'C-900101', status: 'Active', effective: '2026-05-20', expiration: '2027-05-20', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'Condo (HO-6) · 1100 Wisconsin Dells Pkwy Unit 312, Wisconsin Dells', drivers: [], vehicles: [], property: { ...defaultProperty, dwellingType: 'Condo', yearBuilt: 2012, squareFeet: 1150, construction: 'Masonry Veneer', roofYear: 2012, stories: 1, sprinklers: true }, homeCoverages: { ...defaultHomeCoverages, form: 'HO-6', dwelling: 60000, contentsLimit: 50000, personalLiability: 300000, medicalPayments: 2000, waterBackup: true } }, true),
  homePolicy({ number: 'H08-9100106', type: 'Home', customerId: 'C-900101', status: 'Active', effective: '2026-06-01', expiration: '2027-06-01', payPlan: 'Semi-Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'Landlord (DP-3) · 618 W Main St, Mount Horeb — rental duplex, 2 units', drivers: [], vehicles: [], property: { ...defaultProperty, dwellingType: 'Duplex', yearBuilt: 1958, squareFeet: 1900, roofYear: 2014, protectionClass: 5 }, homeCoverages: { ...defaultHomeCoverages, form: 'DP-3', dwelling: 285000, otherStructuresPct: 10, lossOfUsePct: 10, contentsLimit: 5000, personalLiability: 500000, medicalPayments: 2000, deductible: 2500, serviceLine: true, equipmentBreakdown: true } }, false),
  // Delgado Transport & Properties LLC — commercial auto, trucking and commercial property.
  simplePolicy({ number: 'CA1-9100201', type: 'Commercial Auto', customerId: 'C-900201', status: 'Active', effective: '2026-02-01', expiration: '2027-02-01', payPlan: 'Quarterly', autoPay: true, agentNumber: 'Agent #20941', description: 'Commercial Auto · 3 service vehicles · Delgado Transport & Properties LLC', drivers: [], vehicles: [], business: delgadoBusiness, commercialAuto: delgadoAuto, premium: rateCommercialAuto(delgadoAuto, 'WI').total }),
  simplePolicy({ number: 'CA1-9100202', type: 'Commercial Auto', policyForm: 'Trucking', customerId: 'C-900201', status: 'Active', effective: '2026-02-01', expiration: '2027-02-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #20941', description: 'Trucking (Motor Carrier) · 3 tractors, 4 trailers · USDOT 3184427', drivers: [], vehicles: [], business: delgadoBusiness, commercialAuto: delgadoTrucking, premium: rateCommercialAuto(delgadoTrucking, 'WI').total }),
  simplePolicy({ number: 'Q97-9100203', type: 'Business', policyForm: 'Commercial Property', customerId: 'C-900201', status: 'Active', effective: '2026-02-01', expiration: '2027-02-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #20941', description: 'Commercial Property · 18,000 sq ft warehouse, 3100 Commerce Drive', drivers: [], vehicles: [], business: delgadoBusiness, premium: rateCommercialProperty(delgadoBusiness).total }),
];

// Each account: installments paid so far this term, the next due date, and the payment method.
// Balances and minimums are derived from the policy premium so they always agree with the plan.
function account(policyNumber: string, paid: number, nextDueDate: string, method: string, firstPayment: string, confirmationSeed: number): BillingAccount {
  const policy = policies.find((p) => p.number === policyNumber)!;
  const count = payPlanInstallments[policy.payPlan];
  const installment = Math.round((policy.premium / count) * 100) / 100;
  const monthsBetween = 12 / count;
  const payments = Array.from({ length: paid }, (_, i) => {
    const d = new Date(`${firstPayment}T12:00:00`);
    d.setMonth(d.getMonth() + Math.round(i * monthsBetween));
    return { id: `${policyNumber}-P${i + 1}`, date: d.toISOString().slice(0, 10), amount: i === count - 1 ? Math.round((policy.premium - installment * (count - 1)) * 100) / 100 : installment, method, confirmation: `EP-${confirmationSeed + i * 1371}`, policyNumber };
  }).reverse();
  const balance = Math.max(0, Math.round((policy.premium - payments.reduce((t, p) => t + p.amount, 0)) * 100) / 100);
  return { policyNumber, balance, nextDueDate, minimumDue: balance > 0 ? Math.min(balance, installment) : 0, payments };
}

const billing: BillingAccount[] = [
  account('A05-2817734', 8, '2026-11-01', 'AutoPay · Checking ••4410', '2026-03-01', 70110452),
  account('H07-1938842', 1, '2027-03-01', 'Visa ••2291', '2026-02-18', 70119843),
  account('A05-3302915', 2, '2026-12-15', 'Checking ••0912', '2026-06-15', 74904416),
  account('L22-0045871', 9, '2026-11-01', 'AutoPay · Checking ••7732', '2026-02-01', 70810223),
  account('A05-1120456', 0, '2026-09-10', '', '2026-09-10', 0),
  account('H07-0821193', 1, '2026-10-10', 'AutoPay · Savings ••5508', '2026-09-10', 77440019),
  account('B09-0402218', 1, '2027-04-01', 'Mastercard ••8820', '2026-03-28', 71228940),
  account('A05-4471802', 9, '2026-10-20', 'AutoPay · Checking ••1187', '2026-01-20', 70612554),
  account('H07-2290571', 1, '2026-11-01', 'Checking ••3390', '2025-10-28', 66509213),
  account('U03-0098154', 1, '2026-11-01', 'Checking ••3390', '2025-10-28', 66509214),
  account('Q97-5520193', 2, '2027-01-01', 'ERIExpressPay® · Checking ••6621', '2026-07-01', 74400518),
  account('A05-6620418', 4, '2026-09-28', 'Checking ••6621', '2026-05-28', 70662041),
  account('A05-9100101', 7, '2026-11-01', 'AutoPay · Checking ••2210', '2026-04-01', 72210101),
  account('A05-9100102', 3, '2027-01-01', 'Checking ••2210', '2026-04-01', 72210102),
  account('H07-9100103', 1, '2027-04-01', 'Visa ••8813', '2026-03-20', 72210103),
  account('H07-9100104', 1, '2027-08-15', 'Visa ••8813', '2026-08-10', 72210104),
  account('H07-9100105', 1, '2027-05-20', 'Checking ••2210', '2026-05-15', 72210105),
  account('H08-9100106', 1, '2026-12-01', 'Checking ••2210', '2026-06-01', 72210106),
  account('CA1-9100201', 3, '2026-11-01', 'ERIExpressPay® · Checking ••5521', '2026-02-01', 73310201),
  account('CA1-9100202', 9, '2026-11-01', 'ERIExpressPay® · Checking ••5521', '2026-02-01', 73310202),
  account('Q97-9100203', 1, '2027-02-01', 'Checking ••5521', '2026-01-25', 73310203),
];

const claims: Claim[] = [
  { number: 'CLM-2026-48213', policyNumber: 'A05-2817734', customerId: 'C-100231', lossDate: '2026-09-18', reportedDate: '2026-09-18', lossType: 'Auto — Collision', location: 'Main St & Century Ave, Waunakee', description: 'Insured was rear-ended at a stoplight. Rear bumper and liftgate damaged. Other driver cited.', lossTime: '17:40', thirdParty: { name: 'Kyle Brandt', phone: '(608) 555-0172', insurer: 'Progressive', policyNumber: 'PG-93318204', vehicle: '2017 Nissan Altima', plate: 'WI ABC-4471' }, status: 'Estimate Approved', adjuster: { name: 'Megan Reilly', phone: '(800) 367-3743 x4471', email: 'megan.reilly@erieinsurance.example' }, reserve: 6400, paid: 1250, deductible: 500, injuries: false, policeReport: 'MPD-26-11873', repairShop: 'Dane County Collision (Direct Repair Program)', rental: 'Enterprise — Waunakee · 30 days max', notes: [{ date: '2026-09-18', author: 'Megan Reilly', text: 'Contacted insured within 2 hours. Photos received through ERIE app.' }, { date: '2026-09-20', author: 'Megan Reilly', text: 'DRP estimate received: $5,880. Subrogation opened against other carrier.' }, { date: '2026-09-24', author: 'Megan Reilly', text: 'Rental issued. Parts ordered — ETA 10/3.' }], payments: [{ date: '2026-09-25', payee: 'Dane County Collision', amount: 1250, type: 'Partial repair payment' }], attachments: ['scene-photo-1.jpg', 'scene-photo-2.jpg', 'drp-estimate.pdf'] },
  { number: 'CLM-2026-41190', policyNumber: 'H07-0821193', customerId: 'C-100772', lossDate: '2026-08-04', reportedDate: '2026-08-05', lossType: 'Home — Wind/Hail', location: '88 Mill Pond Road, Waukesha', description: 'Hail storm damaged roof shingles and gutters on the north side.', status: 'Payment Issued', adjuster: { name: 'Carlos Medina', phone: '(800) 367-3743 x5120', email: 'carlos.medina@erieinsurance.example' }, reserve: 14200, paid: 13200, deductible: 1000, injuries: false, policeReport: '', repairShop: 'Badger State Roofing', rental: '', notes: [{ date: '2026-08-06', author: 'Carlos Medina', text: 'Inspection scheduled for 8/8.' }, { date: '2026-08-08', author: 'Carlos Medina', text: 'Inspection complete. Full roof replacement approved under Guaranteed Replacement Cost.' }, { date: '2026-08-19', author: 'Carlos Medina', text: 'Payment issued to insured and mortgagee.' }], payments: [{ date: '2026-08-19', payee: 'Robert & Janet Kowalski / First Federal Mortgage', amount: 13200, type: 'Dwelling — roof replacement' }], attachments: ['roof-inspection.pdf'] },
  { number: 'CLM-2026-31847', policyNumber: 'A05-4471802', customerId: 'C-101034', lossDate: '2026-05-12', reportedDate: '2026-05-12', lossType: 'Auto — Comprehensive (Glass)', location: 'I-39 near Portage', description: 'Rock chip spread across windshield.', status: 'Closed', adjuster: { name: 'Jordan Pike', phone: '(800) 367-3743 x3318', email: 'jordan.pike@erieinsurance.example' }, reserve: 0, paid: 486, deductible: 250, injuries: false, policeReport: '', repairShop: 'Safelite AutoGlass', rental: '', notes: [{ date: '2026-05-12', author: 'Jordan Pike', text: 'Glass claim routed to network vendor.' }, { date: '2026-05-15', author: 'Jordan Pike', text: 'Windshield replaced. Claim closed.' }], payments: [{ date: '2026-05-15', payee: 'Safelite AutoGlass', amount: 486, type: 'Glass replacement' }], attachments: [] },
  { number: 'CLM-2026-50022', policyNumber: 'H07-2290571', customerId: 'C-101290', lossDate: '2026-09-27', reportedDate: '2026-09-28', lossType: 'Home — Water Damage', location: '17 Willow Bend Court, Middleton', description: 'Washing machine supply line burst; water damage to laundry room flooring and drywall.', status: 'Inspection', adjuster: { name: 'Priya Desai', phone: '(800) 367-3743 x6204', email: 'priya.desai@erieinsurance.example' }, reserve: 8500, paid: 0, deductible: 1000, injuries: false, policeReport: '', repairShop: 'ServiceMaster Restore — Madison (mitigation)', rental: '', notes: [{ date: '2026-09-28', author: 'Priya Desai', text: 'Mitigation vendor dispatched. Drying equipment placed.' }], payments: [], attachments: ['laundry-room.jpg'] },
];

const leads: Lead[] = [
  { id: 'LD-9921', name: 'Emily Carter', phone: '(608) 555-0190', email: 'ecarter@example.com', zip: '53704', interest: 'Auto + Home bundle', source: 'erieinsurance.com Find an Agent', received: '2026-10-02T08:14:00', status: 'New' },
  { id: 'LD-9917', name: 'Marcus Lee', phone: '(608) 555-0148', email: 'mlee@example.com', zip: '53719', interest: 'Auto', source: 'Online quote handoff', received: '2026-10-01T16:42:00', status: 'New' },
  { id: 'LD-9902', name: 'Sofia Ramirez', phone: '(262) 555-0127', email: 'sramirez@example.com', zip: '53188', interest: 'Renters', source: 'erieinsurance.com Find an Agent', received: '2026-09-30T11:05:00', status: 'Contacted' },
  { id: 'LD-9884', name: 'Greg Halvorsen', phone: '(608) 555-0182', email: 'ghalvorsen@example.com', zip: '53562', interest: 'Life', source: 'Online quote handoff', received: '2026-09-28T09:30:00', status: 'Quoted' },
  { id: 'LD-9851', name: 'Hannah Brooks', phone: '(920) 555-0155', email: 'hbrooks@example.com', zip: '53590', interest: 'Business (BOP)', source: 'Referral', received: '2026-09-24T14:18:00', status: 'Won' },
];

const envelopes: Envelope[] = [
  { id: 'ES-55102', customer: 'Maria Johnson', document: 'Auto Application — A05-3302915', sent: '2026-06-12', status: 'Signed' },
  { id: 'ES-56230', customer: 'Robert Kowalski', document: 'Uninsured/Underinsured Motorist Selection', sent: '2026-09-29', status: 'Viewed' },
  { id: 'ES-56301', customer: 'Aisha Thompson', document: 'AutoPay Authorization', sent: '2026-09-30', status: 'Sent' },
  { id: 'ES-54019', customer: 'Daniel Nguyen', document: 'Scheduled Personal Property Appraisal', sent: '2026-08-01', status: 'Expired' },
];

const sampleQuote: Quote = {
  id: 'Q-26-100384',
  customerId: 'C-101533',
  applicant: { firstName: 'Linda', middleName: 'M', lastName: 'Schaefer', address: '903 Harbor View Lane', city: 'Sun Prairie', state: 'WI', zip: '53590', dob: '1962-12-03', phone: '(608) 555-0101', email: 'lschaefer@example.com' },
  products: ['auto'],
  agentNumbers: { auto: 'Agent #10492' },
  status: 'Quote',
  effectiveDate: '2026-10-15',
  underwriting: {},
  drivers: [driver('D1', 'Linda', 'Schaefer', '1962-12-03', { gender: 'F', maritalStatus: 'Widowed' })],
  vehicles: [vehicle('V1', 2023, 'Buick', 'Encore GX', 'KL4MMDS27PB009871', { garagingZip: '53590', use: 'Pleasure', annualMiles: 6500 })],
  autoCoverages: defaultAutoCoverages,
  property: defaultProperty,
  homeCoverages: defaultHomeCoverages,
  boat: defaultBoat,
  life: defaultLife,
  umbrella: defaultUmbrella,
  commercial: defaultCommercial,
  priorCarrier: 'American Family',
  priorYears: 6,
  payPlan: 'Monthly',
  autoPay: true,
  signatureMethod: '',
  issuedPolicies: [],
  createdAt: '2026-09-29T10:12:00',
  updatedAt: '2026-09-29T10:40:00',
  lastStep: 'coverages',
};

const schaeferAuto = policies.find((p) => p.number === 'A05-6620418')!;
schaeferAuto.history = [{ date: '2026-10-05', text: 'Policy cancelled for non-payment effective 2026-10-05 (installment due 2026-09-28 not received)', by: 'System' }, { date: '2026-09-29', text: 'Notice of cancellation for non-payment mailed', by: 'System' }, ...schaeferAuto.history];
schaeferAuto.documents = [{ name: 'Cancellation Notice — Non-payment', date: '2026-10-05', kind: 'Notice' }, ...schaeferAuto.documents];

const delgadoTruckPolicy = policies.find((p) => p.number === 'CA1-9100202')!;
delgadoTruckPolicy.documents = [{ name: 'MCS-90 Endorsement', date: '2026-02-01', kind: 'Endorsement' }, { name: 'BMC-91X Federal Filing (FMCSA)', date: '2026-02-01', kind: 'Notice' }, ...delgadoTruckPolicy.documents];

const lender = (id: string, role: Mortgagee['role'], name: string, loanNumber: string, address: string, city: string, state: string, zip: string): Mortgagee => ({ id, role, name, clause: 'ISAOA/ATIMA', loanNumber, address, city, state, zip });
const mortgageesByPolicy: Record<string, Mortgagee[]> = {
  'H07-1938842': [lender('MG1', 'First mortgagee', 'Summit Prairie Credit Union', 'SP-20019384', 'PO Box 7841', 'Madison', 'WI', '53707')],
  'H07-0821193': [lender('MG2', 'First mortgagee', 'First Federal Mortgage', 'FFM-55820193', 'PO Box 4410', 'Milwaukee', 'WI', '53201')],
  'H07-2290571': [lender('MG3', 'First mortgagee', 'Lakeshore Home Lending', 'LHL-7720414', '2200 Lake Shore Blvd', 'Middleton', 'WI', '53562')],
  'H07-9100103': [lender('MG4', 'First mortgagee', 'Badger Home Lending', 'BHL-60118823', 'PO Box 2290', 'Madison', 'WI', '53701'), lender('MG5', 'Second mortgagee', 'Verona Community Bank', 'VCB-HE-11820', '411 W Verona Ave', 'Verona', 'WI', '53593')],
  'H07-9100105': [lender('MG6', 'First mortgagee', 'Dells Area Credit Union', 'DACU-33019', '900 Broadway', 'Wisconsin Dells', 'WI', '53965')],
  'H08-9100106': [lender('MG7', 'First mortgagee', 'Prairie State Bank', 'PSB-RE-48120', '120 E Main St', 'Mount Horeb', 'WI', '53572')],
};
policies.forEach((p) => { if (mortgageesByPolicy[p.number]) p.mortgagees = mortgageesByPolicy[p.number]; });

// The Kowalski auto policy missed its first installment; ERIE has mailed a notice of cancellation.
const kowalskiAuto = policies.find((p) => p.number === 'A05-1120456')!;
kowalskiAuto.history = [{ date: '2026-09-25', text: `Notice of cancellation for non-payment mailed — cancels 2026-10-15 unless ${billing.find((b) => b.policyNumber === 'A05-1120456')!.minimumDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} is received`, by: 'System' }, ...kowalskiAuto.history];
kowalskiAuto.documents = [{ name: 'Notice of Cancellation — Non-payment', date: '2026-09-25', kind: 'Notice' }, ...kowalskiAuto.documents];

const paymentMethods: PaymentMethod[] = [
  { id: 'PM-1001', customerId: 'C-100231', kind: 'ach', brand: 'Checking', last4: '4410', holder: 'David Guttenberg', bankName: 'Summit Prairie CU', isDefault: true },
  { id: 'PM-1002', customerId: 'C-100231', kind: 'card', brand: 'Visa', last4: '2291', holder: 'David Guttenberg', expiry: '08/28', isDefault: false },
  { id: 'PM-1003', customerId: 'C-100772', kind: 'ach', brand: 'Savings', last4: '5508', holder: 'Robert Kowalski', bankName: 'First Federal', isDefault: true },
  { id: 'PM-1004', customerId: 'C-101533', kind: 'ach', brand: 'Checking', last4: '6621', holder: 'Linda Schaefer', bankName: 'Sun Prairie Bank', isDefault: true },
  { id: 'PM-1005', customerId: 'C-900101', kind: 'ach', brand: 'Checking', last4: '2210', holder: 'Taylor Morgan', bankName: 'Verona Community Bank', isDefault: true },
  { id: 'PM-1006', customerId: 'C-900101', kind: 'card', brand: 'Visa', last4: '8813', holder: 'Taylor Morgan', expiry: '11/29', isDefault: false },
  { id: 'PM-1007', customerId: 'C-900201', kind: 'ach', brand: 'Checking', last4: '5521', holder: 'Delgado Transport & Properties LLC', bankName: 'Associated Commercial', isDefault: true },
];

export function createSeed() {
  return { customers, policies, billing, claims, quotes: [sampleQuote], leads, envelopes, paymentMethods };
}

export type PortalData = ReturnType<typeof createSeed>;
