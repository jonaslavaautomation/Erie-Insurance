// Portal content: navigation, product guides, resources, news, forms and directory.
// Product facts are drawn from ERIE's public materials; rates and internal details are illustrative.

export type PortalLink = { label: string; to: string };
export type MenuColumn = { heading: string; links: PortalLink[] };
export type MenuItem = { label: string; columns: MenuColumn[] };

export const navMenus: MenuItem[] = [
  {
    label: 'PRODUCTS',
    columns: [
      { heading: 'Personal Lines', links: [{ label: 'Auto', to: '/products/auto' }, { label: 'ErieSecure Home®', to: '/products/home' }, { label: 'Renters (HO-4)', to: '/products/renters' }, { label: 'Condo (HO-6)', to: '/products/condo' }, { label: 'Landlord / Rental Dwelling (DP-3)', to: '/products/landlord' }, { label: 'Boat & Watercraft', to: '/products/boat' }, { label: 'Personal Catastrophe Liability (Umbrella)', to: '/products/umbrella' }] },
      { heading: 'Commercial Lines', links: [{ label: 'Start a commercial quote', to: '/commercial/quote' }, { label: 'Ultrapack Plus (BOP)', to: '/products/bop' }, { label: 'Fivestar Contractors Package', to: '/products/fivestar-contractors' }, { label: 'ErieSecure Business®', to: '/products/eriesecure-business' }, { label: 'Commercial Auto', to: '/products/commercial-auto' }, { label: 'Trucking (Motor Carrier)', to: '/products/trucking' }, { label: 'Commercial Property', to: '/products/commercial-property' }, { label: "Workers' Compensation", to: '/products/workers-comp' }, { label: 'Commercial Package', to: '/products/commercial-package' }] },
      { heading: 'Erie Family Life', links: [{ label: 'ERIExpress Life', to: '/products/eriexpress-life' }, { label: 'Term Life', to: '/products/term-life' }, { label: 'Whole & Universal Life', to: '/products/permanent-life' }, { label: 'Annuities', to: '/products/annuities' }, { label: 'Medicare Supplement', to: '/products/medicare-supplement' }] },
    ],
  },
  {
    label: 'BILLING',
    columns: [
      { heading: 'Payments', links: [{ label: 'Payment Center', to: '/billing' }, { label: 'One-time payment service', to: '/billing/pay' }, { label: 'AutoPay enrollment', to: '/billing/autopay' }] },
      { heading: 'Forms & Resources', links: [{ label: 'Account Billing Request Form (AF-60)', to: '/resources/af-60' }, { label: 'Payment center Resources', to: '/resources/payment-center-resources' }, { label: 'ERIEpay Resources', to: '/resources/eriepay' }, { label: 'Billing Resources (Commercial lines)', to: '/resources/commercial-billing' }] },
    ],
  },
  {
    label: 'CLAIMS',
    columns: [
      { heading: 'Claims', links: [{ label: 'Claims Center', to: '/claims' }, { label: 'Report a claim (FNOL)', to: '/claims/new' }, { label: 'Open claims', to: '/claims?status=open' }] },
      { heading: 'Resources', links: [{ label: 'Direct Repair Program', to: '/resources/direct-repair-program' }, { label: 'Catastrophe response', to: '/resources/catastrophe-response' }, { label: 'Claims handling guide', to: '/resources/claims-guide' }] },
    ],
  },
  {
    label: 'RESOURCES & TOOLS',
    columns: [
      { heading: 'Forms & Manuals', links: [{ label: 'ERIEbooks', to: '/resources/eriebooks' }, { label: 'Forms on Demand', to: '/resources/forms-on-demand' }, { label: 'DSpro Web Resources', to: '/resources/dspro' }] },
      { heading: 'Calculators', links: [{ label: 'Home Cost Estimator', to: '/resources/home-cost-estimator' }, { label: 'Commercial Building Valuation', to: '/resources/building-valuation' }] },
      { heading: 'Agency Tools', links: [{ label: 'Agency work queue', to: '/work-queue' }, { label: 'Certificates of Insurance', to: '/resources/certificates' }, { label: 'eSignature Dashboard', to: '/resources/esignature' }, { label: 'Online Leads Dashboard', to: '/resources/online-leads' }, { label: 'Reports', to: '/reports/performance' }, { label: 'ERIE Contacts', to: '/contacts' }] },
    ],
  },
  {
    label: 'EDUCATION',
    columns: [
      { heading: 'Learning', links: [{ label: 'Learning Management System', to: '/resources/lms' }, { label: 'Learning Management System Guide', to: '/resources/lms-guide' }, { label: 'Continuing education credits', to: '/resources/lms?tab=ce' }] },
      { heading: 'Training Paths', links: [{ label: 'New agent onboarding', to: '/resources/lms?tab=onboarding' }, { label: 'Personal lines product training', to: '/resources/lms?tab=personal' }, { label: 'Commercial lines product training', to: '/resources/lms?tab=commercial' }] },
    ],
  },
  {
    label: 'MARKETING',
    columns: [
      { heading: 'Materials', links: [{ label: 'Order marketing materials', to: '/resources/marketing-materials' }, { label: 'Social media library', to: '/resources/social-media' }, { label: 'Brand standards', to: '/resources/brand-standards' }] },
      { heading: 'Programs', links: [{ label: 'Co-op advertising', to: '/resources/co-op' }, { label: 'Contests & Incentives', to: '/contests' }] },
    ],
  },
  {
    label: 'ABOUT LAVA',
    columns: [
      { heading: 'Company', links: [{ label: 'About Erie Insurance', to: '/resources/about-erie' }, { label: "Founder's Vision", to: '/resources/founders-vision' }, { label: 'News Archive', to: '/news' }] },
      { heading: 'Agent Community', links: [{ label: 'What is Task Force', to: '/resources/task-force' }, { label: 'Task Force Top Priorities', to: '/resources/task-force-priorities' }, { label: 'ERIE Contacts', to: '/contacts' }] },
    ],
  },
];

// Every dashboard link label resolves through here.
export const linkTargets: Record<string, string> = {
  'See entire list of quotes/apps': '/quotes',
  'DSpro Web Resources': '/resources/dspro',
  'Manage templates': '/quotes/templates',
  'American Bankers for Flood Insurance': '/resources/flood',
  'eSignature Dashboard': '/resources/esignature',
  'eSignature Resource Page': '/resources/esignature-help',
  'New Online Leads Dashboard': '/resources/online-leads',
  'Online Leads Dashboard': '/resources/online-leads?view=classic',
  'Online Leads Help Center & FAQs': '/resources/online-leads-help',
  'Underwriting Guidelines': '/resources/underwriting-guidelines',
  'Rules Manual': '/resources/rules-manual',
  'Named Insured Status Domestic': '/resources/named-insured-domestic',
  ERIEbooks: '/resources/eriebooks',
  'Forms on Demand': '/resources/forms-on-demand',
  'Commercial Building Valuation': '/resources/building-valuation',
  'Home Cost Estimator': '/resources/home-cost-estimator',
  'Learning Management System | Guide': '/resources/lms',
  'Certificates of Insurance': '/resources/certificates',
  'One-time payment service': '/billing/pay',
  'Payment Center': '/billing',
  'Account Billing Request Form (AF-60)': '/resources/af-60',
  'Payment center Resources': '/resources/payment-center-resources',
  'ERIEpay Resources': '/resources/eriepay',
  'Billing Resources (Commercial lines)': '/resources/commercial-billing',
  'What is Task Force': '/resources/task-force',
  'Message from the Moderator (4/21/26)': '/resources/task-force-moderator',
  'Top Priorities (4/21/26)': '/resources/task-force-priorities',
  'Claims Center': '/claims',
  'Report a claim': '/claims/new',
  'Direct Repair Program': '/resources/direct-repair-program',
  'Policy change request': '/customers',
};

export type ProductGuide = {
  slug: string;
  name: string;
  line: 'PERSONAL' | 'COMMERCIAL' | 'LIFE';
  quoteProduct?: 'auto' | 'home' | 'umbrella' | 'boat' | 'life' | 'commercial';
  tagline: string;
  coverages: string[];
  options: string[];
  discounts: string[];
  eligibility: string[];
};

export const productGuides: ProductGuide[] = [
  { slug: 'auto', name: 'Private Passenger Auto', line: 'PERSONAL', quoteProduct: 'auto', tagline: 'Auto coverage with ERIE Rate Lock® and the ERIE Auto Plus® endorsement.', coverages: ['Bodily injury & property damage liability', 'Uninsured / underinsured motorists', 'Medical payments / first party benefits (state specific)', 'Comprehensive and collision', 'Pet injury coverage (included in many states)', 'Personal item coverage (up to $350, included)'], options: ['ERIE Rate Lock® — premium changes only when drivers, vehicles or address change', 'ERIE Auto Plus® — diminishing deductible ($100 per claim-free year, up to $500), higher limits on extras, $10,000 death benefit', 'Emergency road service — towing, jump-starts, lockouts', 'Transportation expenses — rental or ride costs after a covered loss', 'New Auto Security — replacement with no depreciation for vehicles up to two model years old', 'Rideshare coverage', 'Custom equipment'], discounts: ['Multi-policy (10% with ERIE home)', 'Multi-car', 'Safe driving', 'Youthful driver (unmarried, under 21, living at home)', 'Driver training', 'Reduced usage (vehicle not driven 90+ consecutive days)', 'Car safety equipment (air bags, anti-lock brakes, anti-theft)', 'Pay-in-full', 'Annual mileage'], eligibility: ['Vehicles principally garaged in an ERIE operating state', 'No household driver with DUI/DWI in prior 5 years without underwriting approval', 'No vehicles used for delivery or livery without business endorsement', 'Prior insurance required for preferred tiers; lapses over 30 days refer to underwriting'] },
  { slug: 'home', name: 'ErieSecure Home®', line: 'PERSONAL', quoteProduct: 'home', tagline: 'Homeowners coverage with Guaranteed Replacement Cost on the dwelling.', coverages: ['Coverage A · Dwelling — Guaranteed Replacement Cost (rebuild even above the limit, no depreciation)', 'Coverage B · Other structures — 10% of A (up to 20%)', 'Coverage C · Personal property — 50–70% of A, including theft and accidental loss', 'Coverage D · Loss of use — 20% of A', 'Coverage E · Personal liability — $100,000 to $1,000,000', 'Coverage F · Medical payments — $1,000 to $5,000', 'Animals up to $500; cash & precious metals up to $500'], options: ['Water backup & sump discharge', 'Identity recovery', 'Equipment breakdown', 'Service line (underground utility lines)', 'Home-sharing host coverage', 'Scheduled valuables — jewelry, fine art, collections', 'Personal property replacement cost'], discounts: ['Multi-policy (15% with ERIE auto)', 'Protective devices — smoke alarms, burglar alarms, automatic sprinklers', 'Advance quote (purchased 7+ days before effective date)', 'Newer home'], eligibility: ['Owner-occupied 1–4 family dwellings', 'Roof age and condition per state guideline; 20+ year asphalt roofs refer to underwriting', 'No unrepaired prior damage', 'Dogs with a bite history and unfenced pools/trampolines refer to underwriting', 'No more than two losses in the past 3 years'] },
  { slug: 'renters', name: 'Renters', line: 'PERSONAL', tagline: 'Personal property and liability protection for renters.', coverages: ['Personal property', 'Loss of use', 'Personal liability', 'Medical payments to others'], options: ['Identity recovery', 'Scheduled valuables', 'Water backup'], discounts: ['Multi-policy', 'Protective devices'], eligibility: ['Tenant-occupied residence', 'No business conducted on premises without endorsement'] },
  { slug: 'condo', name: 'Condominium', line: 'PERSONAL', tagline: 'Unit-owner coverage that complements the association master policy.', coverages: ['Building additions & alterations', 'Personal property', 'Loss assessment', 'Loss of use', 'Personal liability'], options: ['Water backup', 'Identity recovery', 'Equipment breakdown'], discounts: ['Multi-policy', 'Protective devices'], eligibility: ['Owner-occupied or seasonal condominium units', 'Association master policy details required'] },
  { slug: 'landlord', name: 'Rental Dwelling / Landlord (DP-3)', line: 'PERSONAL', tagline: 'Coverage for 1–4 family homes the insured rents to others.', coverages: ['Coverage A · Dwelling — replacement cost', 'Coverage B · Other structures', 'Coverage C · Landlord furnishings', 'Coverage D · Fair rental value — lost rent after a covered loss', 'Coverage L · Premises liability', 'Coverage M · Medical payments'], options: ['Water backup & sump discharge', 'Service line', 'Equipment breakdown'], discounts: ['Multi-policy', 'Protective devices'], eligibility: ['1–4 family dwellings rented on annual leases', 'Short-term (nightly) rentals refer to underwriting', 'Vacant dwellings are ineligible'] },
  { slug: 'boat', name: 'Boat & Watercraft', line: 'PERSONAL', quoteProduct: 'boat', tagline: 'Physical damage and liability for boats, motors, trailers and personal watercraft.', coverages: ['Physical damage — agreed value', 'Watercraft liability', 'Medical payments', 'Uninsured boaters'], options: ['Towing & assistance', 'Fishing equipment', 'Trailer coverage'], discounts: ['Multi-policy', 'Boating safety course', 'Claim-free'], eligibility: ['Hull length up to 26 ft and 300 HP for standard program', 'Operators 16+ with safety certificate where required'] },
  { slug: 'umbrella', name: 'Personal Catastrophe Liability (Umbrella)', line: 'PERSONAL', quoteProduct: 'umbrella', tagline: 'Umbrella liability from $1 million to $5 million above auto, home and watercraft — typically about $20 a month or less per $1 million.', coverages: ['Excess liability over auto, home and watercraft', 'Bodily injury, property damage and personal injury (libel, slander)', 'Worldwide coverage'], options: ['Limits of $1M to $5M in $1M increments', 'Uninsured/underinsured motorists excess (select states)'], discounts: ['Auto + Home + Umbrella: additional 5% bundle credit'], eligibility: ['Underlying auto: 250/500/100 split or 500 CSL', 'Underlying home: $300,000 personal liability', 'More than 2 youthful operators refers to underwriting', 'Aircraft ownership is ineligible'] },
  { slug: 'eriesecure-business', name: 'ErieSecure Business®', line: 'COMMERCIAL', tagline: 'Business property and liability with Guaranteed Replacement Cost and real-time quoting.', coverages: ['Building — Guaranteed Replacement Cost', 'Business personal property', 'Business income & extra expense', 'General liability', 'Cyber and data breach options'], options: ['Equipment breakdown', 'Employment practices liability', 'Hired & non-owned auto', 'Contractors equipment'], discounts: ['Sprinkler systems', 'Central or local fire alarm', 'Franchise programs', 'Multi-policy'], eligibility: ['Eligible classes per appetite guide', 'Annual revenue thresholds vary by class'] },
  { slug: 'bop', name: 'Ultrapack Plus (Business Owners Policy)', line: 'COMMERCIAL', quoteProduct: 'commercial', tagline: 'Packaged business property and liability for small and mid-size businesses.', coverages: ['Building and business personal property', 'Income Protection — 12 months actual loss sustained', 'Extra Expense', 'Civil Authority — when access is prohibited due to nearby damage', 'Rental income protection (for landlords)', 'General liability — $1M/$2M or $2M/$4M'], options: ['Cyber & data breach', 'Employment practices liability', 'Hired & non-owned auto', 'Equipment breakdown', 'Employee dishonesty'], discounts: ['Automatic sprinklers', 'Central station or local fire alarm', 'Established business (5+ years)', 'Personal + commercial multi-policy credit'], eligibility: ['Office, retail, service, food service and personal services classes per appetite guide', 'Contractors and auto repair refer to underwriting'] },
  { slug: 'fivestar-contractors', name: 'Fivestar Contractors Package', line: 'COMMERCIAL', quoteProduct: 'commercial', tagline: 'A package for small and mid-size trade contractors combining liability with tool and equipment coverage.', coverages: ['Contractors general liability', 'Contractors equipment floater (inland marine)', 'Installation floater', 'Tools and small equipment', 'Package enhancements included'], options: ['Blanket additional insured — owners, lessees or contractors', 'Higher liability limits — $2M/$4M'], discounts: ['Low subcontracting credit', 'Personal + commercial multi-policy credit'], eligibility: ['Specialty trades: plumbing, electrical, HVAC, interior carpentry, painting, landscaping', 'Framing contractors and more than 50% subcontracted refer', 'Roofing is ineligible'] },
  { slug: 'commercial-auto', name: 'Commercial Auto', line: 'COMMERCIAL', quoteProduct: 'commercial', tagline: 'Coverage for business-owned vehicles and fleets.', coverages: ['Liability', 'Physical damage', 'Uninsured motorists', 'Medical payments'], options: ['Hired & non-owned', 'Garagekeepers liability', 'Rental reimbursement', 'Towing'], discounts: ['Fleet (5+ units)', 'Safety program'], eligibility: ['Local and intermediate radius operations; long-haul heavy trucking ineligible', 'MVRs required for all drivers; 3+ incidents refer'] },
  { slug: 'trucking', name: 'Trucking (Motor Carrier)', line: 'COMMERCIAL', tagline: 'For-hire and private carriers: auto liability, physical damage, cargo and federal filings.', coverages: ['Auto liability — $1M CSL with MCS-90 endorsement', 'Tractor and trailer physical damage', 'Motor truck cargo', 'Federal (BMC-91X) and state filings'], options: ['Trailer interchange', 'Non-owned trailer', 'Hired & non-owned auto'], discounts: ['Fleet (5+ units)', 'Safety program / ELD telematics'], eligibility: ['Intermediate radius (up to 200 miles); long-haul heavy trucking refers or declines', 'CDL-A drivers with clean MVRs; 3+ incidents refer', 'Hazmat haulers ineligible'] },
  { slug: 'commercial-property', name: 'Commercial Property', line: 'COMMERCIAL', tagline: 'Monoline building and contents coverage for larger or non-BOP-eligible locations.', coverages: ['Building — replacement cost, 90% coinsurance', 'Business personal property', 'Income Protection', 'Extra Expense'], options: ['Equipment breakdown', 'Employee dishonesty', 'Agreed value'], discounts: ['Automatic sprinklers', 'Central station alarm'], eligibility: ['Warehouse, office, retail and light manufacturing buildings', 'Liability written on a separate general liability policy'] },
  { slug: 'workers-comp', name: "Workers' Compensation", line: 'COMMERCIAL', quoteProduct: 'commercial', tagline: 'Statutory coverage for employee injuries plus employers liability.', coverages: ['Part One — statutory benefits', 'Part Two — employers liability'], options: ['Pay-as-you-go billing', 'Other states coverage'], discounts: ['Experience modification (E-Mod)', 'Premium discount over $10,000 standard premium', 'Drug-free workplace (state specific)'], eligibility: ['Rated by class code × estimated payroll × E-Mod', 'E-Mod above 1.25 refers to underwriting', 'Loss runs for prior 3 years'] },
  { slug: 'commercial-package', name: 'Commercial Package', line: 'COMMERCIAL', tagline: 'Monoline or package property, liability, crime and inland marine.', coverages: ['Commercial property', 'General liability', 'Crime', 'Inland marine'], options: ['Umbrella', 'Equipment breakdown'], discounts: ['Package credit', 'Protective devices'], eligibility: ['Larger or complex risks not eligible for ErieSecure Business'] },
  { slug: 'eriexpress-life', name: 'ERIExpress Life', line: 'LIFE', quoteProduct: 'life', tagline: 'Simplified-issue term life with a fast online application.', coverages: ['Term periods of 10, 15, 20 or 30 years', 'Face amounts up to $500,000'], options: ['Accelerated death benefit rider'], discounts: ['Preferred non-tobacco classes'], eligibility: ['Ages 18–65', 'No medical exam for most applicants; health questions required'] },
  { slug: 'term-life', name: 'Term Life', line: 'LIFE', tagline: 'Fully underwritten term life including ERIE Lifetime Term.', coverages: ['Level premium periods', 'Coverage to age 100 option (Lifetime Term)'], options: ['Children’s term rider', 'Waiver of premium'], discounts: ['Preferred classes'], eligibility: ['Ages 18–75 by product'] },
  { slug: 'permanent-life', name: 'Whole & Universal Life', line: 'LIFE', tagline: 'Permanent protection with cash value accumulation.', coverages: ['Guaranteed death benefit', 'Cash value'], options: ['Paid-up additions', 'Long-term care rider (select products)'], discounts: [], eligibility: ['Ages 0–80 by product'] },
  { slug: 'annuities', name: 'Annuities', line: 'LIFE', tagline: 'Fixed and indexed annuities for retirement income.', coverages: ['Tax-deferred growth', 'Lifetime income options'], options: ['Single or flexible premium'], discounts: [], eligibility: ['Ages 0–85 by product', 'Suitability review required'] },
  { slug: 'medicare-supplement', name: 'Medicare Supplement', line: 'LIFE', tagline: 'Medigap plans that help cover Original Medicare costs.', coverages: ['Plans A, F, G, N (state availability varies)'], options: ['Household discount'], discounts: ['Household'], eligibility: ['Enrolled in Medicare Parts A & B'] },
];

export type ResourceSection = { heading: string; body?: string; bullets?: string[]; links?: PortalLink[] };
export type ResourceWidget = 'home-cost' | 'building-valuation' | 'certificates' | 'esignature' | 'leads' | 'forms' | 'eriebooks' | 'lms' | 'marketing' | 'af60' | 'none';
export type ResourcePageContent = { slug: string; title: string; category: string; summary: string; sections: ResourceSection[]; widget?: ResourceWidget };

export const resourcePages: ResourcePageContent[] = [
  { slug: 'dspro', title: 'DSpro Web Resources', category: 'Quotes & Apps', summary: 'Reference material for the DSpro personal lines quoting and issuance platform.', sections: [{ heading: 'Getting started', bullets: ['Start every new business quote from the Quotes & Apps card or the Create a New Quote screen.', 'Prefill pulls public records (vehicles, drivers, property characteristics) once name, address and date of birth are entered.', 'Underwriting questions drive eligibility; “Yes” answers may refer the quote to your underwriter.', 'Bind and issue once the application is signed and the initial payment method is captured.'] }, { heading: 'Quick links', links: [{ label: 'Start a new quote', to: '/quotes/search-results' }, { label: 'All quotes & applications', to: '/quotes' }, { label: 'Manage templates', to: '/quotes/templates' }, { label: 'Rules Manual', to: '/resources/rules-manual' }] }] },
  { slug: 'flood', title: 'American Bankers for Flood Insurance', category: 'Personal Lines', summary: 'Flood coverage is written through the National Flood Insurance Program via American Bankers Insurance Company of Florida.', sections: [{ heading: 'How it works', bullets: ['Standard homeowners policies, including ErieSecure Home, exclude flood.', 'NFIP policies generally have a 30-day waiting period unless tied to a loan closing or map change.', 'Building coverage up to $250,000 and contents up to $100,000 for residential risks.'] }, { heading: 'Next steps', links: [{ label: 'Look up the customer to attach flood', to: '/customers' }, { label: 'Forms on Demand — flood applications', to: '/resources/forms-on-demand?q=flood' }] }] },
  { slug: 'esignature', title: 'eSignature Dashboard', category: 'Agency Tools', summary: 'Track applications and forms sent to customers for electronic signature.', sections: [], widget: 'esignature' },
  { slug: 'esignature-help', title: 'eSignature Resource Page', category: 'Agency Tools', summary: 'How electronic signatures work for applications, selection/rejection forms and AutoPay authorizations.', sections: [{ heading: 'Best practices', bullets: ['Confirm the customer’s email address before sending.', 'Envelopes expire after 30 days; resend from the dashboard if needed.', 'Signed documents are attached to the policy file automatically.', 'Some state-mandated forms still require wet signatures — see Forms on Demand.'] }, { heading: 'Go to', links: [{ label: 'eSignature Dashboard', to: '/resources/esignature' }] }] },
  { slug: 'online-leads', title: 'Online Leads Dashboard', category: 'Agency Tools', summary: 'Consumer leads routed to your agency from erieinsurance.com and online quote handoffs.', sections: [], widget: 'leads' },
  { slug: 'online-leads-help', title: 'Online Leads Help Center & FAQs', category: 'Agency Tools', summary: 'Answers about lead routing, response expectations and conversion.', sections: [{ heading: 'FAQs', bullets: ['How are leads assigned? — By ZIP code proximity, agency appointment and capacity settings.', 'How fast should I respond? — Contacting a lead within 5 minutes significantly increases conversion.', 'Can I return a lead? — Duplicate or out-of-area leads can be marked Lost with a reason.', 'Where do quotes go? — Start a quote from the lead and it will appear in your quote list.'] }, { heading: 'Go to', links: [{ label: 'Online Leads Dashboard', to: '/resources/online-leads' }] }] },
  { slug: 'underwriting-guidelines', title: 'Underwriting Guidelines', category: 'Quick Product Help', summary: 'Eligibility and referral rules by product. Choose a product to see its guidelines.', sections: productGuides.slice(0, 6).map((p) => ({ heading: p.name, bullets: p.eligibility })) },
  { slug: 'rules-manual', title: 'Rules Manual', category: 'Quick Product Help', summary: 'Rating and policy-writing rules for personal lines products.', sections: [{ heading: 'General rules', bullets: ['Policy term is 12 months for auto and home.', 'Effective dates cannot be backdated without underwriting approval.', 'Payment plans: Annual, Quarterly, 9-Month and Monthly. Installment fees are waived on AutoPay.', 'Mid-term changes are rated pro rata.'] }, { heading: 'Auto', bullets: ['All licensed household members must be listed or excluded.', 'Vehicles must be titled to the named insured or spouse.', 'ERIE Rate Lock applies; premium changes only on drivers, vehicles or address changes.'] }, { heading: 'Home', bullets: ['Dwelling limit must equal 100% of replacement cost from the Home Cost Estimator.', 'Deductible options: $500, $1,000, $2,500, $5,000; wind/hail deductibles by territory.'] }, { heading: 'Tools', links: [{ label: 'Home Cost Estimator', to: '/resources/home-cost-estimator' }] }] },
  { slug: 'named-insured-domestic', title: 'Named Insured Status — Domestic Partners', category: 'Quick Product Help', summary: 'How to list domestic partners on personal lines policies.', sections: [{ heading: 'Guideline', bullets: ['A domestic partner residing in the same household may be added as a named insured.', 'Both parties must sign the application.', 'Treated the same as a spouse for rating and coverage purposes.'] }] },
  { slug: 'eriebooks', title: 'ERIEbooks', category: 'Forms & Manuals', summary: 'Digital library of manuals, coverage guides and procedures.', sections: [], widget: 'eriebooks' },
  { slug: 'forms-on-demand', title: 'Forms on Demand', category: 'Forms & Manuals', summary: 'Search, preview and print applications, selection forms and customer forms.', sections: [], widget: 'forms' },
  { slug: 'building-valuation', title: 'Commercial Building Valuation', category: 'Calculators', summary: 'Estimate building replacement cost for commercial property.', sections: [], widget: 'building-valuation' },
  { slug: 'home-cost-estimator', title: 'Home Cost Estimator', category: 'Calculators', summary: 'Estimate the dwelling replacement cost used to set Coverage A on ErieSecure Home.', sections: [], widget: 'home-cost' },
  { slug: 'lms', title: 'Learning Management System', category: 'Education', summary: 'Enroll in product, sales and compliance courses and track continuing education.', sections: [], widget: 'lms' },
  { slug: 'lms-guide', title: 'Learning Management System Guide', category: 'Education', summary: 'How to find, launch and complete courses.', sections: [{ heading: 'Steps', bullets: ['Browse the catalog by track.', 'Click Enroll, then Launch to start a course.', 'Completed courses issue a certificate and update CE credit totals.'] }, { heading: 'Go to', links: [{ label: 'Open the LMS', to: '/resources/lms' }] }] },
  { slug: 'certificates', title: 'Certificates of Insurance', category: 'Agency Tools', summary: 'Generate a certificate of insurance for an active policy.', sections: [], widget: 'certificates' },
  { slug: 'af-60', title: 'Account Billing Request Form (AF-60)', category: 'Billing', summary: 'Request account billing changes such as combining policies, changing due dates or payment plans.', sections: [], widget: 'af60' },
  { slug: 'payment-center-resources', title: 'Payment Center Resources', category: 'Billing', summary: 'Help for taking payments on behalf of customers.', sections: [{ heading: 'Accepted methods', bullets: ['Checking or savings (EFT)', 'Debit or credit card — Visa, Mastercard, Discover, American Express', 'ERIExpressPay® for business policies'] }, { heading: 'Payment plans', bullets: ['Annual, Quarterly, 9-Month and Monthly', 'AutoPay waives all installment fees', 'Customer billing line: (800) 458-0811'] }, { heading: 'Go to', links: [{ label: 'Payment Center', to: '/billing' }, { label: 'One-time payment', to: '/billing/pay' }] }] },
  { slug: 'eriepay', title: 'ERIEpay Resources', category: 'Billing', summary: 'ERIEpay lets claims payments reach customers faster through direct deposit.', sections: [{ heading: 'Highlights', bullets: ['Customers enroll through their online account or the ERIE app.', 'Payments are deposited directly once the claim payment is approved.', 'Mortgagee/lienholder payments still issue by check where required.'] }] },
  { slug: 'commercial-billing', title: 'Billing Resources (Commercial lines)', category: 'Billing', summary: 'Commercial billing options including audit billing and pay-as-you-go workers’ compensation.', sections: [{ heading: 'Options', bullets: ['Account billing for multiple commercial policies', 'Premium audit adjustments billed at end of term', 'ERIExpressPay® automatic payments'] }] },
  { slug: 'direct-repair-program', title: 'Direct Repair Program', category: 'Claims', summary: 'A network of qualified repair shops that estimate, share with ERIE and repair — speeding up the process.', sections: [{ heading: 'How it works', bullets: ['Customer chooses a DRP shop (or any shop of their choice).', 'The shop writes the estimate and shares it with ERIE.', 'Repairs begin once approved; workmanship guaranteed for as long as the customer owns the vehicle.'] }, { heading: 'Go to', links: [{ label: 'Report a claim', to: '/claims/new' }, { label: 'Claims Center', to: '/claims' }] }] },
  { slug: 'catastrophe-response', title: 'Catastrophe Response', category: 'Claims', summary: 'What to do when severe weather impacts your customers.', sections: [{ heading: 'Agent checklist', bullets: ['Report claims as soon as possible — (800) 367-3743, 24/7.', 'Encourage customers to prevent further damage and keep receipts.', 'Catastrophe teams deploy to affected areas; mobile claim units may be onsite.'] }] },
  { slug: 'claims-guide', title: 'Claims Handling Guide', category: 'Claims', summary: 'The ERIE claim lifecycle from first notice to close.', sections: [{ heading: 'Lifecycle', bullets: ['1. First notice of loss — agent, phone (800) 367-3743, or online', '2. Assignment — claims representative contacts the customer', '3. Inspection & estimate — adjuster, photo estimate or DRP shop', '4. Coverage review & settlement', '5. Payment — ERIEpay direct deposit or check', '6. Closed — subrogation pursued when another party is at fault'] }] },
  { slug: 'marketing-materials', title: 'Order Marketing Materials', category: 'Marketing', summary: 'Order co-branded brochures, flyers and giveaways for your agency.', sections: [], widget: 'marketing' },
  { slug: 'social-media', title: 'Social Media Library', category: 'Marketing', summary: 'Pre-approved posts and images you can share on your agency pages.', sections: [{ heading: 'This month', bullets: ['Fall home maintenance checklist', 'Winter driving safety tips', 'Why Guaranteed Replacement Cost matters'] }] },
  { slug: 'brand-standards', title: 'Brand Standards', category: 'Marketing', summary: 'Logo usage, colors and approved language for agency advertising.', sections: [{ heading: 'Key rules', bullets: ['Use approved ERIE logos only; do not alter colors or proportions.', 'Advertising that names ERIE products must be submitted for compliance review.'] }] },
  { slug: 'co-op', title: 'Co-op Advertising', category: 'Marketing', summary: 'Reimbursement for eligible agency advertising.', sections: [{ heading: 'Eligibility', bullets: ['Pre-approval required', 'Reimbursement up to 50% of eligible cost, subject to annual cap', 'Submit invoices within 60 days'] }] },
  { slug: 'about-erie', title: 'About Erie Insurance', category: 'About ERIE', summary: 'Founded April 20, 1925 in Erie, Pennsylvania.', sections: [{ heading: 'At a glance', bullets: ['Auto, home, business and life insurance', 'Sold exclusively through independent agents', '12 states and the District of Columbia: IL, IN, KY, MD, NY, NC, OH, PA, TN, VA, WV, WI', 'More than 6 million policies in force'] }] },
  { slug: 'founders-vision', title: "Founder's Vision", category: 'About ERIE', summary: 'H.O. Hirt’s founding principles still guide ERIE today.', sections: [{ heading: 'The vision', body: 'To provide our Policyholders with as near perfect protection, as near perfect service as is humanly possible, and to do so at the lowest possible cost.' }] },
  { slug: 'task-force', title: 'What is Task Force', category: 'Agent Community', summary: 'Task Force is the agent advisory group that partners with ERIE leadership on agency priorities.', sections: [{ heading: 'Purpose', bullets: ['Represents agents in each region', 'Reviews new products, tools and processes before launch', 'Raises field feedback to leadership'] }, { heading: 'Read more', links: [{ label: 'Message from the Moderator (4/21/26)', to: '/resources/task-force-moderator' }, { label: 'Top Priorities (4/21/26)', to: '/resources/task-force-priorities' }] }] },
  { slug: 'task-force-moderator', title: 'Message from the Moderator (4/21/26)', category: 'Agent Community', summary: 'Spring update from the Task Force moderator.', sections: [{ heading: 'Message', body: 'Thank you to every agency that shared feedback on quoting speed and eSignature this quarter. Your input directly shaped the upcoming improvements to prefill and the online leads dashboard. Keep the feedback coming through your regional representative.' }] },
  { slug: 'task-force-priorities', title: 'Top Priorities (4/21/26)', category: 'Agent Community', summary: 'Current Task Force focus areas.', sections: [{ heading: 'Priorities', bullets: ['Faster personal lines quote-to-issue', 'Expanded eSignature form coverage', 'Commercial lines appetite clarity', 'Lead response tools'] }] },
];

export type NewsItem = { id: string; badge: string; title: string; date: string; body: string; detail: string[]; publication?: boolean };

export const newsItems: NewsItem[] = [
  { id: 'life-recognition-2026', badge: 'Life\nNews', title: 'Erie Family Life Recognition Program Updates', date: '5/30/2026', body: 'Erie Family Life is updating its Life Recognition Program effective 6/1 with two new top-tier levels and providing additional recognition opportunities. Beginning 9/1, new Medicare Supplement business will no longer count toward program credit.', detail: ['Two new top tiers recognize agencies with exceptional life production.', 'Credit calculations now update weekly in the Reports card.', 'Medicare Supplement business issued on or after 9/1 no longer counts toward program credit.'] },
  { id: 'customer-experience-tools', badge: 'Agent\nNews', title: 'New tools for a stronger customer experience', date: '5/22/2026', body: 'Explore the latest resources and field updates designed to help you connect customers with the right coverage, faster. Visit AgentExchange for helpful guides and support.', detail: ['eSignature now supports AutoPay authorizations.', 'The new Online Leads Dashboard shows response-time tracking.', 'Quote templates let you reuse common coverage selections.'] },
  { id: 'summer-selling', badge: 'Field\nFocus', title: 'Summer selling season resources are here', date: '5/14/2026', body: 'Find seasonal talking points, product reminders, and new training materials in the resource center. Use the quick links below to get started.', detail: ['Boat and watercraft talking points', 'Umbrella cross-sell guide', 'New LMS course: Bundling auto and home'] },
  { id: 'agent-guide-q2', badge: 'ERIE\nPublication', title: 'The Agent Guide — Q2 2026', date: '4/30/2026', body: 'Quarterly publication with product updates, underwriting reminders and agency spotlights.', detail: ['Underwriting: roof age reminders for ErieSecure Home', 'Spotlight: three agencies that doubled life production', 'Claims: catastrophe readiness'], publication: true },
  { id: 'claims-quarterly', badge: 'ERIE\nPublication', title: 'Claims Quarterly — Spring Edition', date: '3/31/2026', body: 'How ERIE claims teams responded to spring storms and what agents can share with customers.', detail: ['Storm response by the numbers', 'Direct Repair Program expansion', 'ERIEpay adoption tips'], publication: true },
];

export type FormDoc = { code: string; name: string; line: string; states: string };
export const formsLibrary: FormDoc[] = [
  { code: 'AF-60', name: 'Account Billing Request Form', line: 'Billing', states: 'All' },
  { code: 'AF-12', name: 'AutoPay Enrollment Authorization', line: 'Billing', states: 'All' },
  { code: 'PA-UM', name: 'Uninsured/Underinsured Motorists Selection/Rejection', line: 'Auto', states: 'PA' },
  { code: 'WI-UM', name: 'Uninsured/Underinsured Motorists Selection', line: 'Auto', states: 'WI' },
  { code: 'AU-101', name: 'Personal Auto Application', line: 'Auto', states: 'All' },
  { code: 'AU-220', name: 'Named Driver Exclusion', line: 'Auto', states: 'All' },
  { code: 'HO-100', name: 'ErieSecure Home Application', line: 'Home', states: 'All' },
  { code: 'HO-415', name: 'Scheduled Personal Property Appraisal', line: 'Home', states: 'All' },
  { code: 'FL-01', name: 'NFIP Flood Application (American Bankers)', line: 'Flood', states: 'All' },
  { code: 'CL-30', name: 'Certificate of Insurance Request', line: 'Commercial', states: 'All' },
  { code: 'LF-12', name: 'ERIExpress Life Application', line: 'Life', states: 'All' },
  { code: 'CN-01', name: 'Policy Cancellation Request', line: 'All', states: 'All' },
];

export const eriebooks = [
  { title: 'Personal Auto Rules Manual', updated: '2026-07-01', pages: 184 },
  { title: 'ErieSecure Home Rules Manual', updated: '2026-06-15', pages: 142 },
  { title: 'Commercial Lines Appetite Guide', updated: '2026-08-01', pages: 96 },
  { title: 'Claims Reporting Procedures', updated: '2026-03-01', pages: 38 },
  { title: 'Agency Operations Manual', updated: '2026-01-10', pages: 210 },
  { title: 'Erie Family Life Field Underwriting Guide', updated: '2026-05-20', pages: 64 },
];

export const courses = [
  { id: 'C101', title: 'AgentExchange Essentials', track: 'onboarding', hours: 2, ce: 0 },
  { id: 'C110', title: 'Quoting Personal Auto in DSpro', track: 'onboarding', hours: 1.5, ce: 0 },
  { id: 'C205', title: 'ErieSecure Home: Guaranteed Replacement Cost', track: 'personal', hours: 2, ce: 2 },
  { id: 'C210', title: 'Bundling Auto and Home', track: 'personal', hours: 1, ce: 1 },
  { id: 'C220', title: 'Umbrella Cross-Sell', track: 'personal', hours: 1, ce: 1 },
  { id: 'C310', title: 'ErieSecure Business Fundamentals', track: 'commercial', hours: 3, ce: 3 },
  { id: 'C320', title: "Workers' Compensation Classifications", track: 'commercial', hours: 2, ce: 2 },
  { id: 'C401', title: 'Ethics for Insurance Professionals', track: 'ce', hours: 3, ce: 3 },
  { id: 'C402', title: 'Flood Insurance (NFIP) Requirements', track: 'ce', hours: 3, ce: 3 },
];

export const contacts = [
  { name: 'Customer Care / Billing', title: 'Policyholder service', department: 'Customer Service', phone: '(800) 458-0811', email: 'customercare@erieinsurance.example' },
  { name: 'Claims Reporting (24/7)', title: 'First notice of loss', department: 'Claims', phone: '(800) 367-3743', email: 'claims@erieinsurance.example' },
  { name: 'Angela Moretti', title: 'Personal Lines Underwriter', department: 'Underwriting — Wisconsin', phone: '(262) 555-0611', email: 'angela.moretti@erieinsurance.example' },
  { name: 'Brian Kessler', title: 'Commercial Lines Underwriter', department: 'Underwriting — Wisconsin', phone: '(262) 555-0618', email: 'brian.kessler@erieinsurance.example' },
  { name: 'Teresa Lindqvist', title: 'Sales Manager', department: 'Sales — Wisconsin Branch', phone: '(262) 555-0640', email: 'teresa.lindqvist@erieinsurance.example' },
  { name: 'Megan Reilly', title: 'Auto Claims Representative', department: 'Claims', phone: '(800) 367-3743 x4471', email: 'megan.reilly@erieinsurance.example' },
  { name: 'Carlos Medina', title: 'Property Claims Adjuster', department: 'Claims', phone: '(800) 367-3743 x5120', email: 'carlos.medina@erieinsurance.example' },
  { name: 'Agency Support Desk', title: 'Technology help', department: 'Agency Technology', phone: '(800) 555-0199', email: 'agencysupport@erieinsurance.example' },
  { name: 'Life Field Underwriting', title: 'Erie Family Life', department: 'Life Underwriting', phone: '(800) 555-0177', email: 'lifeuw@erieinsurance.example' },
  { name: 'Marketing Services', title: 'Materials & co-op', department: 'Marketing', phone: '(800) 555-0155', email: 'marketing@erieinsurance.example' },
];

export const STATES = ['IL', 'IN', 'KY', 'MD', 'NY', 'NC', 'OH', 'PA', 'TN', 'VA', 'WV', 'WI', 'DC'];
