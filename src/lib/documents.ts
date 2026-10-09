// Document engine: builds standalone, print-ready HTML documents (ID cards, declarations,
// evidence of insurance, quote proposals, billing statements, reinstatement notices).
// Each opens in a new tab with a "Print / Save as PDF" button or downloads as a file.
import { AGENT } from '@/data/seed';
import { rateBusiness, rateCommercialAuto, rateCommercialProperty, rateContractors, rateWorkersComp } from '@/data/commercial';
import { installmentSchedule, Installment } from '@/lib/billing';
import { ErieQuoteResult, money, payPlanLabel, rateAuto, rateBoat, rateHome, rateLife, rateUmbrella, ageFrom, homeFormName } from '@/lib/rating';
import type { BillingAccount, Customer, Mortgagee, Policy, PremiumBreakdown, Quote } from '@/data/types';

// NAIC company codes for the ERIE companies (public regulatory filings).
export const COMPANIES = {
  exchange: { name: 'Erie Insurance Exchange', naic: '26271' },
  company: { name: 'Erie Insurance Company', naic: '26263' },
  pc: { name: 'Erie Insurance Property & Casualty Company', naic: '26830' },
  life: { name: 'Erie Family Life Insurance Company', naic: '' },
};
const HOME_OFFICE = '100 Erie Insurance Place, Erie, PA 16530';
const CLAIMS_PHONE = '(800) 367-3743';
const CUSTOMER_CARE = '(800) 458-0811';

export const companyFor = (p: Policy) => (p.type === 'Life' ? COMPANIES.life : COMPANIES.exchange);

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fullName = (c?: { firstName: string; middleName?: string; lastName: string }) => (c ? [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') : '');
const fmtDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9edf1; color: #1f2d3a; font: 12px/1.45 Arial, Helvetica, sans-serif; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end; padding: 10px 16px; background: #003B70; }
  .toolbar button { padding: 7px 14px; border: 0; border-radius: 2px; background: #0275D8; color: #fff; font-weight: 700; cursor: pointer; }
  .toolbar button.ghost { background: #fff; color: #003B70; }
  .sheet { width: 8.5in; min-height: 11in; margin: 16px auto; padding: 0.55in 0.6in; background: #fff; box-shadow: 0 2px 12px #0002; }
  .brand { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 3px solid #003B70; }
  .mark { width: 30px; height: 40px; background: #0275D8; color: #fff; display: grid; place-items: center; font-size: 20px; }
  .brand h1 { margin: 0; color: #003B70; font-size: 18px; }
  .brand small { display: block; color: #5b6b78; }
  .brand .doc { margin-left: auto; text-align: right; }
  .brand .doc strong { display: block; color: #003B70; font-size: 15px; }
  h2 { margin: 18px 0 6px; padding: 4px 8px; background: #eef3f8; color: #003B70; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #dfe5ea; text-align: left; vertical-align: top; }
  th { color: #5b6b78; font-size: 10.5px; text-transform: uppercase; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tr.total td { border-top: 2px solid #003B70; font-weight: 700; color: #003B70; }
  tr.credit td { color: #1f7a45; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .grid div span { display: block; color: #5b6b78; font-size: 10.5px; text-transform: uppercase; }
  .note { margin-top: 14px; color: #5b6b78; font-size: 10.5px; }
  .stamp { display: inline-block; padding: 2px 8px; border: 1px solid; border-radius: 10px; font-size: 10.5px; font-weight: 700; }
  .Paid { color: #1f7a45; } .Overdue { color: #b42323; } .Due, .Partially { color: #8a5a00; } .Upcoming { color: #5b6b78; }
  .cards { display: grid; grid-template-columns: repeat(2, 3.5in); gap: 0.25in; justify-content: center; }
  .card { width: 3.5in; height: 2.25in; padding: 0.12in 0.14in; border: 1px dashed #8193a2; font-size: 8.5px; line-height: 1.3; display: flex; flex-direction: column; }
  .card header { display: flex; align-items: center; gap: 6px; padding-bottom: 4px; border-bottom: 2px solid #003B70; }
  .card header .mark { width: 16px; height: 22px; font-size: 11px; }
  .card header strong { color: #003B70; font-size: 10px; }
  .card header em { margin-left: auto; font-style: normal; font-weight: 700; color: #003B70; }
  .card dl { display: grid; grid-template-columns: 0.95in 1fr; gap: 1px 6px; margin: 5px 0; }
  .card dt { color: #5b6b78; } .card dd { margin: 0; font-weight: 700; }
  .card footer { margin-top: auto; padding-top: 3px; border-top: 1px solid #dfe5ea; color: #33495b; }
  .back { justify-content: space-between; }
  .sig { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .sig div { border-top: 1px solid #1f2d3a; padding-top: 4px; color: #5b6b78; font-size: 10.5px; }
  @media print { body { background: #fff; } .toolbar { display: none; } .sheet { margin: 0; box-shadow: none; width: auto; min-height: 0; } .page-break { page-break-before: always; } }
`;

function shell(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${STYLES}</style></head>
<body><div class="toolbar"><button class="ghost" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>${body}</body></html>`;
}

function header(docTitle: string, sub: string, company = COMPANIES.exchange) {
  return `<div class="brand"><div class="mark">⌂</div><div><h1>${esc(company.name)}</h1><small>${HOME_OFFICE}${company.naic ? ` · NAIC ${company.naic}` : ''}</small></div><div class="doc"><strong>${esc(docTitle)}</strong><small>${esc(sub)}</small></div></div>`;
}

const agentBlock = (p?: Policy) => `<div><span>Agent</span>${esc(AGENT.agency)}<br>${esc(AGENT.address)}<br>${esc(AGENT.phone)}${p ? ` · ${esc(p.agentNumber)}` : ''}</div>`;
const insuredBlock = (c?: Customer, label = 'Named insured') => `<div><span>${label}</span>${esc(fullName(c))}<br>${esc(c?.address)}<br>${esc(c ? `${c.city}, ${c.state} ${c.zip}` : '')}</div>`;

/** Opens a document in a new tab; falls back to downloading it when pop-ups are blocked. */
export function openDocument(html: string, filename: string) {
  const win = window.open('', '_blank');
  if (!win) { downloadDocument(html, filename); return false; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

export function downloadDocument(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Auto ID cards ---------------------------------------------------------------------------

export function idCardsHtml(policy: Policy, customer?: Customer) {
  const company = companyFor(policy);
  const state = customer?.state ?? 'WI';
  const excluded = policy.drivers.filter((d) => d.excluded);
  const cards = policy.vehicles.map((v) => `
    <div class="card">
      <header><div class="mark">⌂</div><strong>${esc(company.name)}</strong><em>${esc(state)} Insurance Identification Card</em></header>
      <dl>
        <dt>NAIC number</dt><dd>${company.naic}</dd>
        <dt>Policy number</dt><dd>${esc(policy.number)}</dd>
        <dt>Effective</dt><dd>${fmtDate(policy.effective)}</dd>
        <dt>Expires</dt><dd>${fmtDate(policy.expiration)}</dd>
        <dt>Named insured</dt><dd>${esc(fullName(customer))}<br>${esc(customer?.address)}, ${esc(customer ? `${customer.city}, ${customer.state} ${customer.zip}` : '')}</dd>
        <dt>Vehicle</dt><dd>${esc(`${v.year} ${v.make} ${v.model}`)}</dd>
        <dt>VIN</dt><dd>${esc(v.vin)}</dd>
      </dl>
      <footer>Agent: ${esc(AGENT.agency)} · ${esc(AGENT.phone)}</footer>
    </div>
    <div class="card back">
      <div><strong style="color:#003B70">IMPORTANT — keep this card in the insured vehicle.</strong><p>This card is evidence that the vehicle described is insured for the liability coverage required by ${esc(state)} law, subject to all policy terms.</p>${excluded.length ? `<p><strong>Excluded driver(s):</strong> ${excluded.map((d) => esc(`${d.firstName} ${d.lastName}`)).join(', ')} — no coverage applies while they operate any vehicle.</p>` : ''}</div>
      <footer><strong>Report an accident 24/7: ${CLAIMS_PHONE}</strong><br>Customer care: ${CUSTOMER_CARE} · Emergency: call 911 first.</footer>
    </div>`).join('');
  return shell(`ID Cards ${policy.number}`, `<div class="sheet">${header('Auto Insurance Identification Cards', `${policy.number} · Cut along dashed lines`)}<p class="note">Two-sided cards — print, cut out and fold along the center line. Wisconsin accepts physical or electronic proof of insurance.</p><div class="cards">${cards}</div></div>`);
}

// ---- Declarations page ------------------------------------------------------------------------

/** Itemized premium lines for a policy, reconciled to the stored premium. */
export function policyBreakdown(policy: Policy, state: string): PremiumBreakdown | null {
  const opts = { multiPolicy: false, payPlan: policy.payPlan, autoPay: policy.autoPay, earlyQuote: false };
  if (policy.type === 'Auto' && policy.autoCoverages) return rateAuto(state, policy.drivers, policy.vehicles, policy.autoCoverages, opts);
  if (policy.type === 'Home' && policy.property && policy.homeCoverages) return rateHome(state, policy.property, policy.homeCoverages, opts);
  if (policy.type === 'Boat' && policy.boat) return rateBoat(state, policy.boat, opts);
  if (policy.type === 'Umbrella' && policy.umbrella) return rateUmbrella(state, policy.umbrella);
  if (policy.type === 'Commercial Auto' && policy.commercialAuto) return rateCommercialAuto(policy.commercialAuto, state);
  if (policy.type === 'Workers Comp' && policy.workersComp) return rateWorkersComp(policy.workersComp, state);
  if (policy.type === 'Business' && policy.business) {
    if (policy.policyForm === 'Commercial Property') return rateCommercialProperty(policy.business);
    if (policy.contractors) return rateContractors(policy.contractors, policy.business.revenue, policy.business.state, policy.business.glLimit);
    return rateBusiness(policy.business);
  }
  if (policy.type === 'Life' && policy.life) return rateLife(40, policy.life);
  return null;
}

function premiumTable(policy: Policy, state: string) {
  const b = policyBreakdown(policy, state);
  if (!b || !b.lines.length) return `<table><tbody><tr class="total"><td>Total annual premium</td><td class="num">${money(policy.premium, true)}</td></tr></tbody></table>`;
  const adjustment = Math.round((policy.premium - b.total) * 100) / 100;
  return `<table><thead><tr><th>Coverage</th><th class="num">Premium</th></tr></thead><tbody>
    ${b.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${money(l.amount)}</td></tr>`).join('')}
    ${b.discounts.map((d) => `<tr class="credit"><td>${esc(d.label)}</td><td class="num">−${money(-d.amount)}</td></tr>`).join('')}
    ${Math.abs(adjustment) >= 1 ? `<tr class="credit"><td>${adjustment < 0 ? 'Multi-policy and account credits' : 'Policy change adjustments'}</td><td class="num">${adjustment < 0 ? '−' : ''}${money(Math.abs(adjustment))}</td></tr>` : ''}
    <tr class="total"><td>Total annual premium</td><td class="num">${money(policy.premium, true)}</td></tr></tbody></table>`;
}

function schedules(policy: Policy) {
  let html = '';
  if (policy.vehicles.length) html += `<h2>Schedule of vehicles</h2><table><thead><tr><th>#</th><th>Vehicle</th><th>VIN</th><th>Use</th><th>Garaging ZIP</th></tr></thead><tbody>${policy.vehicles.map((v, i) => `<tr><td>${i + 1}</td><td>${esc(`${v.year} ${v.make} ${v.model}`)}</td><td>${esc(v.vin)}</td><td>${esc(v.use)}</td><td>${esc(v.garagingZip)}</td></tr>`).join('')}</tbody></table>`;
  if (policy.drivers.length) html += `<h2>Schedule of drivers</h2><table><thead><tr><th>Driver</th><th>Relationship</th><th>Age</th><th>License</th><th>Status</th></tr></thead><tbody>${policy.drivers.map((d) => `<tr><td>${esc(`${d.firstName} ${d.lastName}`)}</td><td>${esc(d.relationship)}</td><td>${d.dob ? ageFrom(d.dob) : ''}</td><td>${esc(`${d.licenseState} ${d.licenseNumber}`)}</td><td>${d.excluded ? '<strong>EXCLUDED (AU-220)</strong>' : 'Rated'}</td></tr>`).join('')}</tbody></table>`;
  if (policy.property) html += `<h2>Insured location</h2><table><tbody><tr><td>${esc(policy.description)}</td><td>${esc(policy.property.dwellingType)} · built ${policy.property.yearBuilt} · ${policy.property.squareFeet.toLocaleString()} sq ft · ${esc(policy.property.construction)} · protection class ${policy.property.protectionClass}</td></tr></tbody></table>`;
  if (policy.commercialAuto) html += `<h2>Commercial vehicles & drivers</h2><table><tbody>${policy.commercialAuto.vehicles.map((v) => `<tr><td>${esc(`${v.year} ${v.make} ${v.model}`)}</td><td>${esc(v.bodyType)} · ${esc(v.radius)} · cost new ${money(v.costNew)}</td></tr>`).join('')}${policy.commercialAuto.drivers.map((d) => `<tr><td>Driver: ${esc(d.name)}</td><td>Age ${d.age} · ${d.violations} violation(s) · ${d.accidents} accident(s)</td></tr>`).join('')}</tbody></table>`;
  const interests = policy.mortgagees ?? [];
  const lienholders = policy.vehicles.filter((v) => v.lienholder && !interests.some((m) => m.vehicleId === v.id));
  if (interests.length || lienholders.length) html += `<h2>Mortgagees, lienholders & loss payees</h2><table><thead><tr><th>Interest</th><th>Name & clause</th><th>Loan #</th><th>Address</th></tr></thead><tbody>${interests.map((m) => `<tr><td>${esc(m.role)}</td><td>${esc(m.name)}${m.clause !== 'None' ? `, ${esc(m.clause)}` : ''}</td><td>${esc(m.loanNumber)}</td><td>${esc(`${m.address}, ${m.city}, ${m.state} ${m.zip}`)}</td></tr>`).join('')}${lienholders.map((v) => `<tr><td>Lienholder</td><td>${esc(v.lienholder)}</td><td></td><td>${esc(`${v.year} ${v.make} ${v.model}`)}</td></tr>`).join('')}</tbody></table>`;
  return html;
}

const FORMS: Record<string, string[]> = {
  Auto: ['AU-100 Personal Auto Policy', 'ERIE Rate Lock® Endorsement'],
  Home: ['HO-100 ErieSecure Home Policy Form'],
  Umbrella: ['PCL-100 Personal Catastrophe Liability Policy'],
  Boat: ['WC-100 Watercraft Policy'],
  'Commercial Auto': ['CA-100 Business Auto Coverage Form'],
  'Workers Comp': ['WC 00 00 00 Workers Compensation and Employers Liability Policy'],
  Business: ['UP-100 Ultrapack Plus Coverage Form'],
};

export function decPageHtml(policy: Policy, customer?: Customer) {
  const company = companyFor(policy);
  const state = customer?.state ?? 'WI';
  const title = policy.homeCoverages?.form ? homeFormName[policy.homeCoverages.form] : policy.policyForm ?? policy.type;
  const forms = [...(FORMS[policy.type] ?? []), ...(policy.homeCoverages?.form && policy.homeCoverages.form !== 'HO-3' ? [`${policy.homeCoverages.form} Policy Form`] : []), ...(policy.autoCoverages?.autoPlus ? ['ERIE Auto Plus® Endorsement'] : []), ...(policy.drivers.some((d) => d.excluded) ? ['AU-220 Named Driver Exclusion'] : []), ...(policy.commercialAuto?.trucking ? ['MCS-90 Endorsement'] : []), ...(policy.mortgagees?.length ? ['Mortgagee / Loss Payable Clause'] : [])];
  const endorsements = policy.endorsements ?? [];
  const body = `<div class="sheet">${header('Policy Declarations', `${title} · ${policy.number}`, company)}
    <div class="grid" style="margin-top:12px">${insuredBlock(customer)}${agentBlock(policy)}
      <div><span>Policy period</span>${fmtDate(policy.effective)} to ${fmtDate(policy.expiration)}<br>12:01 a.m. standard time at the insured's address</div>
      <div><span>Payment plan</span>${esc(payPlanLabel[policy.payPlan])}${policy.autoPay ? ' · EriePay AutoPay' : ''}<br>Status: ${esc(policy.status)}</div></div>
    <h2>Coverages, limits & premium</h2>${premiumTable(policy, state)}
    ${schedules(policy)}
    <h2>Forms & endorsements attached</h2><table><tbody>${forms.map((f) => `<tr><td>${esc(f)}</td></tr>`).join('')}</tbody></table>
    ${endorsements.length ? `<h2>Policy changes this term</h2><table><thead><tr><th>Effective</th><th>Change</th><th class="num">Pro-rata premium</th></tr></thead><tbody>${endorsements.map((e) => `<tr><td>${fmtDate(e.effective)}</td><td>${esc(e.description)}</td><td class="num">${e.proRata >= 0 ? '+' : '−'}${money(Math.abs(e.proRata), true)}</td></tr>`).join('')}</tbody></table>` : ''}
    <p class="note">This declarations page with the policy forms and endorsements completes the policy. Report claims 24/7 at ${CLAIMS_PHONE}. Demo document generated by AgentExchange — sample data, not an actual ERIE policy.</p></div>`;
  return shell(`Declarations ${policy.number}`, body);
}

// ---- Evidence of insurance (mortgagee / loss payee) ---------------------------------------------

export function evidenceOfInsuranceHtml(policy: Policy, customer: Customer | undefined, m: Mortgagee) {
  const company = companyFor(policy);
  const h = policy.homeCoverages;
  const vehicle = m.vehicleId ? policy.vehicles.find((v) => v.id === m.vehicleId) : undefined;
  const isProperty = !!h || policy.type === 'Business';
  const coverageRows = h
    ? `<tr><td>Dwelling (Coverage A)</td><td>${h.form === 'HO-4' ? 'Not applicable (renters)' : money(h.dwelling)}${h.form === 'HO-3' || !h.form ? ' · Guaranteed Replacement Cost' : ''}</td></tr><tr><td>Deductible</td><td>${money(h.deductible)} all perils</td></tr><tr><td>Form / causes of loss</td><td>${esc(h.form ?? 'HO-3')} · special form (open perils) on the dwelling</td></tr>`
    : policy.business ? `<tr><td>Building</td><td>${money(policy.business.buildingLimit)}</td></tr><tr><td>Deductible</td><td>${money(policy.business.propertyDeductible)}</td></tr>`
    : vehicle ? `<tr><td>Vehicle</td><td>${esc(`${vehicle.year} ${vehicle.make} ${vehicle.model}`)} · VIN ${esc(vehicle.vin)}</td></tr><tr><td>Comprehensive / collision deductibles</td><td>${money(policy.autoCoverages?.comprehensiveDeductible ?? 0)} / ${money(policy.autoCoverages?.collisionDeductible ?? 0)}</td></tr>` : '';
  const body = `<div class="sheet">${header(isProperty ? 'Evidence of Property Insurance' : 'Evidence of Auto Physical Damage Insurance', `Issued ${fmtDate(new Date().toISOString().slice(0, 10))}`, company)}
    <p class="note">This evidence of insurance is issued as a matter of information only and confers no rights upon the additional interest named below. It does not amend, extend or alter the coverage afforded by the policy.</p>
    <div class="grid" style="margin-top:8px">${agentBlock(policy)}<div><span>Company</span>${esc(company.name)}<br>NAIC ${company.naic}<br>Policy ${esc(policy.number)}</div>
      ${insuredBlock(customer)}<div><span>Policy period</span>${fmtDate(policy.effective)} to ${fmtDate(policy.expiration)}<br>Continued until terminated if checked: ☑</div></div>
    <h2>Property / interest</h2><table><tbody><tr><td>Location / description</td><td>${esc(policy.description)}</td></tr>${coverageRows}</tbody></table>
    <h2>Additional interest</h2><table><tbody><tr><td>Interest</td><td>${esc(m.role)}</td></tr><tr><td>Name & clause</td><td><strong>${esc(m.name)}${m.clause !== 'None' ? `, ${esc(m.clause)}` : ''}</strong></td></tr><tr><td>Loan number</td><td>${esc(m.loanNumber)}</td></tr><tr><td>Mailing address</td><td>${esc(`${m.address}, ${m.city}, ${m.state} ${m.zip}`)}</td></tr></tbody></table>
    <p class="note">${m.clause.includes('ISAOA') ? 'ISAOA — "its successors and/or assigns": coverage follows the loan if it is sold or transferred. ' : ''}${m.clause.includes('ATIMA') ? 'ATIMA — "as their interests may appear": the interest is protected to the extent of its financial stake. ' : ''}The additional interest will be notified of cancellation as required by law (10 days for non-payment).</p>
    <div class="sig"><div>Authorized representative — ${esc(AGENT.name)}</div><div>Date</div></div></div>`;
  return shell(`Evidence of Insurance ${policy.number}`, body);
}

// ---- Quote proposal ---------------------------------------------------------------------------

export function quoteProposalHtml(quote: Quote, rated: ErieQuoteResult, schedules: { plan: string; count: number; perPayment: number; total: number }[]) {
  const a = quote.applicant;
  const savings = -rated.bundleCredits.reduce((t, c) => t + c.amount, 0);
  const body = `<div class="sheet">${header('Insurance Proposal', `Quote ${quote.id} · valid 30 days`)}
    <div class="grid" style="margin-top:12px"><div><span>Prepared for</span>${esc(fullName(a))}<br>${esc(a.address)}<br>${esc(`${a.city}, ${a.state} ${a.zip}`)}</div>${agentBlock()}
      <div><span>Proposed effective date</span>${fmtDate(quote.effectiveDate)}</div><div><span>Prepared</span>${fmtDate(new Date().toISOString().slice(0, 10))} by ${esc(AGENT.name)}</div></div>
    ${rated.lines.map((l) => `<h2>${esc(l.breakdown.name ?? l.breakdown.product)}</h2><table><tbody>${l.breakdown.lines.map((x) => `<tr><td>${esc(x.label)}</td><td class="num">${money(x.amount)}</td></tr>`).join('')}${l.breakdown.discounts.map((d) => `<tr class="credit"><td>${esc(d.label)}</td><td class="num">−${money(-d.amount)}</td></tr>`).join('')}<tr class="total"><td>Annual premium</td><td class="num">${money(l.breakdown.total)}</td></tr></tbody></table>`).join('')}
    <h2>Multi-policy bundle</h2><table><tbody>${rated.bundleCredits.length ? rated.bundleCredits.map((c) => `<tr class="credit"><td>${esc(c.label)}</td><td class="num">−${money(-c.amount)}</td></tr>`).join('') : '<tr><td>No bundle credits on this proposal.</td><td></td></tr>'}<tr class="total"><td>Total multi-policy savings</td><td class="num">${money(savings)}</td></tr></tbody></table>
    <h2>Account total & payment options</h2><table><tbody><tr><td>Premium, all lines</td><td class="num">${money(rated.premium)}</td></tr>${rated.taxes.map((t) => `<tr><td>${esc(t.label)}</td><td class="num">${money(t.amount)}</td></tr>`).join('')}<tr class="total"><td>Total annual cost</td><td class="num">${money(rated.total)}</td></tr></tbody></table>
    <table style="margin-top:8px"><thead><tr><th>Plan</th><th class="num">Payments</th><th class="num">Each</th><th class="num">Total</th></tr></thead><tbody>${schedules.map((s) => `<tr><td>${esc(s.plan)}</td><td class="num">${s.count}</td><td class="num">${money(s.perPayment, true)}</td><td class="num">${money(s.total, true)}</td></tr>`).join('')}</tbody></table>
    <p class="note">Proposal based on information provided and subject to underwriting review, verification and the policy forms. Illustrative demo rates — not an offer of insurance.</p></div>`;
  return shell(`Proposal ${quote.id}`, body);
}

// ---- Billing statement & reinstatement notice -----------------------------------------------

export function billingStatementHtml(policy: Policy, customer: Customer | undefined, account: BillingAccount, rows: Installment[] = installmentSchedule(policy, account)) {
  const body = `<div class="sheet">${header('Billing Statement', `${policy.number} · ${fmtDate(new Date().toISOString().slice(0, 10))}`, companyFor(policy))}
    <div class="grid" style="margin-top:12px">${insuredBlock(customer, 'Bill to')}<div><span>Account summary</span>Payment plan: ${esc(payPlanLabel[policy.payPlan])}${policy.autoPay ? ' (EriePay AutoPay)' : ''}<br>Minimum due: <strong>${money(account.minimumDue, true)}</strong> by ${fmtDate(account.nextDueDate)}<br>Remaining term balance: ${money(account.balance, true)}</div></div>
    <h2>Installment schedule</h2><table><thead><tr><th>#</th><th>Due date</th><th class="num">Amount</th><th class="num">Paid</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.n}</td><td>${fmtDate(r.due)}</td><td class="num">${money(r.amount, true)}</td><td class="num">${money(r.paid, true)}</td><td><span class="stamp ${r.status.split(' ')[0]}">${r.status}</span></td></tr>`).join('')}</tbody></table>
    <h2>Payment history</h2><table><thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Confirmation</th><th class="num">Amount</th></tr></thead><tbody>${account.payments.length ? account.payments.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.kind ?? 'Installment')}</td><td>${esc(p.method)}</td><td>${esc(p.confirmation)}</td><td class="num">${money(p.amount, true)}</td></tr>`).join('') : '<tr><td colspan="5">No payments this term.</td></tr>'}</tbody></table>
    <p class="note">Payments received after the due date are subject to a late fee. Pay online, through your agent, or call ${CUSTOMER_CARE}.</p></div>`;
  return shell(`Statement ${policy.number}`, body);
}

export function reinstatementNoticeHtml(policy: Policy, customer: Customer | undefined, details: { paid: number; noLapse: boolean; signedBy: string; date: string; confirmation: string; cancelDate?: string }) {
  const body = `<div class="sheet">${header('Notice of Reinstatement', `${policy.number} · ${fmtDate(details.date)}`, companyFor(policy))}
    <div class="grid" style="margin-top:12px">${insuredBlock(customer)}${agentBlock(policy)}</div>
    <h2>Reinstatement</h2><table><tbody>
      <tr><td>Policy</td><td>${esc(policy.number)} · ${esc(policy.description)}</td></tr>
      ${details.cancelDate ? `<tr><td>Cancelled for non-payment</td><td>${fmtDate(details.cancelDate)}</td></tr>` : ''}
      <tr><td>Reinstated effective</td><td>${fmtDate(details.noLapse ? details.cancelDate ?? details.date : details.date)}</td></tr>
      <tr><td>Coverage continuity</td><td><strong>${details.noLapse ? 'Reinstated with no lapse in coverage' : `Reinstated with a lapse — no coverage from ${fmtDate(details.cancelDate ?? '')} to ${fmtDate(details.date)}`}</strong></td></tr>
      <tr><td>Amount received</td><td>${money(details.paid, true)} · confirmation ${esc(details.confirmation)}</td></tr>
      <tr><td>Statement of no known loss</td><td>Signed by ${esc(details.signedBy)} on ${fmtDate(details.date)}</td></tr></tbody></table>
    <p class="note">The insured stated that no accidents, losses or claims occurred between the cancellation date and the date of this request. A false statement of no loss voids this reinstatement.</p></div>`;
  return shell(`Reinstatement ${policy.number}`, body);
}
