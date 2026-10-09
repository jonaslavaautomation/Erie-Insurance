export type ProductKey = 'auto' | 'home' | 'umbrella' | 'boat' | 'life' | 'commercial';
export type PolicyType = 'Auto' | 'Home' | 'Boat' | 'Life' | 'Umbrella' | 'Business' | 'Commercial Auto' | 'Workers Comp';
export type PolicyStatus = 'Active' | 'Pending Cancel' | 'Cancelled' | 'Pending Issue';
export type QuoteStatus = 'Quote' | 'Referred' | 'Application' | 'Issued' | 'Declined' | 'Archived';
export type ClaimStatus = 'Reported' | 'Assigned' | 'Inspection' | 'Estimate Review' | 'Repair In Progress' | 'Payment Issued' | 'Closed';
export type PayPlan = 'Annual' | 'Semi-Annual' | 'Quarterly' | '9 Month' | 'Monthly';

export type Customer = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  phone: string;
  email: string;
  customerSince: string;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'M' | 'F' | 'X';
  maritalStatus: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  relationship: 'Named Insured' | 'Spouse' | 'Child' | 'Other Household';
  licenseState: string;
  licenseNumber: string;
  yearsLicensed: number;
  violations: number;
  accidents: number;
  driverTraining: boolean;
  goodStudent: boolean;
};

export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  use: 'Pleasure' | 'Commute' | 'Business' | 'Farm';
  annualMiles: number;
  garagingZip: string;
  antiTheft: boolean;
  airbags: boolean;
  antiLock: boolean;
  lienholder: string;
  reducedUsage: boolean;
};

export type AutoCoverages = {
  bodilyInjury: string;
  propertyDamage: string;
  uninsuredMotorist: string;
  medicalPayments: string;
  comprehensiveDeductible: number;
  collisionDeductible: number;
  rateLock: boolean;
  autoPlus: boolean;
  emergencyRoadService: boolean;
  transportationExpense: boolean;
  newAutoSecurity: boolean;
};

export type Property = {
  yearBuilt: number;
  squareFeet: number;
  construction: 'Frame' | 'Masonry' | 'Masonry Veneer';
  roofType: 'Asphalt Shingle' | 'Metal' | 'Slate' | 'Tile';
  roofYear: number;
  stories: number;
  heating: 'Gas Forced Air' | 'Electric' | 'Oil' | 'Heat Pump';
  protectionClass: number;
  smokeAlarms: boolean;
  burglarAlarm: boolean;
  sprinklers: boolean;
  dwellingType: 'Single Family' | 'Townhouse' | 'Condo' | 'Apartment' | 'Duplex';
};

export type HomeForm = 'HO-3' | 'HO-4' | 'HO-6' | 'DP-3';

export type HomeCoverages = {
  dwelling: number;
  // Coverages B, C and D as a percentage of Coverage A.
  otherStructuresPct: number;
  personalPropertyPct: number;
  lossOfUsePct: number;
  personalLiability: number;
  medicalPayments: number;
  deductible: number;
  waterBackup: boolean;
  identityRecovery: boolean;
  equipmentBreakdown: boolean;
  serviceLine: boolean;
  homeSharing: boolean;
  scheduledValuables: number;
  // Policy form: HO-3 homeowners (default), HO-4 renters, HO-6 condo unit-owners, DP-3 landlord/rental dwelling.
  form?: HomeForm;
  // Coverage C as a dollar amount for HO-4/HO-6, and landlord furnishings for DP-3.
  contentsLimit?: number;
};

export type BoatDetails = {
  year: number;
  make: string;
  model: string;
  length: number;
  horsepower: number;
  hullType: 'Fiberglass' | 'Aluminum' | 'Pontoon' | 'Personal Watercraft';
  engine: 'Outboard' | 'Inboard' | 'Inboard/Outboard' | 'Jet';
  agreedValue: number;
  trailerValue: number;
  storage: 'Trailer at residence' | 'Marina slip' | 'Lift at residence';
  waters: 'Inland lakes & rivers' | 'Great Lakes' | 'Coastal';
  operatorYears: number;
  safetyCourse: boolean;
  liability: number;
  deductible: number;
  towing: boolean;
  fishingEquipment: number;
};

export type LifeDetails = {
  faceAmount: number;
  term: 10 | 15 | 20 | 30;
  tobacco: boolean;
  healthClass: 'Preferred Plus' | 'Preferred' | 'Standard Plus' | 'Standard';
  heightIn: number;
  weightLb: number;
  beneficiary: string;
  beneficiaryRelation: string;
  acceleratedBenefit: boolean;
  childRider: boolean;
  waiverOfPremium: boolean;
};

export type UmbrellaDetails = {
  limit: number;
  autoExposures: number;
  youthfulOperators: number;
  watercraft: number;
  recreationalVehicles: number;
  residences: number;
  // Used when the underlying auto/home is written by another carrier.
  otherAutoLimits: string;
  otherHomeLiability: number;
};

export type ContractorsDetails = {
  trade: string;
  subcontractedPct: number;
  equipmentFloater: number;
  installationFloater: number;
  toolsLimit: number;
  additionalInsuredBlanket: boolean;
};

export type CommercialVehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  bodyType: 'Private Passenger' | 'Light Truck' | 'Medium Truck' | 'Heavy Truck';
  costNew: number;
  radius: 'Local (0–50 mi)' | 'Intermediate (51–200 mi)' | 'Long Haul (200+ mi)';
};

export type CommercialDriver = { id: string; name: string; age: number; violations: number; accidents: number };

export type TruckingDetails = { usdot: string; mcNumber: string; commodity: string; cargoLimit: number; trailerInterchange: boolean; trailers: number };

export type CommercialAutoDetails = {
  vehicles: CommercialVehicle[];
  drivers: CommercialDriver[];
  liability: '500,000 CSL' | '1,000,000 CSL';
  physicalDamageDeductible: number;
  garagekeepers: boolean;
  garagekeepersLimit: number;
  hiredNonOwned: boolean;
  // Present for for-hire trucking (motor carrier) policies.
  trucking?: TruckingDetails;
};

export type WorkersCompClass = { id: string; code: string; payroll: number };

export type WorkersCompDetails = {
  classes: WorkersCompClass[];
  experienceMod: number;
  employersLiability: '100/500/100' | '500/500/500' | '1M/1M/1M';
};

export type CommercialLine = 'bop' | 'contractors' | 'commercialAuto' | 'workersComp';

export type CommercialDetails = {
  lines: CommercialLine[];
  business: BusinessDetails;
  contractors: ContractorsDetails;
  commercialAuto: CommercialAutoDetails;
  workersComp: WorkersCompDetails;
};

export type BusinessDetails = {
  businessName: string;
  ownerFirst: string;
  ownerLast: string;
  entity: 'LLC' | 'Corporation' | 'Sole Proprietor' | 'Partnership';
  fein: string;
  yearsInBusiness: number;
  classCode: string;
  description: string;
  revenue: number;
  payroll: number;
  employees: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  ownsBuilding: boolean;
  construction: 'Frame' | 'Joisted Masonry' | 'Non-combustible' | 'Masonry Non-combustible' | 'Fire Resistive';
  yearBuilt: number;
  squareFeet: number;
  sprinklered: boolean;
  alarm: 'None' | 'Local' | 'Central Station';
  buildingLimit: number;
  bppLimit: number;
  glLimit: '1M/2M' | '2M/4M';
  propertyDeductible: number;
  cyber: boolean;
  epli: boolean;
  hiredNonOwnedAuto: boolean;
  equipmentBreakdown: boolean;
  employeeDishonesty: boolean;
};

export type PremiumLine = { label: string; amount: number };
export type PremiumBreakdown = {
  product: PolicyType;
  // Display name, e.g. "ErieSecure Home®" or "Ultrapack Plus".
  name?: string;
  lines: PremiumLine[];
  discounts: PremiumLine[];
  total: number;
};

export type Quote = {
  id: string;
  customerId?: string;
  applicant: {
    firstName: string;
    middleName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    dob: string;
    phone: string;
    email: string;
  };
  products: ProductKey[];
  agentNumbers: Partial<Record<ProductKey, string>>;
  status: QuoteStatus;
  effectiveDate: string;
  // Question answers ('yes' | 'no') plus workflow flags prefixed with '_' (approval, payment, disclosures).
  underwriting: Record<string, string>;
  drivers: Driver[];
  vehicles: Vehicle[];
  autoCoverages: AutoCoverages;
  property: Property;
  homeCoverages: HomeCoverages;
  boat: BoatDetails;
  life: LifeDetails;
  umbrella: UmbrellaDetails;
  commercial: CommercialDetails;
  priorCarrier: string;
  priorYears: number;
  payPlan: PayPlan;
  autoPay: boolean;
  signatureMethod: 'eSignature' | 'Wet Signature' | '';
  issuedPolicies: string[];
  createdAt: string;
  updatedAt: string;
  lastStep: string;
  // Status before archiving, restored when the quote is un-archived.
  preArchiveStatus?: QuoteStatus;
};

export type PolicyDocument = { name: string; date: string; kind: 'Declarations' | 'ID Card' | 'Application' | 'Endorsement' | 'Notice' | 'Bill' };
export type HistoryEntry = { date: string; text: string; by: string };

export type Policy = {
  number: string;
  type: PolicyType;
  customerId: string;
  status: PolicyStatus;
  effective: string;
  expiration: string;
  premium: number;
  payPlan: PayPlan;
  autoPay: boolean;
  agentNumber: string;
  drivers: Driver[];
  vehicles: Vehicle[];
  autoCoverages?: AutoCoverages;
  property?: Property;
  homeCoverages?: HomeCoverages;
  boat?: BoatDetails;
  life?: LifeDetails;
  business?: BusinessDetails;
  umbrella?: UmbrellaDetails;
  contractors?: ContractorsDetails;
  commercialAuto?: CommercialAutoDetails;
  workersComp?: WorkersCompDetails;
  // Distinguishes monoline commercial lines that share a policy type, e.g. Commercial Property vs. BOP.
  policyForm?: 'Commercial Property' | 'Trucking';
  description: string;
  documents: PolicyDocument[];
  history: HistoryEntry[];
  quoteId?: string;
};

export type Payment = { id: string; date: string; amount: number; method: string; confirmation: string; policyNumber: string };

export type BillingAccount = {
  policyNumber: string;
  balance: number;
  nextDueDate: string;
  minimumDue: number;
  payments: Payment[];
};

export type ClaimNote = { date: string; author: string; text: string };
export type ClaimPayment = { date: string; payee: string; amount: number; type: string };

export type Claim = {
  number: string;
  policyNumber: string;
  customerId: string;
  lossDate: string;
  reportedDate: string;
  lossType: string;
  location: string;
  description: string;
  status: ClaimStatus;
  adjuster: { name: string; phone: string; email: string };
  reserve: number;
  paid: number;
  deductible: number;
  injuries: boolean;
  policeReport: string;
  repairShop: string;
  rental: string;
  notes: ClaimNote[];
  payments: ClaimPayment[];
  attachments: string[];
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zip: string;
  interest: string;
  source: string;
  received: string;
  status: 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Lost';
};

export type Envelope = {
  id: string;
  customer: string;
  document: string;
  sent: string;
  status: 'Sent' | 'Viewed' | 'Signed' | 'Expired';
};

export type Toast = { id: number; text: string; tone: 'success' | 'info' | 'error' };
