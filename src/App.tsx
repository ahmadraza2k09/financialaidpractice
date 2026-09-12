import { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type Page =
  | "home"
  | "dashboard"
  | "app-practice"
  | "fa-practice"
  | "activities-honors"
  | "documents"
  | "review";

type SectionStatus = "not-started" | "in-progress" | "complete";

interface ApplicationData {
  fullName?: string;
  preferredName?: string;
  dob?: string;
  gender?: string;
  citizenship?: string;
  email?: string;
  phone?: string;
  address?: string;

  schoolName?: string;
  graduationYear?: string;
  gpa?: string;
  gradingScale?: string;
  intendedMajor?: string;
  counselorName?: string;
  counselorEmail?: string;

  parent1Name?: string;
  parent1Occupation?: string;
  parent1Education?: string;
  parent2Name?: string;
  parent2Occupation?: string;
  parent2Education?: string;
  householdSize?: string;
  primaryLanguage?: string;

  targetUniversities?: string;
  degreeType?: string;
  careerGoals?: string;
  personalStatementNotes?: string;
  [key: string]: any;
}

interface ActivityItem {
  id: string;
  name: string;
  organization: string;
  role: string;
  description: string;
  yearsInvolved: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

interface HonorItem {
  id: string;
  title: string;
  organization: string;
  level: string;
  yearReceived: string;
  description: string;
}

interface FinancialFormData {
  [key: string]: any;
}

interface ModuleState {
  id: string;
  status: SectionStatus;
  data: FinancialFormData;
  completedAt?: string;
}

interface DocumentItem {
  id: string;
  label: string;
  category: "Academic Documents" | "Personal Documents" | "Application Documents" | "Financial Aid Documents";
  status: "ready" | "need-to-get" | "not-applicable" | "unchecked";
}

interface AppState {
  appData: ApplicationData;
  appSectionStatus: Record<string, SectionStatus>;
  faModules: Record<string, ModuleState>;
  activities: ActivityItem[];
  honors: HonorItem[];
  activitiesStatus: SectionStatus;
  documents: DocumentItem[];
  activeFaModule: string | null;
  isSample: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FA_MODULES = [
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
];

const APP_SECTIONS = [
  {
    id: "personal",
    title: "Personal Information",
    description: "Legal identification, contact info, citizenship, and passport details (Exchange Program & University Standard)",
    fields: [
      { id: "fullName", label: "Full Legal Name (as on Passport / Birth Certificate / CNIC)", type: "text", placeholder: "e.g. Sara Ahmed", required: true },
      { id: "preferredName", label: "Preferred / Given Name", type: "text", placeholder: "e.g. Sara" },
      { id: "dob", label: "Date of Birth", type: "text", placeholder: "DD/MM/YYYY", required: true },
      { id: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
      { id: "citizenship", label: "Country of Citizenship & Nationality", type: "text", placeholder: "e.g. Pakistan", required: true },
      { id: "passportNumber", label: "Passport / National ID (CNIC / B-Form Number) — Practice Only", type: "text", placeholder: "e.g. XXXXX-XXXXXXX-X or Passport #" },
      { id: "email", label: "Student Email Address", type: "text", placeholder: "your.email@example.com", required: true },
      { id: "phone", label: "Mobile / WhatsApp Number", type: "text", placeholder: "+92 300 0000000" },
      { id: "emergencyContact", label: "Emergency Contact Name & Relationship", type: "text", placeholder: "e.g. Tariq Ahmed (Father) — 0300 1234567" },
      { id: "address", label: "Permanent Home Address (City, District, Province)", type: "textarea", placeholder: "Street address, District, City, Province, Postal Code" },
    ],
  },
  {
    id: "education",
    title: "Education & Academic Records",
    description: "Current school profile, transcripts history, ELTiS/English proficiency, and counselors",
    fields: [
      { id: "schoolName", label: "Current High School / College Name", type: "text", placeholder: "e.g. High School / College Name", required: true },
      { id: "currentGrade", label: "Current Grade Level", type: "select", options: ["Grade 9", "Grade 10 (Matric)", "Grade 11 (FSc / AS-Level)", "Grade 12 (FSc / A-Level)", "Other"] },
      { id: "graduationYear", label: "Expected Graduation Year", type: "text", placeholder: "e.g. 2026" },
      { id: "gpa", label: "Past 3 Years Academic Performance (Grade 9, 10, 11 % / GPA)", type: "text", placeholder: "e.g. Grade 9: 88%, Grade 10: 91%, Grade 11: 89%" },
      { id: "gradingScale", label: "Grading Scale Type", type: "select", options: ["Percentage (%)", "4.0 Scale", "5.0 Scale", "A-Levels / O-Levels (Grades)", "IB (1-7)"] },
      { id: "hasRepeatedGrade", label: "Have you ever repeated a grade or transferred schools? (Exchange Program requirement)", type: "select", options: ["No", "Yes (explain in notes below)"] },
      { id: "englishProficiency", label: "English Language Proficiency Level", type: "select", options: ["Beginner", "Intermediate", "Advanced", "Native / Fluent", "ELTiS / TOEFL Score Available"] },
      { id: "intendedMajor", label: "Intended Major / Field of Interest", type: "text", placeholder: "e.g. Computer Science, Public Policy, Engineering, Economics" },
      { id: "counselorName", label: "School Principal / Teacher Referee Name", type: "text", placeholder: "e.g. Vice Principal / Teacher Name" },
      { id: "counselorEmail", label: "Referee Email Address", type: "text", placeholder: "teacher.referee@school.edu" },
    ],
  },
  {
    id: "family",
    title: "Family Information",
    description: "Parents background, household structure, and international travel history",
    fields: [
      { id: "parent1Name", label: "Parent / Guardian 1 Name & Relationship", type: "text", placeholder: "e.g. Tariq Ahmed (Father)" },
      { id: "parent1Occupation", label: "Parent 1 Occupation & Employer Name", type: "text", placeholder: "e.g. Senior Accountant, Govt School Teacher" },
      { id: "parent1Education", label: "Parent 1 Highest Education Level", type: "select", options: ["High School", "Bachelor's Degree", "Master's Degree", "Doctorate / Professional", "Other / None"] },
      { id: "parent2Name", label: "Parent / Guardian 2 Name & Relationship", type: "text", placeholder: "e.g. Nadia Ahmed (Mother)" },
      { id: "parent2Occupation", label: "Parent 2 Occupation & Employer Name", type: "text", placeholder: "e.g. Homemaker, Private Business" },
      { id: "parent2Education", label: "Parent 2 Highest Education Level", type: "select", options: ["High School", "Bachelor's Degree", "Master's Degree", "Doctorate / Professional", "Other / None"] },
      { id: "householdSize", label: "Total Household Size & School-going Siblings", type: "text", placeholder: "e.g. 5 members (2 siblings in school)" },
      { id: "familyAbroadHistory", label: "Have immediate family members studied or lived abroad?", type: "select", options: ["No", "Yes (provide details in notes)"] },
      { id: "primaryLanguage", label: "Primary Language Spoken at Home", type: "text", placeholder: "e.g. Urdu, Pashto, Punjabi, English" },
    ],
  },
  {
    id: "klyes_essays",
    title: "Exchange & Application Practice Essays",
    description: "Practice authentic essay prompts for Exchange Programs and University Personal Statements",
    fields: [
      { id: "klyesEssay1", label: "Exchange Essay 1: Cultural Exchange & Adaptability (250-400 words)", type: "textarea", placeholder: "Describe a difficult situation or cultural misunderstanding you experienced. How did you handle it and what did you learn about adapting to new environments?" },
      { id: "klyesEssay2", label: "Exchange Essay 2: Host Family & Community Ambassadorship (250-400 words)", type: "textarea", placeholder: "Why do you want to live with an international host family? How will you represent your culture and share your background with your host school and community?" },
      { id: "hostFamilyLetter", label: "Host Family Introductory Letter Draft (300-500 words)", type: "textarea", placeholder: "Dear Host Family, Write a warm letter introducing yourself, your family, daily routines, hobbies, interests, and why you are excited for this exchange program..." },
      { id: "commonAppEssay", label: "Personal Statement / Main Application Essay Draft (650 words max)", type: "textarea", placeholder: "Write your main personal statement (Background/Identity, Overcoming a setback, Challenging an idea, Gratitude/Problem solved, or Topic of Choice)..." },
    ],
  },
  {
    id: "future",
    title: "Future Plans & Target Programs",
    description: "Target exchange programs, universities, deadlines, and career goals",
    fields: [
      { id: "targetUniversities", label: "Target Exchange Programs & Universities", type: "textarea", placeholder: "e.g. International Exchange Program, Leadership Fellowship, National Universities, Overseas Universities" },
      { id: "degreeType", label: "Program / Application Type", type: "select", options: ["High School Exchange Program", "Undergraduate Bachelor's Program", "Leadership & Exchange Fellowship", "Other"] },
      { id: "applicationDeadlines", label: "Target Application Deadlines", type: "text", placeholder: "e.g. Exchange Program: October 30; Early Action: November 1; Regular Decision: January 1" },
      { id: "careerGoals", label: "Long-term Career & Community Impact Goals", type: "textarea", placeholder: "What career path do you plan to pursue after your studies/exchange, and how will you give back to your community?" },
    ],
  },
];

const COMPREHENSIVE_DOCUMENTS: DocumentItem[] = [
  // Academic Documents
  { id: "doc_ac1", label: "Past 3 Years School Transcripts (Grade 9, 10, 11 official marksheets & transcripts required)", category: "Academic Documents", status: "unchecked" },
  { id: "doc_ac2", label: "School Certificate / Graduation Diploma", category: "Academic Documents", status: "unchecked" },
  { id: "doc_ac3", label: "Test Scores (SAT / ACT / IELTS / TOEFL / Duolingo)", category: "Academic Documents", status: "unchecked" },
  { id: "doc_ac4", label: "Other Academic Document (specify custom document below)", category: "Academic Documents", status: "unchecked" },
  // Personal Documents
  { id: "doc_p1", label: "Passport (copy of valid bio-data page)", category: "Personal Documents", status: "unchecked" },
  { id: "doc_p2", label: "Identification Document (CNIC / National ID / Birth Cert)", category: "Personal Documents", status: "unchecked" },
  // Application Documents
  { id: "doc_ap1", label: "Application Essays / Personal Statement", category: "Application Documents", status: "unchecked" },
  { id: "doc_ap2", label: "Recommendation Letters (Counselor & Teachers)", category: "Application Documents", status: "unchecked" },
  { id: "doc_ap3", label: "Curriculum Vitae (CV) / Student Resume", category: "Application Documents", status: "unchecked" },
  // Financial Aid Documents
  { id: "doc_fa1", label: "Income Documents (Salary slips / employment letter / business returns)", category: "Financial Aid Documents", status: "unchecked" },
  { id: "doc_fa2", label: "Bank Statements (Last 3 to 6 months)", category: "Financial Aid Documents", status: "unchecked" },
  { id: "doc_fa3", label: "Tax Documents (NTN certificate / tax return receipt)", category: "Financial Aid Documents", status: "unchecked" },
  { id: "doc_fa4", label: "Property Documents (Title deed / rent agreement / utility bill)", category: "Financial Aid Documents", status: "unchecked" },
];

const FA_MODULE_STEPS: Record<string, { title: string; note: string; fields: { id: string; label: string; type: "text" | "select" | "radio" | "number" | "textarea"; options?: string[]; placeholder?: string; required?: boolean }[] }[]> = {
  family: [
    {
      title: "About You",
      note: "Tell us a bit about yourself as the applicant.",
      fields: [
        { id: "applicant_name", label: "Your full name", type: "text", placeholder: "e.g. Sara Ahmed", required: true },
        { id: "applicant_dob", label: "Date of birth", type: "text", placeholder: "DD/MM/YYYY" },
        { id: "applicant_id", label: "CNIC / ID number (practice only — do not use real ID)", type: "text", placeholder: "e.g. XXXXX-XXXXXXX-X" },
        { id: "applicant_email", label: "Email address (optional)", type: "text", placeholder: "your@email.com" },
        { id: "applicant_phone", label: "Mobile number", type: "text", placeholder: "e.g. 0300 0000000" },
      ],
    },
    {
      title: "Father / Male Guardian",
      note: "Provide details for your father or primary male guardian.",
      fields: [
        { id: "father_name", label: "Full name", type: "text", placeholder: "e.g. Tariq Ahmed" },
        { id: "father_status", label: "Status", type: "select", options: ["Living", "Deceased", "Unknown / Absent"] },
        { id: "father_occupation", label: "Occupation", type: "text", placeholder: "e.g. Teacher, Accountant, Business owner" },
        { id: "father_employer", label: "Employer / Company name", type: "text", placeholder: "e.g. Government School, Private Company" },
      ],
    },
    {
      title: "Mother / Female Guardian",
      note: "Provide details for your mother or primary female guardian.",
      fields: [
        { id: "mother_name", label: "Full name", type: "text", placeholder: "e.g. Nadia Ahmed" },
        { id: "mother_status", label: "Status", type: "select", options: ["Living", "Deceased", "Unknown / Absent"] },
        { id: "mother_occupation", label: "Occupation", type: "text", placeholder: "e.g. Homemaker, Teacher, Nurse" },
      ],
    },
  ],
  income: [
    {
      title: "Father's / Guardian's Income",
      note: "Enter monthly income amounts.",
      fields: [
        { id: "father_salary", label: "Monthly salary (net take-home PKR)", type: "number", placeholder: "e.g. 45000" },
        { id: "father_business_income", label: "Monthly business income (if self-employed)", type: "number", placeholder: "0 if not applicable" },
      ],
    },
    {
      title: "Mother's / Guardian's Income",
      note: "If your mother or second guardian is employed, provide their income details.",
      fields: [
        { id: "mother_salary", label: "Monthly salary (net take-home PKR)", type: "number", placeholder: "0 if not employed" },
      ],
    },
  ],
  bank: [
    {
      title: "Bank Accounts",
      note: "List your family's bank accounts. Do not use real account numbers.",
      fields: [
        { id: "bank1_name", label: "Bank name", type: "text", placeholder: "e.g. HBL, MCB, Meezan" },
        { id: "bank1_type", label: "Account type", type: "select", options: ["Current", "Savings", "Islamic", "Joint"] },
        { id: "bank1_balance", label: "Approximate average monthly balance (PKR)", type: "number", placeholder: "e.g. 50000" },
      ],
    },
  ],
  assets: [
    {
      title: "Property & Assets",
      note: "Do you or your parents own any property or vehicles?",
      fields: [
        { id: "owns_property", label: "Does your family own property?", type: "radio", options: ["Yes", "No"] },
        { id: "property_type", label: "Type of property", type: "select", options: ["Not applicable", "Residential house", "Agricultural land", "Commercial property"] },
        { id: "property_value", label: "Estimated current value (PKR)", type: "number", placeholder: "e.g. 3500000" },
      ],
    },
  ],
  housing: [
    {
      title: "Current Housing",
      note: "Describe your current living situation.",
      fields: [
        { id: "housing_type", label: "Housing type", type: "select", options: ["Owned (fully paid)", "Owned (mortgaged)", "Rented", "Employer provided"] },
        { id: "monthly_rent", label: "Monthly rent (PKR, if renting)", type: "number", placeholder: "0 if not renting" },
      ],
    },
  ],
  taxes: [
    {
      title: "Tax Filing",
      note: "Tax registration information.",
      fields: [
        { id: "is_filer", label: "Is the primary earner a registered tax filer?", type: "radio", options: ["Yes", "No", "Not sure"] },
        { id: "annual_tax_paid", label: "Annual tax paid (PKR)", type: "number", placeholder: "0 if not applicable" },
      ],
    },
  ],
  expenses: [
    {
      title: "Household Expenses",
      note: "Monthly family expenses.",
      fields: [
        { id: "exp_food", label: "Food & groceries (PKR/month)", type: "number", placeholder: "18000" },
        { id: "exp_utilities", label: "Utilities (electricity/gas/water)", type: "number", placeholder: "7000" },
        { id: "exp_transport", label: "Transport & fuel (PKR/month)", type: "number", placeholder: "3000" },
      ],
    },
  ],
  loans: [
    {
      title: "Loans & Debts",
      note: "Family loan details.",
      fields: [
        { id: "has_loans", label: "Does the family have outstanding loans?", type: "radio", options: ["Yes", "No"] },
        { id: "loan1_monthly", label: "Monthly loan repayment (PKR)", type: "number", placeholder: "0 if no loans" },
      ],
    },
  ],
  dependents: [
    {
      title: "Dependents",
      note: "Family members supported.",
      fields: [
        { id: "dep_siblings_school", label: "Number of siblings in school", type: "number", placeholder: "2" },
        { id: "dep_siblings_university", label: "Number of siblings in university", type: "number", placeholder: "1" },
      ],
    },
  ],
  education: [
    {
      title: "Education Costs",
      note: "Your educational fees.",
      fields: [
        { id: "current_school", label: "School name", type: "text", placeholder: "Lahore Grammar School" },
        { id: "annual_fee", label: "Annual tuition fee (PKR)", type: "number", placeholder: "96000" },
        { id: "monthly_fee", label: "Monthly fee (PKR)", type: "number", placeholder: "8000" },
      ],
    },
  ],
  travel: [
    {
      title: "Travel & Misc",
      note: "Travel costs to school.",
      fields: [
        { id: "monthly_travel_cost", label: "Monthly travel cost (PKR)", type: "number", placeholder: "1800" },
      ],
    },
  ],
};

const SAMPLE_APP_DATA: ApplicationData = {
  fullName: "Sara Ahmed",
  preferredName: "Sara",
  dob: "15/03/2007",
  gender: "Female",
  citizenship: "Pakistan",
  passportNumber: "PK-987654321",
  email: "sara.ahmed@example.com",
  phone: "+92 300 1234567",
  emergencyContact: "Tariq Ahmed (Father) — +92 300 9876543",
  address: "House 45, Street 12, Gulberg III, Lahore, District Lahore, Punjab, 54000",
  schoolName: "Lahore Grammar School",
  currentGrade: "Grade 11 (FSc / AS-Level)",
  graduationYear: "2026",
  gpa: "Grade 9: 90%, Grade 10: 92%, Grade 11: 89%",
  gradingScale: "Percentage (%)",
  hasRepeatedGrade: "No",
  englishProficiency: "Advanced",
  intendedMajor: "Computer Science & International Relations",
  counselorName: "Mr. Tariq Mahmood (Vice Principal)",
  counselorEmail: "tariq.mahmood@lgs.edu.pk",
  parent1Name: "Tariq Ahmed (Father)",
  parent1Occupation: "Senior High School Teacher — Govt Education Dept",
  parent1Education: "Master's Degree",
  parent2Name: "Nadia Ahmed (Mother)",
  parent2Occupation: "Homemaker",
  parent2Education: "Bachelor's Degree",
  householdSize: "5 members (2 school-going siblings)",
  familyAbroadHistory: "No",
  primaryLanguage: "Urdu & English",
  klyesEssay1: "When our school debate team faced a sudden venue change in another city, team members were anxious. I organized emergency housing with alumni and rescheduled practice sessions, teaching me how resilience and proactive communication resolve unexpected cultural and logistical hurdles.",
  klyesEssay2: "Living with an international host family will allow me to share authentic local traditions, cuisine, and cultural values, while learning firsthand about host country civic life, high school traditions, and community volunteering.",
  hostFamilyLetter: "Dear Host Family,\n\nMy name is Sara and I am an 11th-grade student. In my free time, I love debating, reading historical fiction, and baking with my younger sister. My father is a high school teacher and my mother manages our home. I am eager to experience an international high school year, share my culture, and become an active member of your family and community!\n\nWarmly,\nSara",
  commonAppEssay: "Building a free online tutoring network during the pandemic showed me how technology bridges educational inequality in underserved communities...",
  targetUniversities: "1. Youth Exchange Program\n2. National University Program\n3. Leadership Fellowship",
  degreeType: "High School Exchange Program",
  applicationDeadlines: "Exchange Program: October 30; University Application: January 30",
  careerGoals: "Aspiring software engineer and public policy advocate working to enhance educational technology access across South Asia.",
};

const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: "act_1",
    name: "Student Government Association",
    organization: "Lahore Grammar School",
    role: "Vice President & Academics Head",
    description: "Organized peer tutoring network serving 120+ junior students. Led bi-weekly council meetings and student advocacy forums.",
    yearsInvolved: "Grade 11, 12",
    hoursPerWeek: "5",
    weeksPerYear: "32",
  },
  {
    id: "act_2",
    name: "High School Debate Team",
    organization: "National Parliamentary Debate Circuit",
    role: "Team Captain & Primary Speaker",
    description: "Competed in 8 national tournaments. Mentored 15 junior debaters in research, rebuttal techniques, and public speaking.",
    yearsInvolved: "Grade 9, 10, 11, 12",
    hoursPerWeek: "6",
    weeksPerYear: "28",
  },
];

const SAMPLE_HONORS: HonorItem[] = [
  {
    id: "hon_1",
    title: "National Science Olympiad — 2nd Place",
    organization: "Pakistan Science Foundation",
    level: "National",
    yearReceived: "2025 (Grade 11)",
    description: "Awarded silver medal out of 1,500+ participants nationwide for algorithmic problem solving and physics paper.",
  },
  {
    id: "hon_2",
    title: "Principal's High Honor Roll",
    organization: "Lahore Grammar School",
    level: "School",
    yearReceived: "2023, 2024, 2025",
    description: "Maintained top 5% academic rank across all semesters in High School.",
  },
];

const SAMPLE_FA_DATA: Record<string, FinancialFormData> = {
  family: { applicant_name: "Sara Ahmed", applicant_dob: "15/03/2007", father_name: "Tariq Ahmed", father_status: "Living", father_occupation: "School Teacher", mother_name: "Nadia Ahmed", mother_status: "Living", mother_occupation: "Homemaker" },
  income: {
    father_salary: "45000",
    father_business_income: "0",
    mother_salary: "0",
    additionalIncomes: [
      { id: "inc_1", sourceName: "Freelance Tutoring", type: "Freelance / Tutoring", amount: "12000" }
    ]
  },
  bank: {
    bank1_name: "HBL",
    bank1_type: "Savings",
    bank1_balance: "35000",
    additionalBanks: [
      { id: "bnk_1", bankName: "Meezan Bank", accountType: "Islamic Account", holder: "Father", balance: "18000" }
    ]
  },
  assets: { owns_property: "Yes", property_type: "Residential house", property_value: "3500000" },
  housing: { housing_type: "Owned (fully paid)", monthly_rent: "0" },
  taxes: { is_filer: "Yes", annual_tax_paid: "0" },
  expenses: {
    exp_food: "18000",
    exp_utilities: "7000",
    exp_transport: "3000",
    customNotes: [
      {
        id: "note_sample_1",
        title: "Medical & Health Expense Clarification",
        value: "PKR 5,000 / month",
        description: "Grandmother's ongoing prescription medication and monthly health checkups at local clinic."
      }
    ]
  },
  loans: { has_loans: "No", loan1_monthly: "0" },
  dependents: { dep_siblings_school: "2", dep_siblings_university: "1" },
  education: { current_school: "Lahore Grammar School", annual_fee: "96000", monthly_fee: "8000" },
  travel: { monthly_travel_cost: "1800" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAppProgress(appStatus: Record<string, SectionStatus>) {
  const keys = APP_SECTIONS.map(s => s.id);
  const done = keys.filter(k => appStatus[k] === "complete").length;
  return Math.round((done / keys.length) * 100);
}

function calcFaProgress(faModules: Record<string, ModuleState>) {
  const done = FA_MODULES.filter(m => faModules[m.id]?.status === "complete").length;
  return Math.round((done / FA_MODULES.length) * 100);
}

function calcActivitiesProgress(status: SectionStatus, activities: ActivityItem[], honors: HonorItem[]) {
  if (status === "complete") return 100;
  if (activities.length > 0 || honors.length > 0) return 60;
  return 0;
}

function calcDocProgress(docs: DocumentItem[]) {
  const applicable = docs.filter(d => d.status !== "not-applicable");
  const ready = applicable.filter(d => d.status === "ready").length;
  return applicable.length > 0 ? Math.round((ready / applicable.length) * 100) : 0;
}

function calcOverallProgress(state: AppState) {
  const p1 = calcAppProgress(state.appSectionStatus);
  const p2 = calcFaProgress(state.faModules);
  const p3 = calcActivitiesProgress(state.activitiesStatus, state.activities, state.honors);
  const p4 = calcDocProgress(state.documents);
  return Math.round((p1 + p2 + p3 + p4) / 4);
}

function generateAndDownloadPDF(state: AppState, filenameSuffix = "Practice_Progress") {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 45;

    const checkOverflow = (heightNeeded = 25) => {
      if (y + heightNeeded > pageHeight - margin) {
        doc.addPage();
        y = 45;
      }
    };

    // Header Banner
    doc.setFillColor(54, 54, 54);
    doc.rect(margin, y, pageWidth - margin * 2, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("READY TO APPLY — PRACTICE APPLICATION SUMMARY", margin + 15, y + 20);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("PRACTICE DOCUMENT — NOT AN OFFICIAL APPLICATION", margin + 15, y + 34);

    y += 60;

    // Metadata line
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8.5);
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Generated: ${dateStr}  |  Youth Awareness Network Initiative (readytoapply.org)`, margin, y);
    y += 15;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    // Preparation Readiness Summary Card
    const overall = calcOverallProgress(state);
    const appProg = calcAppProgress(state.appSectionStatus);
    const faProg = calcFaProgress(state.faModules);
    const actProg = calcActivitiesProgress(state.activitiesStatus, state.activities, state.honors);
    const docProg = calcDocProgress(state.documents);

    doc.setFillColor(248, 248, 248);
    doc.rect(margin, y, pageWidth - margin * 2, 45, "F");
    doc.setDrawColor(215, 215, 215);
    doc.rect(margin, y, pageWidth - margin * 2, 45, "S");

    doc.setTextColor(54, 54, 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`Overall Preparation Readiness: ${overall}% Complete`, margin + 15, y + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Application: ${appProg}%  |  Financial Aid: ${faProg}%  |  Activities: ${actProg}%  |  Checklist: ${docProg}%`, margin + 15, y + 35);

    y += 60;

    // SECTION 1: APPLICATION PROFILE
    checkOverflow(80);
    doc.setFillColor(54, 54, 54);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.rect(margin, y, pageWidth - margin * 2, 20, "F");
    doc.text("1. APPLICATION PRACTICE PROFILE (EXCHANGE PROGRAM & UNIVERSITY STANDARD)", margin + 10, y + 14);
    y += 30;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);

    const appFields = [
      ["Full Legal Name:", state.appData.fullName || "Not specified"],
      ["Date of Birth:", state.appData.dob || "Not specified"],
      ["Citizenship & Nationality:", state.appData.citizenship || "Not specified"],
      ["Passport / CNIC Number:", state.appData.passportNumber || "Not specified"],
      ["Email Address:", state.appData.email || "Not specified"],
      ["Mobile Number:", state.appData.phone || "Not specified"],
      ["Emergency Contact:", state.appData.emergencyContact || "Not specified"],
      ["Current High School / College:", state.appData.schoolName || "Not specified"],
      ["Current Grade Level:", state.appData.currentGrade || "Not specified"],
      ["Past 3 Years Marks/GPA:", state.appData.gpa || "Not specified"],
      ["English Proficiency Level:", state.appData.englishProficiency || "Not specified"],
      ["Teacher Referee / Counselor:", `${state.appData.counselorName || "Not specified"} (${state.appData.counselorEmail || ""})`],
      ["Target Exchange & Universities:", state.appData.targetUniversities || "Not specified"],
    ];

    appFields.forEach(([label, val]) => {
      checkOverflow(16);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      const splitVal = doc.splitTextToSize(val, pageWidth - margin * 2 - 180);
      doc.text(splitVal, margin + 175, y);
      y += 14 * Math.max(1, splitVal.length);
    });

    // Essays
    const essays = [
      ["Exchange Essay 1 (Cultural Exchange & Adaptability):", state.appData.klyesEssay1],
      ["Exchange Essay 2 (Host Family & Culture):", state.appData.klyesEssay2],
      ["Host Family Introductory Letter Draft:", state.appData.hostFamilyLetter],
      ["Personal Statement Main Essay Draft:", state.appData.commonAppEssay],
    ];

    essays.forEach(([title, body]) => {
      if (!body) return;
      y += 8;
      checkOverflow(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(54, 54, 54);
      doc.text(title, margin, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      const splitBody = doc.splitTextToSize(body, pageWidth - margin * 2 - 20);
      splitBody.forEach((line: string) => {
        checkOverflow(12);
        doc.text(line, margin + 10, y);
        y += 11;
      });
    });

    y += 15;

    // SECTION 2: FINANCIAL AID PRACTICE
    checkOverflow(80);
    doc.setFillColor(54, 54, 54);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.rect(margin, y, pageWidth - margin * 2, 20, "F");
    doc.text("2. FINANCIAL AID PRACTICE SUMMARY", margin + 10, y + 14);
    y += 30;

    const incData = state.faModules["income"]?.data ?? {};
    const bankData = state.faModules["bank"]?.data ?? {};
    const faFields = [
      ["Father's Monthly Salary:", `PKR ${incData.father_salary || "0"}`],
      ["Father's Business Income:", `PKR ${incData.father_business_income || "0"}`],
      ["Mother's Monthly Salary:", `PKR ${incData.mother_salary || "0"}`],
      ["Primary Bank Account:", `${bankData.bank1_name || "N/A"} (${bankData.bank1_type || "N/A"}) — PKR ${bankData.bank1_balance || "0"}`],
    ];

    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    faFields.forEach(([label, val]) => {
      checkOverflow(16);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, margin + 175, y);
      y += 14;
    });

    if (incData.additionalIncomes && Array.isArray(incData.additionalIncomes) && incData.additionalIncomes.length > 0) {
      y += 6;
      checkOverflow(20);
      doc.setFont("helvetica", "bold");
      doc.text("Additional Income Sources:", margin, y);
      y += 14;
      incData.additionalIncomes.forEach((inc: any) => {
        checkOverflow(14);
        doc.setFont("helvetica", "normal");
        doc.text(`• ${inc.sourceName} (${inc.type}) — PKR ${inc.amount}/mo`, margin + 15, y);
        y += 13;
      });
    }

    if (bankData.additionalBanks && Array.isArray(bankData.additionalBanks) && bankData.additionalBanks.length > 0) {
      y += 6;
      checkOverflow(20);
      doc.setFont("helvetica", "bold");
      doc.text("Additional Bank Accounts:", margin, y);
      y += 14;
      bankData.additionalBanks.forEach((bnk: any) => {
        checkOverflow(14);
        doc.setFont("helvetica", "normal");
        doc.text(`• ${bnk.bankName} (${bnk.accountType}, ${bnk.holder}) — PKR ${bnk.balance}`, margin + 15, y);
        y += 13;
      });
    }

    y += 15;

    // SECTION 3: ACTIVITIES & HONORS
    checkOverflow(80);
    doc.setFillColor(54, 54, 54);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.rect(margin, y, pageWidth - margin * 2, 20, "F");
    doc.text("3. ACTIVITIES & AWARDS SUMMARY", margin + 10, y + 14);
    y += 30;

    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    if (state.activities.length === 0) {
      checkOverflow(16);
      doc.setFont("helvetica", "normal");
      doc.text("No activities entered yet.", margin, y);
      y += 14;
    } else {
      state.activities.forEach((a, i) => {
        checkOverflow(25);
        doc.setFont("helvetica", "bold");
        doc.text(`[Activity ${i + 1}] ${a.name} — ${a.role} (${a.organization})`, margin, y);
        y += 13;
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(a.description, pageWidth - margin * 2 - 20);
        descLines.forEach((line: string) => {
          checkOverflow(12);
          doc.text(line, margin + 10, y);
          y += 11;
        });
        y += 4;
      });
    }

    y += 15;

    // SECTION 4: DOCUMENT CHECKLIST STATUS
    checkOverflow(80);
    doc.setFillColor(54, 54, 54);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.rect(margin, y, pageWidth - margin * 2, 20, "F");
    doc.text("4. DOCUMENT CHECKLIST STATUS", margin + 10, y + 14);
    y += 30;

    doc.setFontSize(8);
    state.documents.forEach(d => {
      checkOverflow(14);
      const tag = d.status === "ready" ? "[READY]" : d.status === "need-to-get" ? "[NEED TO GET]" : d.status === "not-applicable" ? "[N/A]" : "[UNCHECKED]";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(d.status === "ready" ? 0 : d.status === "need-to-get" ? 180 : 120, d.status === "ready" ? 120 : 0, 0);
      doc.text(tag, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(d.label, margin + 85, y);
      y += 13;
    });

    y += 20;
    checkOverflow(35);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("EDUCATIONAL PRACTICE DISCLAIMER:", margin, y);
    y += 11;
    doc.setFont("helvetica", "normal");
    doc.text("This document is generated by Ready To Apply for self-assessment and practice purposes only. It is NOT an official college, exchange program, or financial aid application.", margin, y);

    doc.save(`Ready_To_Apply_${filenameSuffix}.pdf`);
  } catch (err) {
    console.error("PDF Generation error:", err);
  }
}

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem("rta_state") || localStorage.getItem("fap_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        appData: parsed.appData ?? {},
        appSectionStatus: parsed.appSectionStatus ?? {},
        faModules: parsed.faModules ?? parsed.modules ?? {},
        activities: parsed.activities ?? [],
        honors: parsed.honors ?? [],
        activitiesStatus: parsed.activitiesStatus ?? "not-started",
        documents: parsed.documents && parsed.documents.length >= 10 ? parsed.documents : COMPREHENSIVE_DOCUMENTS,
        activeFaModule: parsed.activeFaModule ?? null,
        isSample: parsed.isSample ?? false,
      };
    }
  } catch {}

  const faModules: Record<string, ModuleState> = {};
  FA_MODULES.forEach(m => { faModules[m.id] = { id: m.id, status: "not-started", data: {} }; });

  return {
    appData: {},
    appSectionStatus: {},
    faModules,
    activities: [],
    honors: [],
    activitiesStatus: "not-started",
    documents: COMPREHENSIVE_DOCUMENTS,
    activeFaModule: null,
    isSample: false,
  };
}

function saveAppState(state: AppState) {
  try {
    localStorage.setItem("rta_state", JSON.stringify(state));
  } catch {}
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Logo({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${small ? "" : "gap-3"}`}>
      <svg width={small ? "24" : "30"} height={small ? "24" : "30"} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="18" height="24" rx="1.5" stroke="#363636" strokeWidth="1.5" fill="none"/>
        <line x1="8" y1="8" x2="18" y2="8" stroke="#363636" strokeWidth="1.2"/>
        <line x1="8" y1="12" x2="18" y2="12" stroke="#363636" strokeWidth="1.2"/>
        <line x1="8" y1="16" x2="14" y2="16" stroke="#363636" strokeWidth="1.2"/>
        <polyline points="14,20 17,23 24,15" stroke="#363636" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <div>
        <div className={`font-bold leading-none text-[#363636] ${small ? "text-sm" : "text-base"}`}>
          Ready To Apply
        </div>
        {!small && (
          <a
            href="https://youthawarenessnetwork.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-gray-500 hover:text-[#363636] transition-colors font-medium mt-1 block"
          >
            A YAN Initiative ↗
          </a>
        )}
      </div>
    </div>
  );
}

function PracticeBadge() {
  return (
    <span className="text-xs font-semibold text-gray-500">
      (Practice Only)
    </span>
  );
}

function PrivacyBanner() {
  return (
    <div className="bg-[#363636]/[0.02] border border-gray-200 rounded-xl p-4 text-xs md:text-sm text-gray-700 flex gap-3 items-start shadow-xs">
      <svg className="mt-0.5 shrink-0 opacity-70" width="16" height="16" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5L1.5 4v3.5c0 3 2.5 5.5 5.5 6.5 3-1 5.5-3.5 5.5-6.5V4L7 1.5z" stroke="#363636" strokeWidth="1.2" fill="none"/>
      </svg>
      <span>
        <strong>Local & Private:</strong> Your practice information stays on this device. Ready To Apply does not require an account or transmit sensitive financial or personal data to any server.
      </span>
    </div>
  );
}

interface CustomNoteItem {
  id: string;
  title: string;
  value?: string;
  description: string;
}

function AdditionalModuleNotes({
  notes,
  onUpdateNotes,
}: {
  notes: CustomNoteItem[];
  onUpdateNotes: (updated: CustomNoteItem[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!title.trim() && !description.trim()) return;
    const item: CustomNoteItem = {
      id: "note_" + Date.now(),
      title: title.trim() || "Additional Information",
      value: value.trim(),
      description: description.trim(),
    };
    onUpdateNotes([...notes, item]);
    setTitle("");
    setValue("");
    setDescription("");
  };

  const handleRemove = (id: string) => {
    onUpdateNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#363636]">
            Additional Information &amp; Notes
          </h3>
          <p className="text-xs text-gray-500">
            Add custom details or explanations to clarify your information in this section.
          </p>
        </div>
        <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
          Click + to add details
        </span>
      </div>

      {notes.length > 0 && (
        <div className="space-y-3 mb-4">
          {notes.map(n => (
            <div key={n.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 text-xs">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <span className="font-bold text-[#363636]">{n.title}</span>
                  {n.value && <span className="ml-2 font-semibold text-gray-700">({n.value})</span>}
                </div>
                <button
                  onClick={() => handleRemove(n.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors font-bold text-xs shrink-0"
                  title="Remove note"
                >
                  ✕ Remove
                </button>
              </div>
              {n.description && (
                <p className="text-gray-600 text-xs leading-relaxed mt-1.5 bg-white/80 p-2.5 rounded border border-gray-200/70">
                  {n.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-gray-800">+ Add Custom Information / Note</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Information Title (e.g. Pension note, Clarification, Gap Year)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
          />
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Value / Amount / Status (optional)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
          />
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detailed description / explanation for better understanding..."
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#363636]"
        />
        <button
          onClick={handleAdd}
          className="bg-[#363636] text-white text-xs px-4 py-2 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
        >
          + Add Information
        </button>
      </div>
    </div>
  );
}

function Header({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [open, setOpen] = useState(false);

  const navLinks: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "App Practice", page: "app-practice" },
    { label: "Financial Aid", page: "fa-practice" },
    { label: "Activities", page: "activities-honors" },
    { label: "Checklist", page: "documents" },
    { label: "Final Review", page: "review" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <button onClick={() => setPage("home")} className="hover:opacity-80 transition-opacity text-left">
          <Logo small />
        </button>

        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map(n => (
            <button
              key={n.page}
              onClick={() => setPage(n.page)}
              className={`text-xs font-semibold transition-colors ${page === n.page ? "text-[#363636] underline underline-offset-4" : "text-gray-600 hover:text-[#363636]"}`}
            >
              {n.label}
            </button>
          ))}
          <button
            onClick={() => setPage("dashboard")}
            className="text-xs font-bold bg-[#363636] text-white px-5 py-2.5 rounded-lg hover:bg-black hover:shadow-md transition-all border border-[#363636] shadow-sm tracking-wide cursor-pointer"
          >
            Start Practice
          </button>
        </nav>

        <button
          className="lg:hidden flex flex-col gap-1.5 p-1.5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
        >
          <span className={`block w-5 h-0.5 bg-[#363636] transition-transform ${open ? "rotate-45 translate-y-2" : ""}`}/>
          <span className={`block w-5 h-0.5 bg-[#363636] transition-opacity ${open ? "opacity-0" : ""}`}/>
          <span className={`block w-5 h-0.5 bg-[#363636] transition-transform ${open ? "-rotate-45 -translate-y-2" : ""}`}/>
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-5 pb-5 pt-3 space-y-2">
          {navLinks.map(n => (
            <button
              key={n.page}
              onClick={() => { setPage(n.page); setOpen(false); }}
              className="block w-full text-left py-2 text-xs font-semibold text-gray-800 border-b border-gray-100 last:border-0"
            >
              {n.label}
            </button>
          ))}
          <button
            onClick={() => { setPage("dashboard"); setOpen(false); }}
            className="w-full mt-3 bg-[#363636] text-white text-xs py-2.5 font-bold rounded-lg hover:bg-black transition-all shadow-sm border border-[#363636] cursor-pointer"
          >
            Start Practice
          </button>
        </div>
      )}
    </header>
  );
}

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer className="border-t border-gray-200 mt-20 py-12 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16">
          <div className="flex-1">
            <Logo />
            <p className="mt-3 text-xs text-gray-600 leading-relaxed max-w-xs">
              Ready To Apply is an educational preparation platform helping students practice university and financial aid applications before submitting real ones.
            </p>
          </div>
          <nav className="flex gap-12 text-xs">
            <div>
              <div className="font-semibold text-gray-900 mb-3">Sections</div>
              <button onClick={() => setPage("app-practice")} className="block text-gray-600 hover:text-[#363636] mb-2">Application Practice</button>
              <button onClick={() => setPage("fa-practice")} className="block text-gray-600 hover:text-[#363636] mb-2">Financial Aid Practice</button>
              <button onClick={() => setPage("activities-honors")} className="block text-gray-600 hover:text-[#363636] mb-2">Activities & Honors</button>
              <button onClick={() => setPage("documents")} className="block text-gray-600 hover:text-[#363636] mb-2">Document Checklist</button>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-3">About</div>
              <div className="text-gray-600 mb-2">Privacy Policy</div>
              <a
                href="https://youthawarenessnetwork.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-[#363636] transition-colors mb-2"
              >
                Youth Awareness Network ↗
              </a>
              <div className="text-gray-600">Educational Tools</div>
            </div>
          </nav>
        </div>
        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Ready To Apply — A{" "}
            <a
              href="https://youthawarenessnetwork.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#363636] underline underline-offset-2 transition-colors font-medium"
            >
              Youth Awareness Network
            </a>{" "}
            Initiative.
          </div>
          <div>All practice data remains locally on your device.</div>
        </div>
      </div>
    </footer>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ setPage, onLoadSample }: { setPage: (p: Page) => void; onLoadSample: () => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-14">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold text-gray-500 mb-4">
            Youth Awareness Network Initiative
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#363636] leading-tight mb-5 tracking-tight">
            Practice before you apply.
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl">
            Ready To Apply is a dedicated preparation space where students practice every section of their university and financial aid applications before submitting real ones.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPage("dashboard")}
              className="bg-[#363636] text-white px-6 py-3 text-xs font-medium hover:bg-[#2a2a2a] transition-all rounded-lg shadow-xs"
            >
              Start Practicing
            </button>
            <button
              onClick={() => setPage("app-practice")}
              className="border border-gray-300 text-gray-700 px-6 py-3 text-xs font-medium hover:bg-gray-50 transition-all rounded-lg"
            >
              Application Practice
            </button>
            <button
              onClick={() => setPage("fa-practice")}
              className="border border-gray-300 text-gray-700 px-6 py-3 text-xs font-medium hover:bg-gray-50 transition-all rounded-lg"
            >
              Financial Aid Practice
            </button>
            <button
              onClick={onLoadSample}
              className="text-gray-600 px-3 py-2 text-xs hover:text-[#363636] transition-colors underline underline-offset-4"
            >
              Try a Sample Application
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t border-gray-200 bg-gray-50/70 py-14">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-xl font-bold text-[#363636] mb-8">
            Complete Practice Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Application Practice",
                desc: "Practice general college application sections — personal details, education, family background, and future plans.",
                action: () => setPage("app-practice"),
                label: "Practice Form",
              },
              {
                title: "Financial Aid Practice",
                desc: "Work through 11 financial modules including family income, bank accounts, expenses, taxes, and debts.",
                action: () => setPage("fa-practice"),
                label: "11 Modules",
              },
              {
                title: "Activities & Honors",
                desc: "Organize extracurricular achievements, leadership roles, time commitments, and national honors.",
                action: () => setPage("activities-honors"),
                label: "Activities Editor",
              },
              {
                title: "Document Checklist",
                desc: "Track academic transcripts, test score reports, identification, recommendation letters, and tax records.",
                action: () => setPage("documents"),
                label: "Checklist Tracker",
              },
            ].map((card, i) => (
              <div key={i} className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="inline-block text-[11px] font-bold text-[#363636] bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-md mb-3">0{i + 1}</div>
                  <h3 className="text-lg font-bold text-[#363636] mb-2">{card.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-6">{card.desc}</p>
                </div>
                <button
                  onClick={card.action}
                  className="text-xs font-semibold border border-gray-300 py-2.5 px-4 rounded-lg text-gray-800 hover:bg-[#363636] hover:text-white transition-all text-center"
                >
                  {card.label} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Practice Matters */}
      <section className="bg-[#363636] text-white py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Why practice before applying?</h2>
            <p className="text-white/80 text-sm leading-relaxed mb-8">
              College and financial aid applications require sensitive documents, detailed tax records, income figures, and concise descriptions of your achievements. Preparing in advance prevents mistakes, missing paperwork, and last-minute deadline stress.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                ["100% Free & Open", "No account required. No fees. No ads."],
                ["Private & Local", "All data is saved in your own browser storage."],
                ["Comprehensive", "Covers both general application and financial aid."],
                ["Exportable", "Download a summary document for offline reference."],
              ].map(([title, desc]) => (
                <div key={title} className="border border-white/20 rounded-lg p-4 bg-white/5">
                  <div className="font-bold text-white mb-1">{title}</div>
                  <div className="text-white/70 leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <PrivacyBanner />
      </section>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function Dashboard({
  state, setPage, onClearData
}: {
  state: AppState;
  setPage: (p: Page) => void;
  onClearData: () => void;
}) {
  const overall = calcOverallProgress(state);
  const appProg = calcAppProgress(state.appSectionStatus);
  const faProg = calcFaProgress(state.faModules);
  const actProg = calcActivitiesProgress(state.activitiesStatus, state.activities, state.honors);
  const docProg = calcDocProgress(state.documents);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-8">
        <div>
          {state.isSample && (
            <div className="text-xs font-medium text-gray-500 mb-2">
              Sample Data Active — Replace with your own details anytime
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#363636]">Practice Dashboard</h1>
          <p className="text-xs text-gray-600 mt-1">Track your progress across all 4 application preparation areas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage("review")}
            className="text-xs bg-[#363636] text-white px-4 py-2.5 font-medium hover:bg-[#2a2a2a] transition-all rounded-lg shadow-xs"
          >
            Final Review
          </button>
          <button
            onClick={onClearData}
            className="text-xs text-gray-500 hover:text-gray-900 px-2 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Overall score card */}
      <div className="border border-gray-200 bg-white rounded-xl p-6 md:p-8 mb-10 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Overall Preparation</div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-[#363636]">{overall}%</span>
              <span className="text-xs text-gray-600">complete readiness across all sections</span>
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <div className="h-2.5 bg-[#363636] transition-all duration-500 rounded-full" style={{ width: `${overall}%` }}/>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Feature Cards */}
      <div className="space-y-4 mb-10">
        {/* Card 1: Application Practice */}
        <div className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-bold text-gray-400">01</span>
              <h2 className="text-lg font-bold text-[#363636]">Application Practice</h2>
              <PracticeBadge />
            </div>
            <p className="text-xs text-gray-600">Personal Info, Education, Family Background, and Future Plans.</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div className="h-2 bg-[#363636] rounded-full" style={{ width: `${appProg}%` }}/>
              </div>
              <span className="text-xs font-semibold text-gray-700">{appProg}% Complete</span>
            </div>
          </div>
          <button
            onClick={() => setPage("app-practice")}
            className="text-xs border border-gray-300 text-gray-800 px-5 py-2.5 font-semibold rounded-lg hover:bg-[#363636] hover:text-white transition-all text-center shrink-0"
          >
            {appProg === 100 ? "Revisit Practice" : appProg > 0 ? "Continue Practice" : "Start Section"}
          </button>
        </div>

        {/* Card 2: Financial Aid Practice */}
        <div className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-bold text-gray-400">02</span>
              <h2 className="text-lg font-bold text-[#363636]">Financial Aid Practice</h2>
              <PracticeBadge />
            </div>
            <p className="text-xs text-gray-600">11 detailed financial modules — income, bank, taxes, expenses, property, loans, and tuition.</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div className="h-2 bg-[#363636] rounded-full" style={{ width: `${faProg}%` }}/>
              </div>
              <span className="text-xs font-semibold text-gray-700">{faProg}% Complete</span>
            </div>
          </div>
          <button
            onClick={() => setPage("fa-practice")}
            className="text-xs border border-gray-300 text-gray-800 px-5 py-2.5 font-semibold rounded-lg hover:bg-[#363636] hover:text-white transition-all text-center shrink-0"
          >
            {faProg === 100 ? "Revisit Modules" : faProg > 0 ? "Continue Modules" : "Start Modules"}
          </button>
        </div>

        {/* Card 3: Activities & Honors */}
        <div className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-bold text-gray-400">03</span>
              <h2 className="text-lg font-bold text-[#363636]">Activities & Honors</h2>
              <PracticeBadge />
            </div>
            <p className="text-xs text-gray-600">Extracurricular list, leadership roles, time commitments, and awards & honors.</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div className="h-2 bg-[#363636] rounded-full" style={{ width: `${actProg}%` }}/>
              </div>
              <span className="text-xs font-semibold text-gray-700">
                {state.activities.length} Activities, {state.honors.length} Honors
              </span>
            </div>
          </div>
          <button
            onClick={() => setPage("activities-honors")}
            className="text-xs border border-gray-300 text-gray-800 px-5 py-2.5 font-semibold rounded-lg hover:bg-[#363636] hover:text-white transition-all text-center shrink-0"
          >
            Edit Activities
          </button>
        </div>

        {/* Card 4: Document Checklist */}
        <div className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-bold text-gray-400">04</span>
              <h2 className="text-lg font-bold text-[#363636]">Document Checklist</h2>
            </div>
            <p className="text-xs text-gray-600">Academic, Personal, Application, and Financial Aid paperwork tracking.</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div className="h-2 bg-[#363636] rounded-full" style={{ width: `${docProg}%` }}/>
              </div>
              <span className="text-xs font-semibold text-gray-700">{docProg}% Documents Ready</span>
            </div>
          </div>
          <button
            onClick={() => setPage("documents")}
            className="text-xs border border-gray-300 text-gray-800 px-5 py-2.5 font-semibold rounded-lg hover:bg-[#363636] hover:text-white transition-all text-center shrink-0"
          >
            Update Checklist
          </button>
        </div>

        {/* Card 5: Final Review */}
        <div className="border border-gray-300 bg-gray-50/60 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="inline-block text-[11px] font-bold text-[#363636] bg-gray-200 border border-gray-300 px-2 py-0.5 rounded">05</span>
              <h2 className="text-lg font-bold text-[#363636]">Final Review & Summary</h2>
            </div>
            <p className="text-xs text-gray-700">Review full application summary, check missing paperwork, and download practice document.</p>
          </div>
          <button
            onClick={() => setPage("review")}
            className="text-xs bg-[#363636] text-white px-6 py-3 font-medium rounded-lg hover:bg-[#2a2a2a] transition-all text-center shrink-0 shadow-xs"
          >
            Open Final Review →
          </button>
        </div>
      </div>

      <PrivacyBanner />
    </div>
  );
}

// ─── Application Practice Module ──────────────────────────────────────────────

function ApplicationPracticeModule({
  appData, appStatus, onSave, onBack
}: {
  appData: ApplicationData;
  appStatus: Record<string, SectionStatus>;
  onSave: (data: ApplicationData, status: Record<string, SectionStatus>) => void;
  onBack: () => void;
}) {
  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const [formData, setFormData] = useState<ApplicationData>(appData);
  const [secStatus, setSecStatus] = useState<Record<string, SectionStatus>>(appStatus);

  const sec = APP_SECTIONS[activeSecIdx];
  const isLast = activeSecIdx === APP_SECTIONS.length - 1;
  const isFirst = activeSecIdx === 0;

  const handleChange = (fieldId: string, val: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleNext = () => {
    const updatedStatus = { ...secStatus, [sec.id]: "complete" as SectionStatus };
    setSecStatus(updatedStatus);
    onSave(formData, updatedStatus);
    if (!isLast) {
      setActiveSecIdx(i => i + 1);
    }
  };

  const handleSaveOnly = () => {
    const updatedStatus = { ...secStatus, [sec.id]: "in-progress" as SectionStatus };
    setSecStatus(updatedStatus);
    onSave(formData, updatedStatus);
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <button onClick={onBack} className="text-xs font-semibold text-gray-600 hover:text-[#363636] flex items-center gap-1.5 mb-6 transition-colors">
        ← Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-[#363636]">
              Application Practice
            </h1>
            <PracticeBadge />
          </div>
          <p className="text-xs text-gray-600">Practice authentic fields from Exchange Programs and University applications.</p>
        </div>
        <div className="text-xs font-semibold text-gray-500 self-start md:self-auto">
          Section {activeSecIdx + 1} of {APP_SECTIONS.length}
        </div>
      </div>

      {/* Real Application Standard Guidance Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-700 space-y-1">
        <div className="font-bold text-[#363636]">
          Real Application Preparation Mode — Exchange Program &amp; University Standard
        </div>
        <p className="text-gray-600 leading-relaxed">
          These practice fields are modeled after famous real applications including <strong>International Exchange Programs</strong>, <strong>University Applications</strong>, and <strong>Scholarship Fellowships</strong>. Practice entering past 3 years marksheets, teacher referee details, cultural adaptability essays, and host family letters so you are 100% prepared with required thoughts and paperwork before submitting the actual application!
        </p>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-gray-200 pb-px mb-8">
        {APP_SECTIONS.map((s, idx) => {
          const st = secStatus[s.id] ?? "not-started";
          const isActive = idx === activeSecIdx;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSecIdx(idx)}
              className={`text-xs px-4 py-2.5 font-semibold shrink-0 border-b-2 transition-all ${
                isActive ? "border-[#363636] text-[#363636]" : "border-transparent text-gray-500 hover:text-[#363636]"
              }`}
            >
              {s.title} {st === "complete" ? "✓" : ""}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 mb-8 shadow-xs">
        <h2 className="text-xl font-bold text-[#363636] mb-1">
          {sec.title}
        </h2>
        <p className="text-xs text-gray-600 mb-8">{sec.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sec.fields.map(f => {
            const val = (formData[f.id as keyof ApplicationData] as string) ?? "";
            const isFullWidth = f.type === "textarea";
            return (
              <div key={f.id} className={isFullWidth ? "md:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-[#363636] mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === "text" || f.type === "number" ? (
                  <input
                    type={f.type}
                    value={val}
                    onChange={e => handleChange(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white placeholder:text-gray-400"
                  />
                ) : f.type === "select" ? (
                  <select
                    value={val}
                    onChange={e => handleChange(f.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white"
                  >
                    <option value="">Select option</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={val}
                    onChange={e => handleChange(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white resize-none placeholder:text-gray-400"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Additional Module Notes & Information */}
        <AdditionalModuleNotes
          notes={((formData as any)[sec.id + "_customNotes"] as CustomNoteItem[]) ?? []}
          onUpdateNotes={(updated) => handleChange(sec.id + "_customNotes", updated as any)}
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        {!isFirst && (
          <button
            onClick={() => setActiveSecIdx(i => i - 1)}
            className="border border-gray-300 text-gray-700 text-xs px-5 py-2.5 font-semibold rounded-lg hover:bg-gray-50 transition-all"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSaveOnly}
          className="border border-gray-300 text-gray-700 text-xs px-4 py-2.5 font-medium rounded-lg hover:bg-gray-50 transition-all"
        >
          Save Draft &amp; Export PDF
        </button>
        <button
          onClick={handleNext}
          className="ml-auto bg-[#363636] text-white text-xs px-6 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
        >
          {isLast ? "Complete Section & Export PDF" : "Save & Continue (PDF) →"}
        </button>
      </div>
    </div>
  );
}

// ─── Financial Aid Practice Module ────────────────────────────────────────────

function FinancialAidModule({
  faModules, onUpdateModule, onBack
}: {
  faModules: Record<string, ModuleState>;
  onUpdateModule: (id: string, data: FinancialFormData, status: SectionStatus) => void;
  onBack: () => void;
}) {
  const [selectedModId, setSelectedModId] = useState<string>("family");
  const [stepIdx, setStepIdx] = useState(0);

  const mod = FA_MODULES.find(m => m.id === selectedModId)!;
  const steps = FA_MODULE_STEPS[selectedModId] ?? [];
  const step = steps[stepIdx] ?? steps[0];

  const [formData, setFormData] = useState<FinancialFormData>(() => ({
    ...faModules[selectedModId]?.data ?? {},
  }));

  useEffect(() => {
    setFormData(faModules[selectedModId]?.data ?? {});
    setStepIdx(0);
  }, [selectedModId, faModules]);

  const setValue = (id: string, val: string) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  // Dynamic extra income states
  const [newIncName, setNewIncName] = useState("");
  const [newIncType, setNewIncType] = useState("Freelance / Tutoring");
  const [newIncAmount, setNewIncAmount] = useState("");

  // Dynamic extra bank account states
  const [newBankName, setNewBankName] = useState("");
  const [newBankType, setNewBankType] = useState("Savings Account");
  const [newBankHolder, setNewBankHolder] = useState("Father");
  const [newBankBalance, setNewBankBalance] = useState("");

  const handleAddIncome = () => {
    if (!newIncName.trim() || !newIncAmount) return;
    const list = (formData.additionalIncomes as Array<any>) ?? [];
    const item = {
      id: "inc_" + Date.now(),
      sourceName: newIncName.trim(),
      type: newIncType,
      amount: newIncAmount,
    };
    const updated = [...list, item];
    setValue("additionalIncomes", updated as any);
    setNewIncName("");
    setNewIncAmount("");
  };

  const handleRemoveIncome = (id: string) => {
    const list = (formData.additionalIncomes as Array<any>) ?? [];
    const updated = list.filter((item: any) => item.id !== id);
    setValue("additionalIncomes", updated as any);
  };

  const handleAddBank = () => {
    if (!newBankName.trim() || !newBankBalance) return;
    const list = (formData.additionalBanks as Array<any>) ?? [];
    const item = {
      id: "bnk_" + Date.now(),
      bankName: newBankName.trim(),
      accountType: newBankType,
      holder: newBankHolder,
      balance: newBankBalance,
    };
    const updated = [...list, item];
    setValue("additionalBanks", updated as any);
    setNewBankName("");
    setNewBankBalance("");
  };

  const handleRemoveBank = (id: string) => {
    const list = (formData.additionalBanks as Array<any>) ?? [];
    const updated = list.filter((item: any) => item.id !== id);
    setValue("additionalBanks", updated as any);
  };

  const isLastStep = stepIdx === steps.length - 1;
  const isFirstStep = stepIdx === 0;

  const handleContinue = () => {
    onUpdateModule(selectedModId, formData, isLastStep ? "complete" : "in-progress");
    if (isLastStep) {
      const nextIdx = FA_MODULES.findIndex(m => m.id === selectedModId) + 1;
      if (nextIdx < FA_MODULES.length) {
        setSelectedModId(FA_MODULES[nextIdx].id);
      } else {
        onBack();
      }
    } else {
      setStepIdx(s => s + 1);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <button onClick={onBack} className="text-xs font-semibold text-gray-600 hover:text-[#363636] flex items-center gap-1 mb-6 transition-colors">
        ← Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-[#363636]">
              Financial Aid Practice
            </h1>
            <PracticeBadge />
          </div>
          <p className="text-xs text-gray-600">11 modules covering income, property, expenses, taxes, and debts.</p>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Progress: {calcFaProgress(faModules)}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar module list */}
        <div className="md:col-span-1 space-y-1.5">
          <div className="text-xs font-bold text-gray-800 mb-3">Modules</div>
          {FA_MODULES.map(m => {
            const st = faModules[m.id]?.status ?? "not-started";
            const isSel = m.id === selectedModId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModId(m.id)}
                className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg transition-all flex items-center justify-between border ${
                  isSel ? "border-[#363636] bg-[#363636] font-semibold text-white shadow-xs" : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{m.label}</span>
                {st === "complete" && <span>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Form area */}
        <div className="md:col-span-3 bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-xs">
          {/* Simple eyebrow step header without dots, pills, circles, or borders */}
          <div className="text-xs font-medium text-gray-500 mb-2">
            {mod.label} — Step {stepIdx + 1} of {steps.length || 1}
          </div>

          <h2 className="text-xl font-bold text-[#363636] mb-1">
            {step?.title ?? mod.label}
          </h2>
          <p className="text-xs text-gray-600 mb-8">{step?.note}</p>

          <div className="space-y-6 mb-8">
            {step?.fields.map(f => (
              <div key={f.id}>
                <label className="block text-xs font-semibold text-[#363636] mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === "text" || f.type === "number" ? (
                  <input
                    type={f.type}
                    value={(formData[f.id] as string) ?? ""}
                    onChange={e => setValue(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white placeholder:text-gray-400"
                  />
                ) : f.type === "select" ? (
                  <select
                    value={(formData[f.id] as string) ?? ""}
                    onChange={e => setValue(f.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white"
                  >
                    <option value="">Select option</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "radio" ? (
                  <div className="flex gap-4">
                    {f.options?.map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-xs text-gray-900 font-medium cursor-pointer">
                        <input
                          type="radio"
                          name={f.id}
                          value={o}
                          checked={formData[f.id] === o}
                          onChange={() => setValue(f.id, o)}
                          className="accent-[#363636]"
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* DYNAMIC SECTION FOR INCOME MODULE */}
          {selectedModId === "income" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#363636]">
                  Additional Income Sources
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  Add more incomes with + button
                </span>
              </div>

              {((formData.additionalIncomes as Array<any>) ?? []).length > 0 && (
                <div className="space-y-2 mb-4">
                  {((formData.additionalIncomes as Array<any>) ?? []).map((inc: any) => (
                    <div key={inc.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs">
                      <div>
                        <span className="font-bold text-[#363636]">{inc.sourceName}</span>
                        <span className="text-gray-500 ml-2">({inc.type})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">PKR {parseFloat(inc.amount || "0").toLocaleString()} / mo</span>
                        <button
                          onClick={() => handleRemoveIncome(inc.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors font-bold"
                          title="Remove income"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-gray-800">+ Add More Income</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newIncName}
                    onChange={e => setNewIncName(e.target.value)}
                    placeholder="Income Source (e.g. Rent, Freelance)"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  />
                  <select
                    value={newIncType}
                    onChange={e => setNewIncType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  >
                    <option value="Salary">Salary / Job</option>
                    <option value="Business">Business / Shop</option>
                    <option value="Rental Income">Rental Income</option>
                    <option value="Freelance / Tutoring">Freelance / Tutoring</option>
                    <option value="Agricultural Income">Agricultural Income</option>
                    <option value="Investments">Investments</option>
                    <option value="Family Support">Family Support</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="number"
                    value={newIncAmount}
                    onChange={e => setNewIncAmount(e.target.value)}
                    placeholder="Monthly Amount (PKR)"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  />
                </div>
                <button
                  onClick={handleAddIncome}
                  className="bg-[#363636] text-white text-xs px-4 py-2 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
                >
                  + Add Income Source
                </button>
              </div>

              {(() => {
                const fSal = parseFloat((formData.father_salary as string) || "0") || 0;
                const fBiz = parseFloat((formData.father_business_income as string) || "0") || 0;
                const mSal = parseFloat((formData.mother_salary as string) || "0") || 0;
                const addl = ((formData.additionalIncomes as Array<any>) ?? []).reduce(
                  (sum, item) => sum + (parseFloat(item.amount) || 0),
                  0
                );
                const total = fSal + fBiz + mSal + addl;
                return (
                  <div className="mt-4 p-3 bg-[#363636]/5 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Total Monthly Household Income:</span>
                    <span className="font-extrabold text-[#363636] text-sm">PKR {total.toLocaleString()}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* DYNAMIC SECTION FOR BANK MODULE */}
          {selectedModId === "bank" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#363636]">
                  Additional Bank Accounts
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  Add more bank accounts with + button
                </span>
              </div>

              {((formData.additionalBanks as Array<any>) ?? []).length > 0 && (
                <div className="space-y-2 mb-4">
                  {((formData.additionalBanks as Array<any>) ?? []).map((bnk: any) => (
                    <div key={bnk.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs">
                      <div>
                        <span className="font-bold text-[#363636]">{bnk.bankName}</span>
                        <span className="text-gray-500 ml-2">({bnk.accountType} — {bnk.holder})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">PKR {parseFloat(bnk.balance || "0").toLocaleString()}</span>
                        <button
                          onClick={() => handleRemoveBank(bnk.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors font-bold"
                          title="Remove bank account"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-gray-800">+ Add More Bank Account</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                    placeholder="Bank Name (e.g. Meezan, MCB)"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  />
                  <select
                    value={newBankType}
                    onChange={e => setNewBankType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  >
                    <option value="Savings Account">Savings Account</option>
                    <option value="Current Account">Current Account</option>
                    <option value="Islamic Account">Islamic Account</option>
                    <option value="Joint Account">Joint Account</option>
                    <option value="Fixed Deposit">Fixed Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                  <select
                    value={newBankHolder}
                    onChange={e => setNewBankHolder(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Student / Self">Student / Self</option>
                    <option value="Both Parents (Joint)">Both Parents (Joint)</option>
                    <option value="Other Guardian">Other Guardian</option>
                  </select>
                  <input
                    type="number"
                    value={newBankBalance}
                    onChange={e => setNewBankBalance(e.target.value)}
                    placeholder="Approx. Balance (PKR)"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
                  />
                </div>
                <button
                  onClick={handleAddBank}
                  className="bg-[#363636] text-white text-xs px-4 py-2 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
                >
                  + Add Bank Account
                </button>
              </div>

              {(() => {
                const primaryBal = parseFloat((formData.bank1_balance as string) || "0") || 0;
                const addl = ((formData.additionalBanks as Array<any>) ?? []).reduce(
                  (sum, item) => sum + (parseFloat(item.balance) || 0),
                  0
                );
                const total = primaryBal + addl;
                return (
                  <div className="mt-4 p-3 bg-[#363636]/5 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Total Family Bank Balance:</span>
                    <span className="font-extrabold text-[#363636] text-sm">PKR {total.toLocaleString()}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Additional Module Notes & Information (Available in ALL 11 Financial Aid Modules) */}
          <AdditionalModuleNotes
            notes={(formData.customNotes as CustomNoteItem[]) ?? []}
            onUpdateNotes={(updated) => setValue("customNotes", updated as any)}
          />

          <div className="flex items-center gap-3 pt-6 border-t border-gray-200 mt-8">
            {!isFirstStep && (
              <button
                onClick={() => setStepIdx(s => s - 1)}
                className="border border-gray-300 text-gray-700 text-xs px-5 py-2.5 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleContinue}
              className="ml-auto bg-[#363636] text-white text-xs px-6 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
            >
              {isLastStep ? "Complete Module" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activities & Honors Module ──────────────────────────────────────────────

function ActivitiesHonorsModule({
  activities, honors, onUpdate, onBack
}: {
  activities: ActivityItem[];
  honors: HonorItem[];
  onUpdate: (act: ActivityItem[], hon: HonorItem[], status: SectionStatus) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"activities" | "honors">("activities");
  const [actList, setActList] = useState<ActivityItem[]>(activities);
  const [honList, setHonList] = useState<HonorItem[]>(honors);

  const [newAct, setNewAct] = useState<Omit<ActivityItem, "id">>({
    name: "", organization: "", role: "", description: "", yearsInvolved: "", hoursPerWeek: "", weeksPerYear: ""
  });

  const [newHon, setNewHon] = useState<Omit<HonorItem, "id">>({
    title: "", organization: "", level: "School", yearReceived: "", description: ""
  });

  const addActivity = () => {
    if (!newAct.name.trim()) return;
    const item: ActivityItem = { id: "act_" + Date.now(), ...newAct };
    const updated = [...actList, item];
    setActList(updated);
    onUpdate(updated, honList, "in-progress");
    setNewAct({ name: "", organization: "", role: "", description: "", yearsInvolved: "", hoursPerWeek: "", weeksPerYear: "" });
  };

  const removeActivity = (id: string) => {
    const updated = actList.filter(a => a.id !== id);
    setActList(updated);
    onUpdate(updated, honList, "in-progress");
  };

  const addHonor = () => {
    if (!newHon.title.trim()) return;
    const item: HonorItem = { id: "hon_" + Date.now(), ...newHon };
    const updated = [...honList, item];
    setHonList(updated);
    onUpdate(actList, updated, "in-progress");
    setNewHon({ title: "", organization: "", level: "School", yearReceived: "", description: "" });
  };

  const removeHonor = (id: string) => {
    const updated = honList.filter(h => h.id !== id);
    setHonList(updated);
    onUpdate(actList, updated, "in-progress");
  };

  const handleComplete = () => {
    onUpdate(actList, honList, "complete");
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <button onClick={onBack} className="text-xs font-semibold text-gray-600 hover:text-[#363636] flex items-center gap-1 mb-6 transition-colors">
        ← Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-[#363636]">
              Activities & Honors Practice
            </h1>
            <PracticeBadge />
          </div>
          <p className="text-xs text-gray-600">Organize extracurricular achievements, leadership, hours, and awards.</p>
        </div>
        <button
          onClick={handleComplete}
          className="text-xs bg-[#363636] text-white px-5 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs self-start sm:self-auto"
        >
          Save & Mark Complete
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setTab("activities")}
          className={`text-xs px-6 py-2.5 font-bold border-b-2 transition-all ${
            tab === "activities" ? "border-[#363636] text-[#363636]" : "border-transparent text-gray-500 hover:text-[#363636]"
          }`}
        >
          Extracurricular Activities ({actList.length})
        </button>
        <button
          onClick={() => setTab("honors")}
          className={`text-xs px-6 py-2.5 font-bold border-b-2 transition-all ${
            tab === "honors" ? "border-[#363636] text-[#363636]" : "border-transparent text-gray-500 hover:text-[#363636]"
          }`}
        >
          Awards & Honors ({honList.length})
        </button>
      </div>

      {tab === "activities" && (
        <div className="space-y-8">
          {/* Add Activity Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#363636] mb-4">
              Add New Activity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Activity Name *</label>
                <input
                  type="text"
                  value={newAct.name}
                  onChange={e => setNewAct({ ...newAct, name: e.target.value })}
                  placeholder="e.g. Student Council, Debate Club"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Organization / School</label>
                <input
                  type="text"
                  value={newAct.organization}
                  onChange={e => setNewAct({ ...newAct, organization: e.target.value })}
                  placeholder="e.g. High School"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Role / Position</label>
                <input
                  type="text"
                  value={newAct.role}
                  onChange={e => setNewAct({ ...newAct, role: e.target.value })}
                  placeholder="e.g. President, Captain, Member"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Years / Grade Levels</label>
                <input
                  type="text"
                  value={newAct.yearsInvolved}
                  onChange={e => setNewAct({ ...newAct, yearsInvolved: e.target.value })}
                  placeholder="e.g. Grade 10, 11, 12"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Hours / Week</label>
                <input
                  type="text"
                  value={newAct.hoursPerWeek}
                  onChange={e => setNewAct({ ...newAct, hoursPerWeek: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Weeks / Year</label>
                <input
                  type="text"
                  value={newAct.weeksPerYear}
                  onChange={e => setNewAct({ ...newAct, weeksPerYear: e.target.value })}
                  placeholder="e.g. 30"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-800 mb-1">Activity Description</label>
                <textarea
                  value={newAct.description}
                  onChange={e => setNewAct({ ...newAct, description: e.target.value })}
                  placeholder="Describe your responsibilities, leadership actions, and accomplishments."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636] resize-none"
                />
              </div>
            </div>
            <button
              onClick={addActivity}
              className="bg-[#363636] text-white text-xs px-5 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
            >
              + Add Activity
            </button>
          </div>

          {/* Activity List */}
          <div className="space-y-4">
            {actList.map(a => (
              <div key={a.id} className="border border-gray-200 bg-white rounded-xl p-5 flex justify-between gap-4 shadow-xs">
                <div>
                  <div className="text-sm font-bold text-[#363636]">{a.name}</div>
                  <div className="text-xs text-gray-600 font-semibold mt-0.5">{a.role} — {a.organization}</div>
                  <div className="text-xs text-gray-700 mt-2 leading-relaxed">{a.description}</div>
                  <div className="text-[11px] text-gray-500 font-medium mt-3">
                    {a.yearsInvolved && `Years: ${a.yearsInvolved}`} {a.hoursPerWeek && `• ${a.hoursPerWeek} hrs/wk`} {a.weeksPerYear && `• ${a.weeksPerYear} wks/yr`}
                  </div>
                </div>
                <button
                  onClick={() => removeActivity(a.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800 shrink-0 self-start"
                >
                  Remove
                </button>
              </div>
            ))}
            {actList.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-xl">
                No activities added yet. Use the form above to practice adding your extracurricular activities.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "honors" && (
        <div className="space-y-8">
          {/* Add Honor Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#363636] mb-4">
              Add Award / Honor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Award / Honor Title *</label>
                <input
                  type="text"
                  value={newHon.title}
                  onChange={e => setNewHon({ ...newHon, title: e.target.value })}
                  placeholder="e.g. National Science Olympiad Medalist"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Awarding Organization</label>
                <input
                  type="text"
                  value={newHon.organization}
                  onChange={e => setNewHon({ ...newHon, organization: e.target.value })}
                  placeholder="e.g. High School, National Foundation"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Recognition Level</label>
                <select
                  value={newHon.level}
                  onChange={e => setNewHon({ ...newHon, level: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636] bg-white"
                >
                  <option value="School">School</option>
                  <option value="State / Regional">State / Regional</option>
                  <option value="National">National</option>
                  <option value="International">International</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Year Received</label>
                <input
                  type="text"
                  value={newHon.yearReceived}
                  onChange={e => setNewHon({ ...newHon, yearReceived: e.target.value })}
                  placeholder="e.g. 2025 (Grade 11)"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-800 mb-1">Description / Criteria</label>
                <textarea
                  value={newHon.description}
                  onChange={e => setNewHon({ ...newHon, description: e.target.value })}
                  placeholder="Briefly describe what this honor was awarded for."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#363636] resize-none"
                />
              </div>
            </div>
            <button
              onClick={addHonor}
              className="bg-[#363636] text-white text-xs px-5 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs"
            >
              + Add Award / Honor
            </button>
          </div>

          {/* Honors List */}
          <div className="space-y-4">
            {honList.map(h => (
              <div key={h.id} className="border border-gray-200 bg-white rounded-xl p-5 flex justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#363636]">{h.title}</span>
                    <span className="text-[11px] bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-gray-700 font-semibold rounded-md">{h.level}</span>
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">{h.organization} • {h.yearReceived}</div>
                  {h.description && <div className="text-xs text-gray-700 mt-2 leading-relaxed">{h.description}</div>}
                </div>
                <button
                  onClick={() => removeHonor(h.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800 shrink-0 self-start"
                >
                  Remove
                </button>
              </div>
            ))}
            {honList.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-xl">
                No awards or honors added yet. Use the form above to add honors.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comprehensive Document Checklist Module ──────────────────────────────────

function DocumentChecklistModule({
  docs, onUpdateDocs
}: {
  docs: DocumentItem[];
  onUpdateDocs: (docs: DocumentItem[]) => void;
}) {
  const docProg = calcDocProgress(docs);

  const categories: ("Academic Documents" | "Personal Documents" | "Application Documents" | "Financial Aid Documents")[] = [
    "Academic Documents",
    "Personal Documents",
    "Application Documents",
    "Financial Aid Documents",
  ];

  const [customDocLabel, setCustomDocLabel] = useState("");
  const [customDocCat, setCustomDocCat] = useState<DocumentItem["category"]>("Academic Documents");

  const setStatus = (id: string, status: DocumentItem["status"]) => {
    onUpdateDocs(docs.map(d => d.id === id ? { ...d, status } : d));
  };

  const handleAddCustomDoc = () => {
    if (!customDocLabel.trim()) return;
    const newDoc: DocumentItem = {
      id: "custom_" + Date.now(),
      label: customDocLabel.trim(),
      category: customDocCat,
      status: "ready",
    };
    onUpdateDocs([...docs, newDoc]);
    setCustomDocLabel("");
  };

  const handleRemoveCustomDoc = (id: string) => {
    onUpdateDocs(docs.filter(d => d.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#363636]">
            Document Checklist
          </h1>
          <p className="text-xs text-gray-600 mt-1">Track paperwork readiness across all application areas.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-[#363636]">{docProg}%</div>
          <div className="text-xs font-semibold text-gray-500">documents ready</div>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 mb-8">
        <div className="h-2 bg-[#363636] rounded-full transition-all duration-500" style={{ width: `${docProg}%` }}/>
      </div>

      {/* Add Custom / Other Document Form */}
      <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-5 mb-8 shadow-xs">
        <div className="text-xs font-bold text-gray-900 mb-1">Add Custom / Other Document</div>
        <p className="text-xs text-gray-600 mb-3">Use this feature button to specify any additional document required for your target institutions.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={customDocLabel}
            onChange={e => setCustomDocLabel(e.target.value)}
            placeholder="e.g. Past 3 Years Grade 9-11 Transcripts, Art Portfolio, Medical Certificate"
            className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
          />
          <select
            value={customDocCat}
            onChange={e => setCustomDocCat(e.target.value as DocumentItem["category"])}
            className="border border-gray-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#363636]"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleAddCustomDoc}
            className="bg-[#363636] text-white text-xs px-5 py-2.5 font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs shrink-0"
          >
            + Add Other Document
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-xs text-gray-700 font-medium items-center border-b border-gray-200 pb-4">
        <span className="font-bold text-gray-900">Status Legend:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#363636] rounded-full inline-block"/> Ready</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 border border-gray-400 rounded-full inline-block"/> Need to get</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 border border-gray-200 bg-gray-100 rounded-full inline-block"/> Not applicable</span>
      </div>

      <div className="space-y-8">
        {categories.map(cat => {
          const items = docs.filter(d => d.category === cat);
          return (
            <div key={cat} className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {cat}
              </h2>
              <div className="space-y-3">
                {items.map(d => {
                  const isCustom = d.id.startsWith("custom_");
                  return (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-900 font-medium">{d.label}</span>
                        {isCustom && <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 font-semibold rounded">Custom</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1.5">
                          {(["ready", "need-to-get", "not-applicable"] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => setStatus(d.id, d.status === s ? "unchecked" : s)}
                              className={`text-[11px] border px-3 py-1 font-semibold rounded-md transition-all ${
                                d.status === s
                                  ? s === "ready" ? "bg-[#363636] text-white border-[#363636]" : s === "need-to-get" ? "border-gray-800 text-gray-900 font-bold bg-gray-50" : "border-gray-300 text-gray-500 bg-gray-50"
                                  : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 bg-white"
                              }`}
                            >
                              {s === "ready" ? "Ready" : s === "need-to-get" ? "Need to get" : "N/A"}
                            </button>
                          ))}
                        </div>
                        {isCustom && (
                          <button
                            onClick={() => handleRemoveCustomDoc(d.id)}
                            className="text-[11px] font-medium text-red-600 hover:text-red-800 ml-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

// ─── Final Review Module ──────────────────────────────────────────────────────

function FinalReviewModule({
  state, setPage
}: {
  state: AppState;
  setPage: (p: Page) => void;
}) {
  const overall = calcOverallProgress(state);
  const appProg = calcAppProgress(state.appSectionStatus);
  const faProg = calcFaProgress(state.faModules);
  const actProg = calcActivitiesProgress(state.activitiesStatus, state.activities, state.honors);
  const docProg = calcDocProgress(state.documents);

  const missingDocs = state.documents.filter(d => d.status === "need-to-get");

  const handleDownloadSummary = () => {
    generateAndDownloadPDF(state, "Final_Practice_Summary");
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <h1 className="text-2xl font-extrabold text-[#363636] mb-1">
        Final Review
      </h1>
      <p className="text-xs text-gray-600 mb-8">Review preparation status across all 4 practice sections.</p>

      {/* Overall Score */}
      <div className="border border-gray-200 bg-white rounded-xl p-8 mb-10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200">
          <div>
            <div className="text-xs font-semibold text-gray-600">Preparation Readiness</div>
            <div className="text-xl font-extrabold text-[#363636] mt-1">
              {overall >= 80 ? "Fully Ready To Apply" : overall >= 50 ? "Almost Ready To Apply" : "In Preparation"}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-[#363636] text-white px-4 py-2 text-xs font-bold rounded-lg shadow-xs self-start sm:self-auto">
            Ready To Apply Score: {overall}%
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div className="h-2.5 bg-[#363636] rounded-full transition-all duration-500" style={{ width: `${overall}%` }}/>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          This preparation percentage is for self-assessment only and does not represent official university admission or financial aid decisions.
        </p>
      </div>

      {/* 4 Section Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {[
          {
            title: "Application Practice",
            prog: appProg,
            target: "app-practice" as Page,
            desc: "Personal info, school records, family, future plans",
          },
          {
            title: "Financial Aid Practice",
            prog: faProg,
            target: "fa-practice" as Page,
            desc: "Income, bank statements, housing, taxes, expenses",
          },
          {
            title: "Activities & Honors",
            prog: actProg,
            target: "activities-honors" as Page,
            desc: `${state.activities.length} activities, ${state.honors.length} honors entered`,
          },
          {
            title: "Document Checklist",
            prog: docProg,
            target: "documents" as Page,
            desc: `${docProg}% documents marked ready`,
          },
        ].map(s => (
          <div key={s.title} className="border border-gray-200 bg-white rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-[#363636]">{s.title}</h2>
                <span className={`text-xs px-2.5 py-0.5 font-bold rounded-full ${s.prog === 100 ? "bg-[#363636] text-white" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                  {s.prog === 100 ? "Complete" : `${s.prog}%`}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-4">{s.desc}</p>
            </div>
            <button
              onClick={() => setPage(s.target)}
              className="text-xs font-semibold border border-gray-300 py-2.5 px-4 rounded-lg text-gray-800 hover:bg-[#363636] hover:text-white transition-all text-center self-start w-full"
            >
              {s.prog === 100 ? "Revisit Section" : "Continue Section"} →
            </button>
          </div>
        ))}
      </div>

      {/* Missing documents warning if any */}
      {missingDocs.length > 0 && (
        <div className="border border-gray-200 bg-gray-50/70 rounded-xl p-6 mb-10 shadow-xs">
          <h2 className="text-xs font-bold text-gray-800 mb-3">
            Paperwork Still Needed ({missingDocs.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
            {missingDocs.map(d => (
              <div key={d.id}>• {d.label}</div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleDownloadSummary}
          className="bg-[#363636] text-white px-7 py-3 text-xs font-semibold rounded-lg hover:bg-[#2a2a2a] transition-all shadow-xs flex items-center gap-2"
        >
          <span>📄 Ready To Apply — Export PDF Practice Summary</span>
        </button>
        <button
          onClick={() => setPage("dashboard")}
          className="border border-gray-300 text-gray-800 px-6 py-3 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-all"
        >
          Back to Dashboard
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Summary will be marked: <strong>PRACTICE DOCUMENT — NOT AN OFFICIAL APPLICATION</strong>.
      </p>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [state, setState] = useState<AppState>(loadInitialState);

  const updateState = useCallback((updater: Partial<AppState> | ((s: AppState) => AppState)) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      saveAppState(next);
      return next;
    });
  }, []);

  const handleSaveApp = useCallback((appData: ApplicationData, appSectionStatus: Record<string, SectionStatus>) => {
    updateState(prev => {
      const next = { ...prev, appData, appSectionStatus };
      generateAndDownloadPDF(next, "Application_Practice_Progress");
      return next;
    });
  }, [updateState]);

  const handleUpdateFaModule = useCallback((id: string, data: FinancialFormData, status: SectionStatus) => {
    updateState(prev => {
      const next = {
        ...prev,
        faModules: {
          ...prev.faModules,
          [id]: { id, status, data, completedAt: status === "complete" ? new Date().toISOString() : prev.faModules[id]?.completedAt },
        },
      };
      generateAndDownloadPDF(next, "Financial_Aid_Progress");
      return next;
    });
  }, [updateState]);

  const handleUpdateActivities = useCallback((activities: ActivityItem[], honors: HonorItem[], activitiesStatus: SectionStatus) => {
    updateState(prev => {
      const next = { ...prev, activities, honors, activitiesStatus };
      generateAndDownloadPDF(next, "Activities_Honors_Progress");
      return next;
    });
  }, [updateState]);

  const handleUpdateDocs = useCallback((documents: DocumentItem[]) => {
    updateState({ documents });
  }, [updateState]);

  const handleLoadSample = useCallback(() => {
    const appSectionStatus: Record<string, SectionStatus> = {
      personal: "complete", education: "complete", family: "complete", future: "complete"
    };
    const faModules: Record<string, ModuleState> = {};
    FA_MODULES.forEach(m => {
      faModules[m.id] = { id: m.id, status: "complete", data: SAMPLE_FA_DATA[m.id] ?? {} };
    });
    const sampleDocs = COMPREHENSIVE_DOCUMENTS.map(d => ({
      ...d,
      status: "ready" as const,
    }));

    const sampleState: AppState = {
      appData: SAMPLE_APP_DATA,
      appSectionStatus,
      faModules,
      activities: SAMPLE_ACTIVITIES,
      honors: SAMPLE_HONORS,
      activitiesStatus: "complete",
      documents: sampleDocs,
      activeFaModule: null,
      isSample: true,
    };
    saveAppState(sampleState);
    setState(sampleState);
    setPage("dashboard");
  }, []);

  const handleClearData = useCallback(() => {
    if (!window.confirm("Clear all local practice data? This cannot be undone.")) return;
    localStorage.removeItem("rta_state");
    localStorage.removeItem("fap_state");
    const fresh = loadInitialState();
    setState(fresh);
    setPage("home");
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  return (
    <div className="min-h-screen bg-white text-[#363636] font-sans antialiased">
      <Header page={page} setPage={setPage} />

      <main>
        {page === "home" && <HomePage setPage={setPage} onLoadSample={handleLoadSample} />}
        {page === "dashboard" && <Dashboard state={state} setPage={setPage} onClearData={handleClearData} />}
        {page === "app-practice" && (
          <ApplicationPracticeModule
            appData={state.appData}
            appStatus={state.appSectionStatus}
            onSave={handleSaveApp}
            onBack={() => setPage("dashboard")}
          />
        )}
        {page === "fa-practice" && (
          <FinancialAidModule
            faModules={state.faModules}
            onUpdateModule={handleUpdateFaModule}
            onBack={() => setPage("dashboard")}
          />
        )}
        {page === "activities-honors" && (
          <ActivitiesHonorsModule
            activities={state.activities}
            honors={state.honors}
            onUpdate={handleUpdateActivities}
            onBack={() => setPage("dashboard")}
          />
        )}
        {page === "documents" && (
          <DocumentChecklistModule docs={state.documents} onUpdateDocs={handleUpdateDocs} />
        )}
        {page === "review" && <FinalReviewModule state={state} setPage={setPage} />}
      </main>

      <Footer setPage={setPage} />
    </div>
  );
}
