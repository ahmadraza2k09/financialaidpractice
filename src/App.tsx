import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "home" | "dashboard" | "practice" | "documents" | "review";

type ModuleStatus = "not-started" | "in-progress" | "complete";

interface FormData {
  [key: string]: string | boolean | string[];
}

interface ModuleState {
  id: string;
  status: ModuleStatus;
  data: FormData;
  completedAt?: string;
}

interface DocumentItem {
  id: string;
  label: string;
  category: string;
  status: "ready" | "need-to-get" | "not-applicable" | "unchecked";
}

interface AppState {
  modules: Record<string, ModuleState>;
  documents: DocumentItem[];
  activeModule: string | null;
  isSample: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: "family", label: "Family & Parents", description: "Parents/guardians details, marital status, family structure" },
  { id: "income", label: "Income", description: "Employment, salaries, business income, other income sources" },
  { id: "bank", label: "Bank Information", description: "Bank accounts, account types, average balances" },
  { id: "assets", label: "Assets & Property", description: "Owned property, vehicles, investments, valuables" },
  { id: "housing", label: "Housing", description: "Current accommodation, rent or ownership, housing expenses" },
  { id: "taxes", label: "Taxes", description: "Tax filing status, annual tax paid, tax returns" },
  { id: "expenses", label: "Expenses", description: "Monthly household expenses, utilities, food, transport" },
  { id: "loans", label: "Loans & Debts", description: "Outstanding loans, monthly repayments, liabilities" },
  { id: "dependents", label: "Dependents", description: "Family members supported, siblings, dependents" },
  { id: "education", label: "Education Expenses", description: "Current school fees, tuition, stationery, uniforms" },
  { id: "travel", label: "Travel & Other", description: "Travel costs, other allowances, miscellaneous expenses" },
  { id: "review", label: "Final Review", description: "Summary and review of all entered information" },
];

const DOCUMENT_ITEMS: DocumentItem[] = [
  // Identification
  { id: "d1", label: "Applicant CNIC / ID document", category: "Identification", status: "unchecked" },
  { id: "d2", label: "Parent / Guardian CNIC or ID", category: "Identification", status: "unchecked" },
  { id: "d3", label: "Birth certificate (if required)", category: "Identification", status: "unchecked" },
  // Income
  { id: "d4", label: "Most recent payslip (father / guardian)", category: "Salary & Employment", status: "unchecked" },
  { id: "d5", label: "Most recent payslip (mother / guardian)", category: "Salary & Employment", status: "unchecked" },
  { id: "d6", label: "Employer letter confirming salary", category: "Salary & Employment", status: "unchecked" },
  { id: "d7", label: "Business registration / license (if self-employed)", category: "Business Income", status: "unchecked" },
  { id: "d8", label: "Business financial statements", category: "Business Income", status: "unchecked" },
  // Bank
  { id: "d9", label: "Bank statements — last 3 months (father)", category: "Bank Statements", status: "unchecked" },
  { id: "d10", label: "Bank statements — last 3 months (mother)", category: "Bank Statements", status: "unchecked" },
  { id: "d11", label: "Savings / investment account statements", category: "Bank Statements", status: "unchecked" },
  // Property
  { id: "d12", label: "Property ownership documents / title deed", category: "Property & Assets", status: "unchecked" },
  { id: "d13", label: "Property valuation or purchase price evidence", category: "Property & Assets", status: "unchecked" },
  { id: "d14", label: "Vehicle registration documents", category: "Property & Assets", status: "unchecked" },
  // Tax
  { id: "d15", label: "Most recent tax return (NTN certificate)", category: "Tax Records", status: "unchecked" },
  { id: "d16", label: "Tax payment receipt", category: "Tax Records", status: "unchecked" },
  // Housing
  { id: "d17", label: "Rental agreement / lease contract", category: "Housing", status: "unchecked" },
  { id: "d18", label: "Most recent utility bill (electricity/gas)", category: "Housing", status: "unchecked" },
  // Education
  { id: "d19", label: "Current school fee challan / invoice", category: "Education", status: "unchecked" },
  { id: "d20", label: "Sibling school fee challans", category: "Education", status: "unchecked" },
  // Loans
  { id: "d21", label: "Loan agreement / bank letter for outstanding loans", category: "Loans & Debts", status: "unchecked" },
  { id: "d22", label: "Monthly repayment schedule", category: "Loans & Debts", status: "unchecked" },
  // Other
  { id: "d23", label: "Any previous financial aid award letters", category: "Other Supporting Documents", status: "unchecked" },
  { id: "d24", label: "Death certificate (if a parent is deceased)", category: "Other Supporting Documents", status: "unchecked" },
  { id: "d25", label: "Divorce / separation papers (if applicable)", category: "Other Supporting Documents", status: "unchecked" },
];

// ─── Practice form questions per module ──────────────────────────────────────

const MODULE_STEPS: Record<string, { title: string; note: string; fields: { id: string; label: string; type: "text" | "select" | "radio" | "number" | "textarea"; options?: string[]; placeholder?: string; required?: boolean }[] }[]> = {
  family: [
    {
      title: "About You",
      note: "Tell us a bit about yourself as the applicant.",
      fields: [
        { id: "applicant_name", label: "Your full name", type: "text", placeholder: "e.g. Aisha Khan", required: true },
        { id: "applicant_dob", label: "Date of birth", type: "text", placeholder: "DD/MM/YYYY" },
        { id: "applicant_id", label: "CNIC / ID number (practice only — do not use your real ID)", type: "text", placeholder: "e.g. XXXXX-XXXXXXX-X" },
        { id: "applicant_email", label: "Email address (optional)", type: "text", placeholder: "your@email.com" },
        { id: "applicant_phone", label: "Mobile number", type: "text", placeholder: "e.g. 0300 0000000" },
      ],
    },
    {
      title: "Father / Male Guardian",
      note: "Provide details for your father or primary male guardian.",
      fields: [
        { id: "father_name", label: "Full name", type: "text", placeholder: "e.g. Muhammad Khan" },
        { id: "father_status", label: "Status", type: "select", options: ["Living", "Deceased", "Unknown / Absent"] },
        { id: "father_occupation", label: "Occupation", type: "text", placeholder: "e.g. Teacher, Accountant, Business owner" },
        { id: "father_employer", label: "Employer / Company name", type: "text", placeholder: "e.g. Government School, Private Company" },
        { id: "father_cnic", label: "CNIC (practice only)", type: "text", placeholder: "XXXXX-XXXXXXX-X" },
      ],
    },
    {
      title: "Mother / Female Guardian",
      note: "Provide details for your mother or primary female guardian.",
      fields: [
        { id: "mother_name", label: "Full name", type: "text", placeholder: "e.g. Fatima Khan" },
        { id: "mother_status", label: "Status", type: "select", options: ["Living", "Deceased", "Unknown / Absent"] },
        { id: "mother_occupation", label: "Occupation", type: "text", placeholder: "e.g. Homemaker, Teacher, Nurse" },
        { id: "mother_employer", label: "Employer / Company name (if employed)", type: "text", placeholder: "Leave blank if not employed" },
        { id: "mother_cnic", label: "CNIC (practice only)", type: "text", placeholder: "XXXXX-XXXXXXX-X" },
      ],
    },
    {
      title: "Family Structure",
      note: "Tell us about your household and marital status.",
      fields: [
        { id: "marital_status", label: "Parents' marital status", type: "select", options: ["Married", "Separated", "Divorced", "Widowed (father)", "Widowed (mother)", "Other"] },
        { id: "num_siblings", label: "Number of siblings (brothers and sisters)", type: "number", placeholder: "e.g. 3" },
        { id: "dependents_count", label: "Total number of dependents in household", type: "number", placeholder: "Include yourself" },
        { id: "family_notes", label: "Any additional context about your family situation", type: "textarea", placeholder: "Optional — e.g. extended family living together, special circumstances" },
      ],
    },
  ],
  income: [
    {
      title: "Father's / Guardian's Income",
      note: "Enter monthly income amounts. If unsure, provide your best estimate.",
      fields: [
        { id: "father_salary", label: "Monthly salary (net take-home)", type: "number", placeholder: "e.g. 45000" },
        { id: "father_business_income", label: "Monthly business income (if self-employed)", type: "number", placeholder: "0 if not applicable" },
        { id: "father_other_income", label: "Other monthly income (rental, freelance, etc.)", type: "number", placeholder: "0 if not applicable" },
        { id: "father_income_notes", label: "Notes about income variability", type: "textarea", placeholder: "e.g. seasonal income, irregular commissions" },
      ],
    },
    {
      title: "Mother's / Guardian's Income",
      note: "If your mother or second guardian is employed, provide their income details.",
      fields: [
        { id: "mother_salary", label: "Monthly salary (net take-home)", type: "number", placeholder: "0 if not employed" },
        { id: "mother_business_income", label: "Monthly business income (if self-employed)", type: "number", placeholder: "0 if not applicable" },
        { id: "mother_other_income", label: "Other monthly income", type: "number", placeholder: "0 if not applicable" },
      ],
    },
    {
      title: "Other Household Income",
      note: "Include any other regular income that supports the household.",
      fields: [
        { id: "rental_income", label: "Rental income from property (monthly)", type: "number", placeholder: "0 if not applicable" },
        { id: "remittances", label: "Remittances / money from abroad (monthly)", type: "number", placeholder: "0 if not applicable" },
        { id: "pension", label: "Pension or retirement income (monthly)", type: "number", placeholder: "0 if not applicable" },
        { id: "other_household_income", label: "Any other household income", type: "number", placeholder: "0 if not applicable" },
        { id: "income_currency", label: "Currency", type: "select", options: ["PKR (Pakistani Rupee)", "USD", "GBP", "EUR", "Other"] },
      ],
    },
  ],
  bank: [
    {
      title: "Bank Accounts",
      note: "List your family's bank accounts. Do not use real account numbers in practice.",
      fields: [
        { id: "bank1_name", label: "Bank name (Account 1)", type: "text", placeholder: "e.g. HBL, MCB, Meezan" },
        { id: "bank1_type", label: "Account type", type: "select", options: ["Current", "Savings", "Islamic / Murabaha", "Joint", "Other"] },
        { id: "bank1_balance", label: "Approximate average monthly balance (PKR)", type: "number", placeholder: "e.g. 50000" },
        { id: "bank1_holder", label: "Account holder", type: "select", options: ["Father / Guardian", "Mother / Guardian", "Applicant", "Joint"] },
      ],
    },
    {
      title: "Additional Accounts",
      note: "If the family has more than one account, add details here.",
      fields: [
        { id: "bank2_name", label: "Bank name (Account 2, if any)", type: "text", placeholder: "Leave blank if not applicable" },
        { id: "bank2_type", label: "Account type", type: "select", options: ["Not applicable", "Current", "Savings", "Islamic", "Joint"] },
        { id: "bank2_balance", label: "Average monthly balance (PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "has_savings_account", label: "Does the family have any savings or investment accounts?", type: "radio", options: ["Yes", "No"] },
        { id: "savings_balance", label: "Total savings / investments (approximate)", type: "number", placeholder: "0 if no savings" },
      ],
    },
  ],
  assets: [
    {
      title: "Property Ownership",
      note: "Do you or your parents own any property?",
      fields: [
        { id: "owns_property", label: "Does your family own any property?", type: "radio", options: ["Yes", "No"] },
        { id: "property_type", label: "Type of property", type: "select", options: ["Not applicable", "Residential house", "Agricultural land", "Commercial property", "Plot / land only", "Multiple properties"] },
        { id: "property_value", label: "Estimated current value (PKR)", type: "number", placeholder: "e.g. 5000000" },
        { id: "property_location", label: "City / area of property", type: "text", placeholder: "e.g. Lahore, Karachi, rural area" },
        { id: "property_mortgaged", label: "Is the property mortgaged or under a loan?", type: "radio", options: ["Yes", "No", "Partially"] },
      ],
    },
    {
      title: "Vehicles & Other Assets",
      note: "List significant assets owned by the family.",
      fields: [
        { id: "owns_vehicle", label: "Does the family own a vehicle?", type: "radio", options: ["Yes", "No"] },
        { id: "vehicle_type", label: "Vehicle type", type: "select", options: ["Not applicable", "Motorcycle only", "Car (1)", "Car (2+)", "Commercial vehicle"] },
        { id: "vehicle_value", label: "Estimated vehicle value (PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "investments", label: "Stocks, prize bonds, mutual funds (approximate value, PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "other_assets", label: "Other significant assets (jewellery, etc.)", type: "textarea", placeholder: "Optional — describe" },
      ],
    },
  ],
  housing: [
    {
      title: "Current Housing",
      note: "Describe your current living situation.",
      fields: [
        { id: "housing_type", label: "Housing type", type: "select", options: ["Owned (fully paid)", "Owned (mortgaged)", "Rented", "Company / employer provided", "Family home (no rent)", "Other"] },
        { id: "monthly_rent", label: "Monthly rent (PKR, if renting)", type: "number", placeholder: "0 if not renting" },
        { id: "household_size", label: "Number of people living in the home", type: "number", placeholder: "e.g. 6" },
        { id: "housing_city", label: "City", type: "text", placeholder: "e.g. Karachi" },
        { id: "housing_province", label: "Province", type: "select", options: ["Punjab", "Sindh", "KPK", "Balochistan", "Islamabad (Federal)", "AJK", "Gilgit-Baltistan", "Other"] },
      ],
    },
  ],
  taxes: [
    {
      title: "Tax Filing",
      note: "Provide information about your family's tax situation.",
      fields: [
        { id: "is_filer", label: "Is the primary earner a registered tax filer?", type: "radio", options: ["Yes", "No", "Not sure"] },
        { id: "ntn_number", label: "NTN number (practice — do not use real NTN)", type: "text", placeholder: "e.g. XXXXXXX" },
        { id: "annual_tax_paid", label: "Annual income tax paid (PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "tax_year", label: "Most recent tax year filed", type: "text", placeholder: "e.g. 2024" },
        { id: "has_tax_return", label: "Do you have a copy of the most recent tax return?", type: "radio", options: ["Yes", "No", "Will need to get"] },
      ],
    },
  ],
  expenses: [
    {
      title: "Monthly Household Expenses",
      note: "Estimate your family's regular monthly expenses.",
      fields: [
        { id: "exp_food", label: "Food and groceries (PKR/month)", type: "number", placeholder: "e.g. 15000" },
        { id: "exp_utilities", label: "Utilities — electricity, gas, water (PKR/month)", type: "number", placeholder: "e.g. 8000" },
        { id: "exp_transport", label: "Transport and fuel (PKR/month)", type: "number", placeholder: "e.g. 5000" },
        { id: "exp_medical", label: "Medical and health (PKR/month)", type: "number", placeholder: "e.g. 3000" },
        { id: "exp_phone", label: "Phone and internet (PKR/month)", type: "number", placeholder: "e.g. 2000" },
        { id: "exp_household", label: "Household maintenance and repairs (PKR/month)", type: "number", placeholder: "e.g. 1000" },
        { id: "exp_other", label: "Other regular expenses (PKR/month)", type: "number", placeholder: "e.g. 2000" },
      ],
    },
  ],
  loans: [
    {
      title: "Loans & Outstanding Debts",
      note: "Include any loans the family is currently repaying.",
      fields: [
        { id: "has_loans", label: "Does the family have any outstanding loans?", type: "radio", options: ["Yes", "No"] },
        { id: "loan1_type", label: "Loan type (1)", type: "select", options: ["Not applicable", "Home / mortgage", "Car loan", "Personal loan", "Business loan", "Education loan", "Informal / family loan"] },
        { id: "loan1_monthly", label: "Monthly repayment — Loan 1 (PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "loan1_remaining", label: "Remaining balance — Loan 1 (PKR)", type: "number", placeholder: "0 if not applicable" },
        { id: "loan2_type", label: "Loan type (2), if any", type: "select", options: ["Not applicable", "Home / mortgage", "Car loan", "Personal loan", "Business loan", "Education loan", "Informal / family loan"] },
        { id: "loan2_monthly", label: "Monthly repayment — Loan 2 (PKR)", type: "number", placeholder: "0 if not applicable" },
      ],
    },
  ],
  dependents: [
    {
      title: "Dependents",
      note: "List family members who depend on the household income.",
      fields: [
        { id: "dep_siblings_school", label: "Number of siblings currently in school", type: "number", placeholder: "e.g. 2" },
        { id: "dep_siblings_university", label: "Number of siblings in university", type: "number", placeholder: "e.g. 1" },
        { id: "dep_elderly", label: "Number of elderly or disabled dependents", type: "number", placeholder: "e.g. 1" },
        { id: "dep_other", label: "Other dependents (describe)", type: "textarea", placeholder: "e.g. uncle, aunt, extended family members" },
        { id: "dep_notes", label: "Any special circumstances affecting dependents?", type: "textarea", placeholder: "e.g. family member with disability, chronic illness" },
      ],
    },
  ],
  education: [
    {
      title: "Your Education Expenses",
      note: "Provide details about your current education costs.",
      fields: [
        { id: "current_school", label: "Current school / institution name", type: "text", placeholder: "e.g. Government High School, Private College" },
        { id: "school_type", label: "School type", type: "select", options: ["Government", "Private", "Semi-government", "Madrassa", "International", "Other"] },
        { id: "annual_fee", label: "Annual tuition / fee (PKR)", type: "number", placeholder: "e.g. 120000" },
        { id: "monthly_fee", label: "Monthly fee / challan (PKR)", type: "number", placeholder: "e.g. 10000" },
        { id: "stationery_annual", label: "Annual stationery and books cost (PKR)", type: "number", placeholder: "e.g. 8000" },
        { id: "uniform_annual", label: "Annual uniform and sports kit cost (PKR)", type: "number", placeholder: "e.g. 5000" },
        { id: "hostel_annual", label: "Hostel / boarding fee per year (PKR, if applicable)", type: "number", placeholder: "0 if not applicable" },
      ],
    },
    {
      title: "Sibling Education Expenses",
      note: "If siblings are in school or university, include their costs.",
      fields: [
        { id: "sib_edu_total_annual", label: "Total annual education expenses for all siblings (PKR)", type: "number", placeholder: "0 if no siblings in education" },
        { id: "sib_edu_notes", label: "Notes about sibling education", type: "textarea", placeholder: "Optional — e.g. one sibling at university, two at primary school" },
      ],
    },
  ],
  travel: [
    {
      title: "Travel & Miscellaneous",
      note: "Include any travel or other regular allowances.",
      fields: [
        { id: "daily_travel_cost", label: "Daily travel cost to school (PKR)", type: "number", placeholder: "e.g. 100" },
        { id: "monthly_travel_cost", label: "Monthly travel cost (PKR)", type: "number", placeholder: "e.g. 2200" },
        { id: "travel_mode", label: "Primary mode of travel to school", type: "select", options: ["Walking", "School bus", "Public transport", "Private car", "Motorcycle / rickshaw", "Other"] },
        { id: "pocket_money_monthly", label: "Monthly pocket money / personal allowance (PKR)", type: "number", placeholder: "e.g. 1000" },
        { id: "other_allowances", label: "Other regular allowances or costs (PKR/month)", type: "number", placeholder: "0 if not applicable" },
        { id: "misc_notes", label: "Any other financial information you think is relevant", type: "textarea", placeholder: "Optional — add any relevant notes" },
      ],
    },
  ],
  review: [
    {
      title: "Review Complete",
      note: "You have reached the final review module. Go to the Review page to see your full summary.",
      fields: [],
    },
  ],
};

// Sample data
const SAMPLE_DATA: Record<string, FormData> = {
  family: {
    applicant_name: "Sara Ahmed", applicant_dob: "15/03/2007", father_name: "Tariq Ahmed",
    father_status: "Living", father_occupation: "School Teacher", father_employer: "Government Boys School",
    mother_name: "Nadia Ahmed", mother_status: "Living", mother_occupation: "Homemaker",
    marital_status: "Married", num_siblings: "3", dependents_count: "6",
  },
  income: {
    father_salary: "38000", father_business_income: "0", mother_salary: "0",
    rental_income: "0", remittances: "0", pension: "0", income_currency: "PKR (Pakistani Rupee)",
  },
  bank: {
    bank1_name: "HBL", bank1_type: "Savings", bank1_balance: "22000", bank1_holder: "Father / Guardian",
    has_savings_account: "No", savings_balance: "0",
  },
  assets: {
    owns_property: "Yes", property_type: "Residential house", property_value: "3500000",
    property_location: "Lahore", property_mortgaged: "No",
    owns_vehicle: "Yes", vehicle_type: "Motorcycle only", vehicle_value: "120000", investments: "0",
  },
  housing: {
    housing_type: "Owned (fully paid)", monthly_rent: "0", household_size: "6",
    housing_city: "Lahore", housing_province: "Punjab",
  },
  taxes: {
    is_filer: "Yes", annual_tax_paid: "0", tax_year: "2024", has_tax_return: "Yes",
  },
  expenses: {
    exp_food: "18000", exp_utilities: "7000", exp_transport: "3000",
    exp_medical: "2000", exp_phone: "1500", exp_household: "1000", exp_other: "1500",
  },
  loans: {
    has_loans: "No", loan1_type: "Not applicable", loan1_monthly: "0", loan2_type: "Not applicable",
  },
  dependents: {
    dep_siblings_school: "2", dep_siblings_university: "1", dep_elderly: "1",
  },
  education: {
    current_school: "Lahore Grammar School", school_type: "Private",
    annual_fee: "96000", monthly_fee: "8000", stationery_annual: "6000",
    uniform_annual: "4000", hostel_annual: "0", sib_edu_total_annual: "60000",
  },
  travel: {
    daily_travel_cost: "80", monthly_travel_cost: "1760", travel_mode: "Public transport",
    pocket_money_monthly: "800", other_allowances: "0",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProgress(modules: Record<string, ModuleState>) {
  const practiceModules = MODULES.filter(m => m.id !== "review");
  const done = practiceModules.filter(m => modules[m.id]?.status === "complete").length;
  return Math.round((done / practiceModules.length) * 100);
}

function calcDocProgress(docs: DocumentItem[]) {
  const applicable = docs.filter(d => d.status !== "not-applicable");
  const ready = applicable.filter(d => d.status === "ready").length;
  return applicable.length > 0 ? Math.round((ready / applicable.length) * 100) : 0;
}

function getDocCategories(docs: DocumentItem[]) {
  const cats: Record<string, DocumentItem[]> = {};
  docs.forEach(d => {
    if (!cats[d.category]) cats[d.category] = [];
    cats[d.category].push(d);
  });
  return cats;
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem("fap_state");
    if (raw) return JSON.parse(raw);
  } catch {}
  const modules: Record<string, ModuleState> = {};
  MODULES.forEach(m => { modules[m.id] = { id: m.id, status: "not-started", data: {} }; });
  return { modules, documents: DOCUMENT_ITEMS, activeModule: null, isSample: false };
}

function saveState(state: AppState) {
  try { localStorage.setItem("fap_state", JSON.stringify(state)); } catch {}
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${small ? "" : "gap-3"}`}>
      <svg width={small ? "24" : "32"} height={small ? "24" : "32"} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="18" height="24" rx="1.5" stroke="#292626" strokeWidth="1.5" fill="none"/>
        <line x1="8" y1="8" x2="18" y2="8" stroke="#292626" strokeWidth="1.2"/>
        <line x1="8" y1="12" x2="18" y2="12" stroke="#292626" strokeWidth="1.2"/>
        <line x1="8" y1="16" x2="14" y2="16" stroke="#292626" strokeWidth="1.2"/>
        <polyline points="14,20 17,23 24,15" stroke="#292626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <div>
        <div style={{ fontFamily: "'Lora', serif" }} className={`font-semibold leading-none text-[#292626] ${small ? "text-sm" : "text-base"}`}>
          Financial Aid Practice
        </div>
        {!small && (
          <div className="text-[10px] text-[#292626] opacity-50 tracking-widest uppercase mt-0.5">
            A YAN Initiative
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [open, setOpen] = useState(false);

  const navLinks: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Practice", page: "dashboard" },
    { label: "Documents", page: "documents" },
    { label: "Review", page: "review" },
  ];

  return (
    <header className="border-b border-[#292626]/10 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <button onClick={() => setPage("home")} className="hover:opacity-70 transition-opacity">
          <Logo small />
        </button>
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map(n => (
            <button
              key={n.page}
              onClick={() => setPage(n.page)}
              className={`text-sm font-medium transition-colors ${page === n.page ? "text-[#292626]" : "text-[#292626]/50 hover:text-[#292626]"}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <button
          className="md:hidden flex flex-col gap-1 p-1"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span className={`block w-5 h-0.5 bg-[#292626] transition-transform ${open ? "rotate-45 translate-y-1.5" : ""}`}/>
          <span className={`block w-5 h-0.5 bg-[#292626] transition-opacity ${open ? "opacity-0" : ""}`}/>
          <span className={`block w-5 h-0.5 bg-[#292626] transition-transform ${open ? "-rotate-45 -translate-y-1.5" : ""}`}/>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-[#292626]/10 bg-white px-5 pb-4 pt-2">
          {navLinks.map(n => (
            <button
              key={n.page}
              onClick={() => { setPage(n.page); setOpen(false); }}
              className="block w-full text-left py-2.5 text-sm font-medium text-[#292626] border-b border-[#292626]/5 last:border-0"
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer className="border-t border-[#292626]/10 mt-20 py-12">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16">
          <div className="flex-1">
            <Logo />
            <p className="mt-3 text-sm text-[#292626]/55 leading-relaxed max-w-xs">
              Financial Aid Practice is an educational preparation tool and is not an official financial aid application. Requirements vary by institution.
            </p>
          </div>
          <nav className="flex gap-12">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-3">Navigate</div>
              {(["home","dashboard","documents","review"] as Page[]).map(p => (
                <button key={p} onClick={() => setPage(p)} className="block text-sm text-[#292626]/60 hover:text-[#292626] mb-2 capitalize transition-colors">
                  {p === "dashboard" ? "Practice" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-3">About</div>
              <div className="text-sm text-[#292626]/60 mb-2">Privacy</div>
              <div className="text-sm text-[#292626]/60">About YAN</div>
            </div>
          </nav>
        </div>
        <div className="mt-10 pt-6 border-t border-[#292626]/10 text-xs text-[#292626]/35">
          © {new Date().getFullYear()} Financial Aid Practice — A Youth Awareness Network Initiative. No data is stored on any server.
        </div>
      </div>
    </footer>
  );
}

// ─── Privacy Banner ───────────────────────────────────────────────────────────

function PrivacyBanner() {
  return (
    <div className="bg-[#292626]/[0.03] border border-[#292626]/10 rounded px-4 py-3 text-sm text-[#292626]/65 flex gap-2.5 items-start">
      <svg className="mt-0.5 shrink-0 opacity-50" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5L1.5 4v3.5c0 3 2.5 5.5 5.5 6.5 3-1 5.5-3.5 5.5-6.5V4L7 1.5z" stroke="#292626" strokeWidth="1.2" fill="none"/>
      </svg>
      <span>Your practice information stays on this device. Financial Aid Practice does not require an account or store data on any server.</span>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ setPage, onLoadSample }: { setPage: (p: Page) => void; onLoadSample: () => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-5">
            Youth Awareness Network
          </div>
          <h1 style={{ fontFamily: "'Lora', serif" }} className="text-4xl md:text-5xl font-semibold text-[#292626] leading-tight mb-5">
            Financial Aid Practice
          </h1>
          <p style={{ fontFamily: "'Lora', serif" }} className="text-xl italic text-[#292626]/60 mb-4 leading-snug">
            Practice before you apply.
          </p>
          <p className="text-base text-[#292626]/65 leading-relaxed mb-10 max-w-xl">
            Practice financial aid questions, organise the information your family needs, and discover which documents you should prepare before completing a real application.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPage("dashboard")}
              className="bg-[#292626] text-white px-7 py-2.5 text-sm font-medium hover:bg-[#292626]/85 transition-colors"
            >
              Start Practicing
            </button>
            <button
              onClick={() => setPage("documents")}
              className="border border-[#292626]/25 text-[#292626] px-7 py-2.5 text-sm font-medium hover:border-[#292626]/50 transition-colors"
            >
              Prepare Documents
            </button>
            <button
              onClick={onLoadSample}
              className="text-[#292626]/50 px-4 py-2.5 text-sm hover:text-[#292626] transition-colors underline underline-offset-2"
            >
              Try a Sample Application
            </button>
          </div>
        </div>
      </section>

      {/* 3-step */}
      <section className="border-t border-[#292626]/10">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <h2 style={{ fontFamily: "'Lora', serif" }} className="text-lg font-semibold text-[#292626] mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#292626]/10">
            {[
              { n: "01", title: "Practice", body: "Work through 11 modules covering every section of a typical financial aid form — from family income to education expenses." },
              { n: "02", title: "Prepare", body: "Use the document checklist to identify what you need to gather — salary slips, bank statements, tax records, and more." },
              { n: "03", title: "Apply", body: "Download your practice summary and arrive at your real application ready, informed, and confident." },
            ].map(s => (
              <div key={s.n} className="py-8 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0">
                <div className="text-xs font-medium text-[#292626]/30 tracking-widest mb-3">{s.n}</div>
                <h3 style={{ fontFamily: "'Lora', serif" }} className="text-xl font-semibold text-[#292626] mb-2">{s.title}</h3>
                <p className="text-sm text-[#292626]/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="bg-[#292626] text-white">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <div className="max-w-2xl">
            <h2 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold mb-4">Why practice matters</h2>
            <p className="text-white/65 text-base leading-relaxed mb-8">
              Financial aid applications ask for detailed information that many students have never had to find before — tax records, bank statements, property values, and more. Applying without preparation often leads to missing documents, incomplete forms, and delays. This tool gives you time to get ready.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                ["Free", "No account required. No fees. No ads."],
                ["Private", "All data stays on your own device."],
                ["Comprehensive", "Based on a real financial aid form template."],
                ["Downloadable", "Save a PDF summary for reference."],
              ].map(([t, d]) => (
                <div key={t} className="border border-white/15 p-4">
                  <div style={{ fontFamily: "'Lora', serif" }} className="font-semibold text-white mb-1">{t}</div>
                  <div className="text-sm text-white/55">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy note */}
      <section className="max-w-5xl mx-auto px-5 py-12">
        <PrivacyBanner />
      </section>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({
  appState, setPage, setActiveModule, onClearData
}: {
  appState: AppState;
  setPage: (p: Page) => void;
  setActiveModule: (id: string) => void;
  onClearData: () => void;
}) {
  const progress = calcProgress(appState.modules);
  const docProgress = calcDocProgress(appState.documents);

  const statusLabel: Record<ModuleStatus, string> = {
    "not-started": "Not started",
    "in-progress": "In progress",
    "complete": "Complete",
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-10">
        <div>
          {appState.isSample && (
            <div className="inline-flex items-center gap-1.5 text-xs bg-[#292626]/8 text-[#292626]/70 px-2.5 py-1 mb-3">
              Sample data loaded — replace with your own information
            </div>
          )}
          <h1 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold text-[#292626]">My Practice</h1>
          <p className="text-sm text-[#292626]/55 mt-1">Work through each module at your own pace.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage("review")}
            className="text-xs text-[#292626]/55 border border-[#292626]/20 px-3 py-1.5 hover:border-[#292626]/40 transition-colors"
          >
            View Review
          </button>
          <button
            onClick={onClearData}
            className="text-xs text-[#292626]/40 hover:text-[#292626] transition-colors px-2"
          >
            Clear My Data
          </button>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="border border-[#292626]/12 p-5">
          <div className="text-xs uppercase tracking-widest text-[#292626]/40 mb-3">Practice Progress</div>
          <div className="flex items-end gap-2 mb-2">
            <span style={{ fontFamily: "'Lora', serif" }} className="text-3xl font-semibold text-[#292626]">{progress}%</span>
            <span className="text-sm text-[#292626]/40 mb-1">modules complete</span>
          </div>
          <div className="h-1.5 bg-[#292626]/10 mt-3">
            <div className="h-1.5 bg-[#292626] transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
        </div>
        <div className="border border-[#292626]/12 p-5">
          <div className="text-xs uppercase tracking-widest text-[#292626]/40 mb-3">Documents Ready</div>
          <div className="flex items-end gap-2 mb-2">
            <span style={{ fontFamily: "'Lora', serif" }} className="text-3xl font-semibold text-[#292626]">{docProgress}%</span>
            <span className="text-sm text-[#292626]/40 mb-1">of applicable documents</span>
          </div>
          <div className="h-1.5 bg-[#292626]/10 mt-3">
            <div className="h-1.5 bg-[#292626] transition-all duration-500" style={{ width: `${docProgress}%` }}/>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="divide-y divide-[#292626]/8 border-t border-[#292626]/8">
        {MODULES.map((mod, i) => {
          const ms = appState.modules[mod.id];
          const status = ms?.status ?? "not-started";
          const isReview = mod.id === "review";
          return (
            <div
              key={mod.id}
              className="flex items-center gap-4 py-4 group"
            >
              <div className="w-7 shrink-0">
                {status === "complete" ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#292626" strokeWidth="1.2"/>
                    <polyline points="6,10 9,13 14,7" stroke="#292626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div className="text-xs text-[#292626]/30 font-medium w-5 text-center">{String(i + 1).padStart(2, "0")}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Lora', serif" }} className="font-medium text-[#292626] text-sm">{mod.label}</div>
                <div className="text-xs text-[#292626]/45 mt-0.5 truncate">{mod.description}</div>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className={`text-xs ${
                  status === "complete" ? "text-[#292626]/60" :
                  status === "in-progress" ? "text-[#292626] font-medium" :
                  "text-[#292626]/30"
                }`}>
                  {statusLabel[status]}
                </span>
                <button
                  onClick={() => isReview ? setPage("review") : (setActiveModule(mod.id), setPage("practice"))}
                  className="text-xs border border-[#292626]/20 text-[#292626] px-3 py-1.5 hover:bg-[#292626] hover:text-white transition-all"
                >
                  {isReview ? "View Review" : status === "complete" ? "Revisit" : status === "in-progress" ? "Continue" : "Start"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <PrivacyBanner />
      </div>
    </div>
  );
}

// ─── Practice Form ────────────────────────────────────────────────────────────

function PracticeForm({
  moduleId, appState, onUpdateModule, onBack
}: {
  moduleId: string;
  appState: AppState;
  onUpdateModule: (id: string, data: FormData, status: ModuleStatus) => void;
  onBack: () => void;
}) {
  const mod = MODULES.find(m => m.id === moduleId)!;
  const steps = MODULE_STEPS[moduleId] ?? [];
  const [stepIdx, setStepIdx] = useState(0);
  const [formData, setFormData] = useState<FormData>(() => ({
    ...appState.modules[moduleId]?.data ?? {},
  }));

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  const setValue = (id: string, val: string) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const handleContinue = () => {
    onUpdateModule(moduleId, formData, isLast ? "complete" : "in-progress");
    if (isLast) { onBack(); }
    else { setStepIdx(s => s + 1); }
  };

  const handleSave = () => {
    onUpdateModule(moduleId, formData, "in-progress");
  };

  if (!step) return null;

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      {/* Breadcrumb */}
      <button onClick={onBack} className="text-xs text-[#292626]/45 hover:text-[#292626] flex items-center gap-1.5 mb-8 transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Dashboard
      </button>

      {/* Module title */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-[#292626]/35 font-medium">
          {mod.label}
        </div>
        <div className="text-xs text-[#292626]/35">
          Step {stepIdx + 1} of {steps.length}
        </div>
      </div>

      {/* Step progress */}
      <div className="flex gap-1 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 transition-colors ${i <= stepIdx ? "bg-[#292626]" : "bg-[#292626]/15"}`}/>
        ))}
      </div>

      <h1 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold text-[#292626] mb-2">
        {step.title}
      </h1>
      <p className="text-sm text-[#292626]/55 mb-8 leading-relaxed">{step.note}</p>

      {step.fields.length === 0 && (
        <div className="border border-[#292626]/10 p-6 text-center">
          <svg className="mx-auto mb-3 opacity-30" width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#292626" strokeWidth="1.5"/>
            <polyline points="10,16 14,20 22,11" stroke="#292626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm text-[#292626]/55">All modules complete. Head to the Final Review page to see your summary.</p>
        </div>
      )}

      <div className="space-y-6">
        {step.fields.map(f => (
          <div key={f.id}>
            <label className="block text-sm font-medium text-[#292626] mb-1.5">
              {f.label}
              {f.required && <span className="text-[#292626]/40 ml-1">*</span>}
            </label>
            {f.type === "text" || f.type === "number" ? (
              <input
                type={f.type}
                value={(formData[f.id] as string) ?? ""}
                onChange={e => setValue(f.id, e.target.value)}
                placeholder={f.placeholder}
                className="w-full border border-[#292626]/20 px-3 py-2.5 text-sm text-[#292626] focus:outline-none focus:border-[#292626]/60 transition-colors bg-white placeholder:text-[#292626]/30"
              />
            ) : f.type === "select" ? (
              <select
                value={(formData[f.id] as string) ?? ""}
                onChange={e => setValue(f.id, e.target.value)}
                className="w-full border border-[#292626]/20 px-3 py-2.5 text-sm text-[#292626] focus:outline-none focus:border-[#292626]/60 transition-colors bg-white appearance-none"
              >
                <option value="">Select an option</option>
                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "radio" ? (
              <div className="flex flex-wrap gap-3">
                {f.options?.map(o => (
                  <label key={o} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={f.id}
                      value={o}
                      checked={formData[f.id] === o}
                      onChange={() => setValue(f.id, o)}
                      className="accent-[#292626]"
                    />
                    <span className="text-sm text-[#292626]">{o}</span>
                  </label>
                ))}
              </div>
            ) : f.type === "textarea" ? (
              <textarea
                value={(formData[f.id] as string) ?? ""}
                onChange={e => setValue(f.id, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="w-full border border-[#292626]/20 px-3 py-2.5 text-sm text-[#292626] focus:outline-none focus:border-[#292626]/60 transition-colors bg-white resize-none placeholder:text-[#292626]/30"
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-10 pt-6 border-t border-[#292626]/10">
        {!isFirst && (
          <button
            onClick={() => setStepIdx(s => s - 1)}
            className="border border-[#292626]/20 text-[#292626] text-sm px-5 py-2.5 hover:border-[#292626]/50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSave}
          className="border border-[#292626]/20 text-[#292626]/60 text-sm px-4 py-2.5 hover:text-[#292626] transition-colors"
        >
          Save Progress
        </button>
        <button
          onClick={handleContinue}
          className="ml-auto bg-[#292626] text-white text-sm px-6 py-2.5 hover:bg-[#292626]/85 transition-colors"
        >
          {isLast ? "Complete Module" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Document Checklist ───────────────────────────────────────────────────────

function DocumentChecklist({
  appState, onUpdateDocs
}: {
  appState: AppState;
  onUpdateDocs: (docs: DocumentItem[]) => void;
}) {
  const docs = appState.documents;
  const cats = getDocCategories(docs);
  const docProgress = calcDocProgress(docs);

  const setStatus = (id: string, status: DocumentItem["status"]) => {
    onUpdateDocs(docs.map(d => d.id === id ? { ...d, status } : d));
  };

  const statusColors: Record<DocumentItem["status"], string> = {
    "ready": "bg-[#292626] text-white border-[#292626]",
    "need-to-get": "border-[#292626]/40 text-[#292626]",
    "not-applicable": "border-[#292626]/15 text-[#292626]/35",
    "unchecked": "border-[#292626]/15 text-[#292626]/35",
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-10">
        <div>
          <h1 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold text-[#292626]">Document Checklist</h1>
          <p className="text-sm text-[#292626]/55 mt-1">Mark each document as you gather it. Documents stay on your device.</p>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold text-[#292626]">{docProgress}%</div>
          <div className="text-xs text-[#292626]/40">documents ready</div>
        </div>
      </div>

      <div className="h-1.5 bg-[#292626]/10 mb-10">
        <div className="h-1.5 bg-[#292626] transition-all duration-500" style={{ width: `${docProgress}%` }}/>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-xs text-[#292626]/50 items-center">
        <span className="font-medium text-[#292626]/60 mr-1">Status key:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#292626] rounded-sm inline-block"/>&thinsp;Ready</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 border border-[#292626]/40 rounded-sm inline-block"/>&thinsp;Need to get</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 border border-[#292626]/15 rounded-sm inline-block"/>&thinsp;Not applicable</span>
      </div>

      <div className="space-y-10">
        {Object.entries(cats).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-4 pb-2 border-b border-[#292626]/8">
              {cat}
            </h2>
            <div className="space-y-1">
              {items.map(doc => (
                <div key={doc.id} className={`flex items-center gap-3 py-2.5 border-b border-[#292626]/5 last:border-0 ${doc.status === "not-applicable" ? "opacity-40" : ""}`}>
                  <div className="flex-1 text-sm text-[#292626]">{doc.label}</div>
                  <div className="flex gap-1 shrink-0">
                    {(["ready", "need-to-get", "not-applicable"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(doc.id, doc.status === s ? "unchecked" : s)}
                        className={`text-xs border px-2.5 py-1 transition-all ${doc.status === s ? statusColors[s] : "border-[#292626]/12 text-[#292626]/30 hover:border-[#292626]/25"}`}
                      >
                        {s === "ready" ? "Ready" : s === "need-to-get" ? "Need to get" : "N/A"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <PrivacyBanner />
      </div>
    </div>
  );
}

// ─── Final Review ─────────────────────────────────────────────────────────────

function FinalReview({ appState, setPage }: { appState: AppState; setPage: (p: Page) => void }) {
  const progress = calcProgress(appState.modules);
  const docProgress = calcDocProgress(appState.documents);
  const overallPrep = Math.round((progress + docProgress) / 2);

  const completedModules = MODULES.filter(m => m.id !== "review" && appState.modules[m.id]?.status === "complete");
  const incompleteModules = MODULES.filter(m => m.id !== "review" && appState.modules[m.id]?.status !== "complete");
  const missingDocs = appState.documents.filter(d => d.status === "need-to-get");

  const getField = (moduleId: string, fieldId: string) => {
    return (appState.modules[moduleId]?.data?.[fieldId] as string) ?? "—";
  };

  const fmt = (val: string) => {
    const n = parseFloat(val);
    return isNaN(n) ? "—" : `PKR ${n.toLocaleString()}`;
  };

  const handleDownload = () => {
    const lines: string[] = [];
    lines.push("FINANCIAL AID PRACTICE — PRACTICE DOCUMENT");
    lines.push("NOT AN OFFICIAL FINANCIAL AID APPLICATION");
    lines.push("Generated by Financial Aid Practice (financialaidpractice.org) — A Youth Awareness Network Initiative");
    lines.push(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`);
    lines.push("");
    lines.push("═══════════════════════════════════════════════════════");
    lines.push("OVERALL PREPARATION: " + overallPrep + "%");
    lines.push("Practice modules: " + progress + "%");
    lines.push("Documents ready: " + docProgress + "%");
    lines.push("");
    lines.push("APPLICANT");
    lines.push("Name: " + getField("family", "applicant_name"));
    lines.push("");
    lines.push("INCOME SUMMARY");
    lines.push("Father monthly salary: " + fmt(getField("income", "father_salary")));
    lines.push("Mother monthly salary: " + fmt(getField("income", "mother_salary")));
    lines.push("");
    lines.push("EXPENSE SUMMARY");
    const expFields = ["exp_food", "exp_utilities", "exp_transport", "exp_medical", "exp_phone", "exp_household", "exp_other"];
    const totalExp = expFields.reduce((s, f) => s + (parseFloat(getField("expenses", f)) || 0), 0);
    lines.push("Total monthly expenses: PKR " + totalExp.toLocaleString());
    lines.push("");
    lines.push("ASSETS");
    lines.push("Owns property: " + getField("assets", "owns_property"));
    lines.push("Property value: " + fmt(getField("assets", "property_value")));
    lines.push("Vehicle: " + getField("assets", "vehicle_type"));
    lines.push("");
    lines.push("LOANS");
    lines.push("Has loans: " + getField("loans", "has_loans"));
    lines.push("Monthly loan repayment 1: " + fmt(getField("loans", "loan1_monthly")));
    lines.push("");
    lines.push("EDUCATION EXPENSES");
    lines.push("Annual fee: " + fmt(getField("education", "annual_fee")));
    lines.push("Monthly fee: " + fmt(getField("education", "monthly_fee")));
    lines.push("");
    lines.push("DOCUMENT CHECKLIST");
    const docCats = getDocCategories(appState.documents);
    Object.entries(docCats).forEach(([cat, items]) => {
      lines.push("  " + cat + ":");
      items.forEach(d => {
        const s = d.status === "ready" ? "[READY]" : d.status === "need-to-get" ? "[NEED TO GET]" : d.status === "not-applicable" ? "[N/A]" : "[ ]";
        lines.push("    " + s + " " + d.label);
      });
    });
    lines.push("");
    lines.push("MISSING INFORMATION");
    incompleteModules.forEach(m => lines.push("  - " + m.label + ": Not completed"));
    lines.push("");
    lines.push("DISCLAIMER: This is a practice document for preparation purposes only.");
    lines.push("Financial Aid Practice does not assess eligibility for financial aid.");
    lines.push("Requirements vary by institution. Consult your institution's financial aid office.");

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "financial-aid-practice-summary.txt";
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <h1 style={{ fontFamily: "'Lora', serif" }} className="text-2xl font-semibold text-[#292626] mb-2">
        Final Review
      </h1>
      <p className="text-sm text-[#292626]/55 mb-10">A summary of your practice progress and preparation status.</p>

      {/* Overall score */}
      <div className="border border-[#292626]/12 p-8 mb-10">
        <div className="text-xs uppercase tracking-widest text-[#292626]/35 mb-4">Preparation Progress</div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-4">
          <span style={{ fontFamily: "'Lora', serif" }} className="text-5xl font-semibold text-[#292626]">{overallPrep}%</span>
          <span className="text-sm text-[#292626]/45 mb-2">overall preparation</span>
        </div>
        <div className="h-2 bg-[#292626]/8 mb-1">
          <div className="h-2 bg-[#292626] transition-all" style={{ width: `${overallPrep}%` }}/>
        </div>
        <p className="text-xs text-[#292626]/40 mt-3">
          This percentage represents your <strong>preparation progress only</strong> and does not indicate financial aid eligibility or the likelihood of receiving an award.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Completed modules */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-4">Completed Modules ({completedModules.length}/{MODULES.length - 1})</h2>
          <div className="space-y-2">
            {completedModules.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 text-sm text-[#292626]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#292626" strokeWidth="1.2"/>
                  <polyline points="5,8 7,10 11,6" stroke="#292626" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {m.label}
              </div>
            ))}
            {completedModules.length === 0 && (
              <p className="text-sm text-[#292626]/35">No modules completed yet.</p>
            )}
          </div>
        </div>

        {/* Not complete */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-4">Still Needed ({incompleteModules.length})</h2>
          <div className="space-y-2">
            {incompleteModules.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 text-sm text-[#292626]/55">
                <div className="w-4 h-4 border border-[#292626]/25 shrink-0"/>
                {m.label}
              </div>
            ))}
            {incompleteModules.length === 0 && (
              <p className="text-sm text-[#292626]/55">All modules complete!</p>
            )}
          </div>
        </div>
      </div>

      {/* Missing documents */}
      {missingDocs.length > 0 && (
        <div className="border border-[#292626]/12 p-6 mb-10">
          <h2 className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-4">Documents Still Needed ({missingDocs.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {missingDocs.map(d => (
              <div key={d.id} className="text-sm text-[#292626]/65 flex items-start gap-2">
                <span className="text-[#292626]/25 mt-0.5">–</span>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary rows */}
      <div className="border-t border-[#292626]/10 pt-8 mb-10">
        <h2 className="text-xs uppercase tracking-widest text-[#292626]/40 font-medium mb-6">Practice Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-sm">
          {[
            ["Applicant", getField("family", "applicant_name")],
            ["Father's salary", fmt(getField("income", "father_salary"))],
            ["Mother's salary", fmt(getField("income", "mother_salary"))],
            ["Property owned", getField("assets", "owns_property")],
            ["Housing type", getField("housing", "housing_type")],
            ["Monthly school fee", fmt(getField("education", "monthly_fee"))],
            ["Has loans", getField("loans", "has_loans")],
            ["Tax filer", getField("taxes", "is_filer")],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-[#292626]/6 pb-2">
              <span className="text-[#292626]/50">{label}</span>
              <span className="text-[#292626] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownload}
          className="bg-[#292626] text-white px-7 py-2.5 text-sm font-medium hover:bg-[#292626]/85 transition-colors"
        >
          Download Practice Summary
        </button>
        <button
          onClick={() => setPage("dashboard")}
          className="border border-[#292626]/20 text-[#292626] px-5 py-2.5 text-sm hover:border-[#292626]/45 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      <p className="text-xs text-[#292626]/35 mt-5 max-w-xl leading-relaxed">
        The downloaded summary will be marked <strong>PRACTICE DOCUMENT — NOT AN OFFICIAL FINANCIAL AID APPLICATION</strong>.
      </p>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [appState, setAppState] = useState<AppState>(loadState);
  const [activeModule, setActiveModule] = useState<string>("family");

  const updateAppState = useCallback((update: Partial<AppState> | ((s: AppState) => AppState)) => {
    setAppState(prev => {
      const next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      saveState(next);
      return next;
    });
  }, []);

  const handleUpdateModule = useCallback((id: string, data: FormData, status: ModuleStatus) => {
    updateAppState(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [id]: { id, status, data, completedAt: status === "complete" ? new Date().toISOString() : prev.modules[id]?.completedAt },
      },
    }));
  }, [updateAppState]);

  const handleUpdateDocs = useCallback((docs: DocumentItem[]) => {
    updateAppState({ documents: docs });
  }, [updateAppState]);

  const handleLoadSample = useCallback(() => {
    const modules: Record<string, ModuleState> = {};
    MODULES.forEach(m => {
      modules[m.id] = {
        id: m.id,
        status: m.id === "review" ? "not-started" : SAMPLE_DATA[m.id] ? "complete" : "not-started",
        data: SAMPLE_DATA[m.id] ?? {},
      };
    });
    const sampleDocs = DOCUMENT_ITEMS.map(d => ({
      ...d,
      status: ["d1","d2","d4","d9","d12","d15"].includes(d.id) ? "ready" as const :
               ["d7","d8","d13","d20"].includes(d.id) ? "not-applicable" as const :
               "need-to-get" as const,
    }));
    const next: AppState = { modules, documents: sampleDocs, activeModule: null, isSample: true };
    saveState(next);
    setAppState(next);
    setPage("dashboard");
  }, []);

  const handleClearData = useCallback(() => {
    if (!window.confirm("Clear all practice data? This cannot be undone.")) return;
    localStorage.removeItem("fap_state");
    const fresh = loadState();
    setAppState(fresh);
    setPage("home");
  }, []);

  const handleSetActiveModule = useCallback((id: string) => {
    setActiveModule(id);
    updateAppState(prev => ({ ...prev, activeModule: id }));
  }, [updateAppState]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, activeModule]);

  return (
    <div className="min-h-screen bg-white text-[#292626]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header page={page} setPage={setPage} />

      <main>
        {page === "home" && (
          <HomePage setPage={setPage} onLoadSample={handleLoadSample} />
        )}
        {page === "dashboard" && (
          <Dashboard
            appState={appState}
            setPage={setPage}
            setActiveModule={handleSetActiveModule}
            onClearData={handleClearData}
          />
        )}
        {page === "practice" && (
          <PracticeForm
            moduleId={activeModule}
            appState={appState}
            onUpdateModule={handleUpdateModule}
            onBack={() => setPage("dashboard")}
          />
        )}
        {page === "documents" && (
          <DocumentChecklist appState={appState} onUpdateDocs={handleUpdateDocs} />
        )}
        {page === "review" && (
          <FinalReview appState={appState} setPage={setPage} />
        )}
      </main>

      <Footer setPage={setPage} />
    </div>
  );
}
