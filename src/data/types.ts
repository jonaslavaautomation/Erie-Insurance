export type ProductKey = 'auto' | 'home' | 'umbrella' | 'boat' | 'life' | 'commercial';
export type PolicyType = 'Auto' | 'Home' | 'Boat' | 'Life' | 'Umbrella' | 'Business' | 'Commercial Auto' | 'Workers Comp';
export type PolicyStatus = 'Active' | 'Pending Cancel' | 'Cancelled' | 'Pending Issue';
export type QuoteStatus = 'Quote' | 'Referred' | 'Application' | 'Issued' | 'Declined' | 'Archived';
export type ClaimStatus = 'Claim Submitted' | 'Adjuster Assigned' | 'Inspection' | 'Estimate Approved' | 'Payment Issued' | 'Closed';
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
  // A prospect: added when a quote was started, before anything was bound.
  prospect?: boolean;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  // '' = not yet answered (household prefill records arrive incomplete).
  gender: 'M' | 'F' | 'X' | '';
  maritalStatus: 'Single' | 'Married' | 'Widowed' | 'Divorced' | '';
  relationship: 'Named Insured' | 'Spouse' | 'Child' | 'Parent' | 'Other Relative' | 'Other Household' | '';
  licenseState: string;
  licenseNumber: string;
  yearsLicensed: number;
  violations: number;
  accidents: number;
  driverTraining: boolean;
  goodStudent: boolean;
  // Named driver exclusion (form AU-220): listed on the policy but not rated or covered.
  excluded?: boolean;
  // Personal lines quoting detail.
  middleName?: string;
  preferredName?: string;
  suffix?: string;
  driverType?: 'Insured Driver' | 'Excluded Driver' | 'Non-Driver';
  taxId?: string;
  taxIdType?: 'SSN' | 'ITIN';
  differentNameOnLicense?: boolean;
  // MM/YYYY
  dateFirstLicensed?: string;
  yearsInState?: '' | 'Less than 1 year' | '1 Year or more' | '3 Years or more' | '5 Years or more';
  collegeStudentAway?: '' | 'yes' | 'no';
  yourTurn?: boolean;
  // Driver row status: reviewed and saved by the agent.
  reviewed?: boolean;
  taxIdVerified?: boolean;
  dlnVerified?: boolean;
  deceased?: boolean;
  lifeTenant?: boolean;
};

export type VehicleCoverage = { include: boolean; medPay: string; comp: number; coll: number; roadside: string; autoSecurity: string };

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
  // Personal lines quoting detail.
  vehicleType?: 'Private Passenger' | 'Motorcycle' | 'Motorhome' | 'Trailer';
  modelDetails?: string;
  antiTheftDevice?: string;
  primaryOperatorId?: string;
  partTimeOperatorId?: string;
  daysPerWeek?: number;
  milesToWork?: number;
  drivenYearRound?: boolean;
  garagingAddress?: string;
  registeredOwner?: string;
  forceMultiCar?: boolean;
  reviewed?: boolean;
  coverage?: VehicleCoverage;
};

export type AutoCoverages = {
  bodilyInjury: string;
  propertyDamage: string;
  uninsuredMotorist: string;
  // Shown separately on the coverages screen; defaults to the uninsured motorists limit.
  underinsuredMotorist?: string;
  // Pennsylvania tort election, and Maryland PIP waiver.
  tort?: 'Full Tort' | 'Limited Tort';
  pipWaived?: boolean;
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
  construction: 'Frame' | 'Masonry' | 'Masonry Veneer' | 'Fire Resistive' | '';
  roofType: 'Asphalt Shingle' | 'Metal' | 'Slate' | 'Tile';
  roofYear: number;
  stories: number;
  heating: 'Gas Forced Air' | 'Electric' | 'Oil' | 'Heat Pump';
  protectionClass: number;
  smokeAlarms: boolean;
  burglarAlarm: boolean;
  sprinklers: boolean;
  dwellingType: 'Single Family' | 'Townhouse' | 'Condo' | 'Apartment' | 'Duplex';
  // Personal lines dwelling detail.
  swimmingPool?: boolean;
  families?: number;
  dwellingStyle?: string;
  alarm?: 'None' | 'Local' | 'Central';
  roofMaterial?: string;
  lossSettlement?: string;
  perils?: string;
  roofWindHailSettlement?: 'Yes' | 'No';
  ppLossSettlement?: string;
  ppPerils?: string;
  highValueVendor?: boolean;
  mailDecToAgency?: boolean;
};

export type ReportRow = { id: string; driverId: string; name: string; driverType: string; report: string; date: string; status: string; lossDate: string; amount: number | null; detail: string };

export type RatingPlan = 'Exchange' | 'Company' | 'ErieSecure Auto';

// Personal lines quoting (Customer → Drivers → Vehicles → Dwelling → Reports → Coverages).
export type PersonalLinesInfo = {
  prefillDone: boolean;
  secondNamedInsuredId: string;
  mailing3Years: '' | 'yes' | 'no';
  livesAtMailing: '' | 'yes' | 'no';
  isPropertyLocation: '' | 'yes' | 'no';
  county: string;
  township: string;
  autoCarrier: string;
  autoYears: string;
  priorBodilyInjury: string;
  homeCarrier: string;
  additionalPolicies: string[];
  completed: string[];
  reports: ReportRow[];
  ratingPlan: RatingPlan;
  rated: boolean;
  ratedAt: string;
  convert: ProductKey[];
  // Insured location when it differs from the mailing address.
  location?: { address: string; city: string; state: string; zip: string };
  // Products the agent unchecked under Products to Convert.
  skip?: ProductKey[];
  // Drivers / named insureds the current reports were ordered for.
  reportsKey?: string;
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
  windHailDeductible?: string;
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
  // 2 = verified ISO class codes; older saves used codes that were reassigned.
  codeVersion?: number;
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
  // ISO size class, derived from gross vehicle weight (truck-tractors are rated on combined weight).
  bodyType: 'Private Passenger' | 'Light Truck' | 'Medium Truck' | 'Heavy Truck' | 'Extra-Heavy Truck' | 'Truck-Tractor';
  costNew: number;
  // ISO radius classes: local up to 50 miles, intermediate 51–200, long distance over 200.
  radius: 'Local (0–50 mi)' | 'Intermediate (51–200 mi)' | 'Long Haul (200+ mi)';
  vin?: string;
  // Gross vehicle weight (or gross combination weight for truck-tractors), in pounds.
  gvw?: number;
  // ISO business use class.
  use?: 'Service' | 'Retail' | 'Commercial';
};

export type CommercialDriver = { id: string; name: string; age: number; violations: number; accidents: number; cdl?: boolean; yearsLicensed?: number };

export type TruckingDetails = { usdot: string; mcNumber: string; commodity: string; cargoLimit: number; trailerInterchange: boolean; trailers: number };

export type CommercialAutoDetails = {
  vehicles: CommercialVehicle[];
  drivers: CommercialDriver[];
  liability: '500,000 CSL' | '1,000,000 CSL';
  uninsuredMotorist?: 'None' | '500,000 CSL' | '1,000,000 CSL';
  medicalPayments?: number;
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

export type CommercialLine = 'bop' | 'contractors' | 'commercialAuto' | 'workersComp' | 'umbrella';

export type CommercialDetails = {
  lines: CommercialLine[];
  business: BusinessDetails;
  contractors: ContractorsDetails;
  commercialAuto: CommercialAutoDetails;
  workersComp: WorkersCompDetails;
  umbrella?: { limit: number };
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
  // ISO construction classes 1–6.
  construction: 'Frame' | 'Joisted Masonry' | 'Non-combustible' | 'Masonry Non-combustible' | 'Modified Fire Resistive' | 'Fire Resistive';
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
  // Property rating and conditions.
  protectionClass?: number;
  stories?: number;
  coinsurance?: 80 | 90 | 100;
  valuation?: 'Replacement Cost' | 'Actual Cash Value';
  windHailPct?: 0 | 1 | 2 | 5;
  // Terrorism (TRIA) must be offered; the insured accepts or rejects it in writing.
  terrorism?: boolean;
  // Prior insurance and five-year loss history from loss runs.
  priorCarrier?: string;
  priorYears?: number;
  lossCount5yr?: number;
  lossIncurred5yr?: number;
};

// ref: the vehicle (or other item) the line belongs to, for per-item display.
export type PremiumLine = { label: string; amount: number; ref?: string };
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
  // 'pl' = personal lines quoting screens (Customer, Drivers, Vehicles, Dwelling, Reports, Coverages).
  flow?: 'pl';
  // 10-digit quote number per product.
  numbers?: Partial<Record<ProductKey, string>>;
  templates?: Partial<Record<ProductKey, string>>;
  homePolicyType?: string;
  pl?: PersonalLinesInfo;
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
  policyForm?: 'Commercial Property' | 'Trucking' | 'Commercial Umbrella';
  mortgagees?: Mortgagee[];
  endorsements?: PolicyEndorsement[];
  description: string;
  documents: PolicyDocument[];
  history: HistoryEntry[];
  quoteId?: string;
};

export type Payment = { id: string; date: string; amount: number; method: string; confirmation: string; policyNumber: string; kind?: 'Installment' | 'Late fee' | 'Reinstatement' | 'Down payment' };

// Lender or loss payee on a home or auto policy. The clause is printed on evidence of insurance.
export type Mortgagee = {
  id: string;
  role: 'First mortgagee' | 'Second mortgagee' | 'Loss payee' | 'Lienholder';
  name: string;
  clause: 'ISAOA/ATIMA' | 'ISAOA' | 'ATIMA' | 'None';
  loanNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  // For auto loss payees, the vehicle the interest applies to.
  vehicleId?: string;
};

export type EndorsementType = 'Add vehicle' | 'Replace vehicle' | 'Remove vehicle' | 'Add driver' | 'Change driver' | 'Exclude driver' | 'Remove driver' | 'Coverage change' | 'Garaging address' | 'Mortgagee / loss payee';

// One processed policy change, kept on the policy for the dec page and history.
export type PolicyEndorsement = {
  id: string;
  type: EndorsementType;
  description: string;
  processed: string;
  effective: string;
  premiumBefore: number;
  premiumAfter: number;
  proRata: number;
  by: string;
};

// Saved card or bank account for one-time payments and EriePay AutoPay.
export type PaymentMethod = {
  id: string;
  customerId: string;
  kind: 'card' | 'ach';
  brand: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Checking' | 'Savings';
  last4: string;
  holder: string;
  expiry?: string;
  bankName?: string;
  isDefault: boolean;
};

export type BillingAccount = {
  policyNumber: string;
  balance: number;
  nextDueDate: string;
  minimumDue: number;
  payments: Payment[];
  // Future-dated payments, applied automatically on their date.
  scheduled?: Payment[];
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
  thirdParty?: ThirdParty;
  lossTime?: string;
};

export type ThirdParty = { name: string; phone: string; insurer: string; policyNumber: string; vehicle: string; plate: string };

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
