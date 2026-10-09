import type { AutoCoverages, BillingAccount, BoatDetails, Claim, Customer, Driver, Envelope, HomeCoverages, Lead, LifeDetails, Policy, Property, Quote, Vehicle } from '@/data/types';
import { rateAuto, rateHome } from '@/lib/rating';

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
  roadsideRentals: false,
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
  { id: 'C-100231', firstName: 'David', middleName: '', lastName: 'Guttenberg', address: '509 Erie Insurance Way', city: 'Meadville', state: 'WI', zip: '16335', dob: '1968-07-14', phone: '(814) 555-0187', email: 'd.guttenberg@example.com', customerSince: '2014-03-01' },
  { id: 'C-100458', firstName: 'Maria', middleName: 'Elena', lastName: 'Johnson', address: '120 Lakeview Drive', city: 'Madison', state: 'WI', zip: '53703', dob: '1984-11-23', phone: '(608) 555-0119', email: 'maria.johnson@example.com', customerSince: '2019-06-15' },
  { id: 'C-100772', firstName: 'Robert', middleName: 'J', lastName: 'Kowalski', address: '88 Mill Pond Road', city: 'Waukesha', state: 'WI', zip: '53186', dob: '1957-02-09', phone: '(262) 555-0163', email: 'rkowalski@example.com', customerSince: '2008-09-10' },
  { id: 'C-101034', firstName: 'Aisha', middleName: '', lastName: 'Thompson', address: '4410 Cherokee Drive', city: 'Fitchburg', state: 'WI', zip: '53711', dob: '1991-05-30', phone: '(608) 555-0134', email: 'aisha.t@example.com', customerSince: '2022-01-20' },
  { id: 'C-101290', firstName: 'Daniel', middleName: 'P', lastName: 'Nguyen', address: '17 Willow Bend Court', city: 'Middleton', state: 'WI', zip: '53562', dob: '1979-08-12', phone: '(608) 555-0177', email: 'dnguyen@example.com', customerSince: '2017-04-05' },
  { id: 'C-101533', firstName: 'Linda', middleName: 'M', lastName: 'Schaefer', address: '903 Harbor View Lane', city: 'Sun Prairie', state: 'WI', zip: '53590', dob: '1962-12-03', phone: '(608) 555-0101', email: 'lschaefer@example.com', customerSince: '2011-07-22' },
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

const policies: Policy[] = [
  autoPolicy({ number: 'A05-2817734', type: 'Auto', customerId: 'C-100231', status: 'Active', effective: '2026-03-01', expiration: '2027-03-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #10492', description: '2 vehicles · 2 drivers', drivers: [driver('D1', 'David', 'Guttenberg', '1968-07-14'), driver('D2', 'Karen', 'Guttenberg', '1970-04-02', { gender: 'F', relationship: 'Spouse' })], vehicles: [vehicle('V1', 2022, 'Subaru', 'Outback', '4S4BTANC5N3184471', { garagingZip: '16335' }), vehicle('V2', 2019, 'Ford', 'F-150', '1FTEW1E53KFA77210', { garagingZip: '16335', use: 'Pleasure' })], autoCoverages: { ...defaultAutoCoverages, autoPlus: true } }, true),
  homePolicy({ number: 'H07-1938842', type: 'Home', customerId: 'C-100231', status: 'Active', effective: '2026-03-01', expiration: '2027-03-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 509 Erie Insurance Way', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 1987, squareFeet: 2450 }, homeCoverages: { ...defaultHomeCoverages, dwelling: 385000, waterBackup: true } }, true),
  autoPolicy({ number: 'A05-3302915', type: 'Auto', customerId: 'C-100458', status: 'Active', effective: '2026-06-15', expiration: '2027-06-15', payPlan: 'Quarterly', autoPay: false, agentNumber: 'Agent #20941', description: '1 vehicle · 1 driver', drivers: [driver('D1', 'Maria', 'Johnson', '1984-11-23', { gender: 'F', maritalStatus: 'Single' })], vehicles: [vehicle('V1', 2024, 'Toyota', 'RAV4 Hybrid', '2T3RWRFV4RW210984')], autoCoverages: { ...defaultAutoCoverages, newAutoSecurity: true, roadsideRentals: true } }, false),
  simplePolicy({ number: 'L22-0045871', type: 'Life', customerId: 'C-100458', status: 'Active', effective: '2023-02-01', expiration: '2043-02-01', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #20941', description: 'ERIE Lifetime Term · $500,000 face', drivers: [], vehicles: [], premium: 384 }),
  autoPolicy({ number: 'A05-1120456', type: 'Auto', customerId: 'C-100772', status: 'Pending Cancel', effective: '2026-09-10', expiration: '2027-09-10', payPlan: 'Monthly', autoPay: false, agentNumber: 'Agent #10492', description: '3 vehicles · 3 drivers', drivers: [driver('D1', 'Robert', 'Kowalski', '1957-02-09'), driver('D2', 'Janet', 'Kowalski', '1959-10-17', { gender: 'F', relationship: 'Spouse' }), driver('D3', 'Tyler', 'Kowalski', '2007-03-21', { maritalStatus: 'Single', relationship: 'Child', yearsLicensed: 2, driverTraining: true, violations: 1 })], vehicles: [vehicle('V1', 2021, 'Chevrolet', 'Silverado 1500', '3GCUYDED2MG142256', { garagingZip: '53186' }), vehicle('V2', 2017, 'Honda', 'Civic', '19XFC2F59HE019944', { garagingZip: '53186' }), vehicle('V3', 2008, 'Harley-Davidson', 'Sportster', '1HD1CT3138K431209', { garagingZip: '53186', use: 'Pleasure', reducedUsage: true, annualMiles: 2500 })], autoCoverages: defaultAutoCoverages }, true),
  homePolicy({ number: 'H07-0821193', type: 'Home', customerId: 'C-100772', status: 'Active', effective: '2026-09-10', expiration: '2027-09-10', payPlan: '9 Month', autoPay: true, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 88 Mill Pond Road', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 1964, construction: 'Masonry', roofYear: 2009 }, homeCoverages: { ...defaultHomeCoverages, dwelling: 290000, equipmentBreakdown: true } }, true),
  simplePolicy({ number: 'B09-0402218', type: 'Boat', customerId: 'C-100772', status: 'Active', effective: '2026-04-01', expiration: '2027-04-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: '2015 Lund 1875 Impact · 150 HP', drivers: [], vehicles: [], premium: 412 }),
  autoPolicy({ number: 'A05-4471802', type: 'Auto', customerId: 'C-101034', status: 'Active', effective: '2026-01-20', expiration: '2027-01-20', payPlan: 'Monthly', autoPay: true, agentNumber: 'Agent #20941', description: '1 vehicle · 1 driver', drivers: [driver('D1', 'Aisha', 'Thompson', '1991-05-30', { gender: 'F', maritalStatus: 'Single', accidents: 1 })], vehicles: [vehicle('V1', 2020, 'Mazda', 'CX-5', 'JM3KFBCM4L0812345', { garagingZip: '53711', lienholder: 'UW Credit Union' })], autoCoverages: { ...defaultAutoCoverages, collisionDeductible: 1000 } }, false),
  homePolicy({ number: 'H07-2290571', type: 'Home', customerId: 'C-101290', status: 'Active', effective: '2025-11-01', expiration: '2026-11-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'ErieSecure Home · 17 Willow Bend Court', drivers: [], vehicles: [], property: { ...defaultProperty, yearBuilt: 2018, construction: 'Masonry Veneer', roofYear: 2018, burglarAlarm: true }, homeCoverages: { ...defaultHomeCoverages, dwelling: 520000, serviceLine: true, scheduledValuables: 18000 } }, false),
  simplePolicy({ number: 'U03-0098154', type: 'Umbrella', customerId: 'C-101290', status: 'Active', effective: '2025-11-01', expiration: '2026-11-01', payPlan: 'Annual', autoPay: false, agentNumber: 'Agent #10492', description: 'Personal Catastrophe Liability · $1,000,000', drivers: [], vehicles: [], premium: 245 }),
  simplePolicy({ number: 'Q97-5520193', type: 'Business', customerId: 'C-101533', status: 'Active', effective: '2026-07-01', expiration: '2027-07-01', payPlan: 'Quarterly', autoPay: true, agentNumber: 'Agent #10492', description: 'ErieSecure Business® · Schaefer Floral & Gifts', drivers: [], vehicles: [], premium: 3180 }),
];

const billing: BillingAccount[] = [
  { policyNumber: 'A05-2817734', balance: 1424, nextDueDate: '2026-10-01', minimumDue: 118.67, payments: [{ id: 'P1', date: '2026-09-01', amount: 118.67, method: 'AutoPay · Checking ••4410', confirmation: 'EP-77310452', policyNumber: 'A05-2817734' }, { id: 'P2', date: '2026-08-01', amount: 118.67, method: 'AutoPay · Checking ••4410', confirmation: 'EP-76021887', policyNumber: 'A05-2817734' }] },
  { policyNumber: 'H07-1938842', balance: 0, nextDueDate: '2027-02-01', minimumDue: 0, payments: [{ id: 'P3', date: '2026-02-18', amount: 1186, method: 'Visa ••2291', confirmation: 'EP-70119843', policyNumber: 'H07-1938842' }] },
  { policyNumber: 'A05-3302915', balance: 712, nextDueDate: '2026-12-15', minimumDue: 237.5, payments: [{ id: 'P4', date: '2026-09-15', amount: 240.5, method: 'Checking ••0912', confirmation: 'EP-77904416', policyNumber: 'A05-3302915' }] },
  { policyNumber: 'L22-0045871', balance: 32, nextDueDate: '2026-11-01', minimumDue: 32, payments: [{ id: 'P5', date: '2026-10-01', amount: 32, method: 'AutoPay · Checking ••7732', confirmation: 'EP-78110223', policyNumber: 'L22-0045871' }] },
  { policyNumber: 'A05-1120456', balance: 2896, nextDueDate: '2026-09-10', minimumDue: 486.33, payments: [] },
  { policyNumber: 'H07-0821193', balance: 1105, nextDueDate: '2026-10-10', minimumDue: 138.11, payments: [{ id: 'P6', date: '2026-09-10', amount: 138.11, method: 'AutoPay · Savings ••5508', confirmation: 'EP-77440019', policyNumber: 'H07-0821193' }] },
  { policyNumber: 'B09-0402218', balance: 0, nextDueDate: '2027-03-01', minimumDue: 0, payments: [{ id: 'P7', date: '2026-03-28', amount: 412, method: 'Mastercard ••8820', confirmation: 'EP-71228940', policyNumber: 'B09-0402218' }] },
  { policyNumber: 'A05-4471802', balance: 1210, nextDueDate: '2026-10-20', minimumDue: 134.44, payments: [{ id: 'P8', date: '2026-09-20', amount: 134.44, method: 'AutoPay · Checking ••1187', confirmation: 'EP-77612554', policyNumber: 'A05-4471802' }] },
  { policyNumber: 'H07-2290571', balance: 0, nextDueDate: '2026-10-15', minimumDue: 0, payments: [{ id: 'P9', date: '2025-10-28', amount: 1642, method: 'Checking ••3390', confirmation: 'EP-66509213', policyNumber: 'H07-2290571' }] },
  { policyNumber: 'U03-0098154', balance: 0, nextDueDate: '2026-10-15', minimumDue: 0, payments: [{ id: 'P10', date: '2025-10-28', amount: 245, method: 'Checking ••3390', confirmation: 'EP-66509214', policyNumber: 'U03-0098154' }] },
  { policyNumber: 'Q97-5520193', balance: 2385, nextDueDate: '2026-10-01', minimumDue: 795, payments: [{ id: 'P11', date: '2026-07-01', amount: 795, method: 'ERIExpressPay® · Checking ••6621', confirmation: 'EP-74400518', policyNumber: 'Q97-5520193' }] },
];

const claims: Claim[] = [
  { number: 'CLM-26-0048213', policyNumber: 'A05-2817734', customerId: 'C-100231', lossDate: '2026-09-18', reportedDate: '2026-09-18', lossType: 'Auto — Collision', location: 'Park Ave & N Main St, Meadville', description: 'Insured was rear-ended at a stoplight. Rear bumper and liftgate damaged. Other driver cited.', status: 'Repair In Progress', adjuster: { name: 'Megan Reilly', phone: '(800) 367-3743 x4471', email: 'megan.reilly@erieinsurance.example' }, reserve: 6400, paid: 1250, deductible: 500, injuries: false, policeReport: 'MPD-26-11873', repairShop: 'Crawford County Collision (Direct Repair Program)', rental: 'Enterprise — Meadville · 30 days max', notes: [{ date: '2026-09-18', author: 'Megan Reilly', text: 'Contacted insured within 2 hours. Photos received through ERIE app.' }, { date: '2026-09-20', author: 'Megan Reilly', text: 'DRP estimate received: $5,880. Subrogation opened against other carrier.' }, { date: '2026-09-24', author: 'Megan Reilly', text: 'Rental issued. Parts ordered — ETA 10/3.' }], payments: [{ date: '2026-09-25', payee: 'Crawford County Collision', amount: 1250, type: 'Partial repair payment' }], attachments: ['scene-photo-1.jpg', 'scene-photo-2.jpg', 'drp-estimate.pdf'] },
  { number: 'CLM-26-0041190', policyNumber: 'H07-0821193', customerId: 'C-100772', lossDate: '2026-08-04', reportedDate: '2026-08-05', lossType: 'Home — Wind/Hail', location: '88 Mill Pond Road, Waukesha', description: 'Hail storm damaged roof shingles and gutters on the north side.', status: 'Payment Issued', adjuster: { name: 'Carlos Medina', phone: '(800) 367-3743 x5120', email: 'carlos.medina@erieinsurance.example' }, reserve: 14200, paid: 13200, deductible: 1000, injuries: false, policeReport: '', repairShop: 'Badger State Roofing', rental: '', notes: [{ date: '2026-08-06', author: 'Carlos Medina', text: 'Inspection scheduled for 8/8.' }, { date: '2026-08-08', author: 'Carlos Medina', text: 'Inspection complete. Full roof replacement approved under Guaranteed Replacement Cost.' }, { date: '2026-08-19', author: 'Carlos Medina', text: 'Payment issued to insured and mortgagee.' }], payments: [{ date: '2026-08-19', payee: 'Robert & Janet Kowalski / First Federal Mortgage', amount: 13200, type: 'Dwelling — roof replacement' }], attachments: ['roof-inspection.pdf'] },
  { number: 'CLM-26-0031847', policyNumber: 'A05-4471802', customerId: 'C-101034', lossDate: '2026-05-12', reportedDate: '2026-05-12', lossType: 'Auto — Comprehensive (Glass)', location: 'I-39 near Portage', description: 'Rock chip spread across windshield.', status: 'Closed', adjuster: { name: 'Jordan Pike', phone: '(800) 367-3743 x3318', email: 'jordan.pike@erieinsurance.example' }, reserve: 0, paid: 486, deductible: 250, injuries: false, policeReport: '', repairShop: 'Safelite AutoGlass', rental: '', notes: [{ date: '2026-05-12', author: 'Jordan Pike', text: 'Glass claim routed to network vendor.' }, { date: '2026-05-15', author: 'Jordan Pike', text: 'Windshield replaced. Claim closed.' }], payments: [{ date: '2026-05-15', payee: 'Safelite AutoGlass', amount: 486, type: 'Glass replacement' }], attachments: [] },
  { number: 'CLM-26-0050022', policyNumber: 'H07-2290571', customerId: 'C-101290', lossDate: '2026-09-27', reportedDate: '2026-09-28', lossType: 'Home — Water Damage', location: '17 Willow Bend Court, Middleton', description: 'Washing machine supply line burst; water damage to laundry room flooring and drywall.', status: 'Inspection', adjuster: { name: 'Priya Desai', phone: '(800) 367-3743 x6204', email: 'priya.desai@erieinsurance.example' }, reserve: 8500, paid: 0, deductible: 1000, injuries: false, policeReport: '', repairShop: 'ServiceMaster Restore — Madison (mitigation)', rental: '', notes: [{ date: '2026-09-28', author: 'Priya Desai', text: 'Mitigation vendor dispatched. Drying equipment placed.' }], payments: [], attachments: ['laundry-room.jpg'] },
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

// The Kowalski auto policy missed its first installment; ERIE has mailed a notice of cancellation.
const kowalskiAuto = policies.find((p) => p.number === 'A05-1120456')!;
kowalskiAuto.history = [{ date: '2026-09-25', text: 'Notice of cancellation for non-payment mailed — cancels 2026-10-15 unless $486.33 is received', by: 'System' }, ...kowalskiAuto.history];
kowalskiAuto.documents = [{ name: 'Notice of Cancellation — Non-payment', date: '2026-09-25', kind: 'Notice' }, ...kowalskiAuto.documents];

export function createSeed() {
  return { customers, policies, billing, claims, quotes: [sampleQuote], leads, envelopes };
}

export type PortalData = ReturnType<typeof createSeed>;
