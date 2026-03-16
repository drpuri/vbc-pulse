// sources.ts — Content source definitions for VBC Pulse
// Refined based on CMO priorities: ACO operations, risk adjustment governance,
// quality/cost benchmarking, AI in VBC, and MA plan earnings intelligence.

export type Section =
  | "aco"
  | "risk-adjustment"
  | "quality-cost"
  | "ai-vbc"
  | "earnings"
  | "industry";

export interface Source {
  type: "rss" | "search_query" | "direct_url";
  url?: string;
  query?: string;
  label: string;
}

export interface SectionConfig {
  id: Section;
  name: string;
  description: string;
  sources: Source[];
  summarizerPrompt: string;
  feedbackAddendum?: string;
}

// ─── Section 1: ACO Programs ────────────────────────────────

const acoSection: SectionConfig = {
  id: "aco",
  name: "ACO Programs",
  description:
    "CMS rulemaking, benchmark methodology, shared savings performance, M&A/valuations, operational strategies",
  sources: [
    // RSS — high signal
    { type: "rss", url: "https://www.cms.gov/newsroom/rss-feeds", label: "CMS Newsroom" },
    { type: "rss", url: "https://www.naacos.com/feed", label: "NAACOS" },
    { type: "rss", url: "https://www.medpac.gov/feed/", label: "MedPAC" },

    // Substacks / newsletters
    { type: "rss", url: "https://hospitalogy.substack.com/feed", label: "Hospitalogy (Blake Madden)" },
    { type: "rss", url: "https://outofpocket.health/feed", label: "Out-of-Pocket (Nikhil Krishnan)" },
    { type: "rss", url: "https://thehealthcareblog.com/feed/", label: "The Health Care Blog" },
    { type: "rss", url: "https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff", label: "Health Affairs" },

    // Health Affairs coverage
    { type: "search_query", query: "Health Affairs ACO value-based care", label: "HA ACO/VBC" },

    // CMS policy + rulemaking
    { type: "search_query", query: "CMS MSSP ACO final rule 2026", label: "MSSP final rule" },
    { type: "search_query", query: "CMS ACO REACH model 2026 changes", label: "REACH updates" },
    { type: "search_query", query: "Medicare shared savings program benchmark methodology", label: "MSSP benchmarks" },
    { type: "search_query", query: "CMS accountable care proposed rule comment period", label: "ACO rulemaking" },

    // Financial performance + benchmarking
    { type: "search_query", query: "MSSP ACO shared savings results performance 2025 2026", label: "ACO performance" },
    { type: "search_query", query: "ACO benchmark rebasing methodology CMS", label: "Benchmark rebasing" },

    // M&A, valuations, financing
    { type: "search_query", query: "accountable care organization acquisition valuation", label: "ACO M&A" },
    { type: "search_query", query: "value-based care company funding private equity investment", label: "VBC PE deals" },
    { type: "search_query", query: "healthcare ACO IPO SPAC exit valuation", label: "ACO exits" },

    // Operational strategies + emerging themes
    { type: "search_query", query: "ACO care model innovation population health strategy", label: "ACO innovation" },
    { type: "search_query", query: "accountable care AI artificial intelligence operations", label: "ACO + AI" },

    // Industry analysis sources
    { type: "search_query", query: "Leavitt Partners value-based care report", label: "Leavitt analysis" },
    { type: "search_query", query: "McKinsey Bain healthcare value-based care 2026", label: "Consulting reports" },

    // Direct monitors
    { type: "direct_url", url: "https://www.cms.gov/priorities/innovation/innovation-models/medicare-shared-savings-program", label: "CMS MSSP page" },
    { type: "direct_url", url: "https://www.cms.gov/priorities/innovation/innovation-models/aco-reach", label: "CMS ACO REACH page" },
    { type: "direct_url", url: "https://www.kff.org/medicare/", label: "KFF Medicare" },
  ],
  summarizerPrompt: `You are summarizing news for a CMO running ACO operations (MSSP, REACH) at a national senior care platform.

HIGHEST PRIORITY — score 5:
- CMS final rules, proposed rules, or comment periods directly affecting ACOs
- MSSP/REACH benchmark methodology changes or shared savings calculation updates
- ACO M&A activity, valuations, comps, PE/VC deal flow in VBC
- New operational strategies or care model innovations gaining credible traction, especially AI-enabled

HIGH PRIORITY — score 4:
- ACO financial performance data and industry benchmarking
- MedPAC recommendations affecting ACO payment
- Emerging themes in VBC that are driving industry conversation
- PALTC/SNF-specific ACO implications

LOWER PRIORITY — score 2-3:
- General Medicare policy not specific to ACOs
- Hospital system news without VBC relevance
- State Medicaid ACO programs (unless nationally significant)

FILTER OUT — score 1:
- Content not related to ACOs, VBC, or Medicare
- General healthcare news without strategic relevance

For each article, respond in JSON:
{ "summary": "2-3 sentences emphasizing operational/financial/strategic impact", "relevance": 1-5, "deadlines": ["any regulatory dates"], "tags": ["relevant topic tags"] }`,
};

// ─── Section 2: Risk Adjustment ─────────────────────────────

const riskAdjustmentSection: SectionConfig = {
  id: "risk-adjustment",
  name: "Risk Adjustment",
  description:
    "V28 transition, HCC coding, OIG enforcement, AI-assisted coding technology, RADV",
  sources: [
    // RSS feeds
    { type: "rss", url: "https://www.cms.gov/newsroom/rss-feeds", label: "CMS Newsroom" },
    { type: "rss", url: "https://oig.hhs.gov/rss/new-and-revised.xml", label: "HHS OIG" },
    { type: "rss", url: "https://www.hmpgloballearningnetwork.com/site/icd10monitor/rss.xml", label: "ICD10 Monitor" },
    { type: "rss", url: "https://revcycleintelligence.com/feed", label: "RevCycle Intelligence" },
    { type: "rss", url: "https://www.fiercehealthcare.com/rss/xml", label: "Fierce Healthcare" },
    { type: "rss", url: "https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff", label: "Health Affairs" },

    // V28 transition
    { type: "search_query", query: "CMS-HCC V28 transition impact 2026 RAF", label: "V28 transition" },
    { type: "search_query", query: "HCC model V28 dropped codes coefficient changes", label: "V28 mechanics" },
    { type: "search_query", query: "risk adjustment factor recalibration Medicare 2026", label: "RAF recalibration" },
    { type: "search_query", query: "CMS-HCC model update announcement", label: "HCC model updates" },

    // OIG / enforcement
    { type: "search_query", query: "OIG Medicare Advantage risk adjustment audit findings", label: "OIG MA audits" },
    { type: "search_query", query: "DOJ False Claims Act Medicare Advantage HCC upcoding", label: "DOJ enforcement" },
    { type: "search_query", query: "RADV audit methodology final rule Medicare", label: "RADV" },
    { type: "search_query", query: "HCC coding audit settlement", label: "HCC audit settlements" },
    { type: "search_query", query: "Medicare Advantage overpayment risk score", label: "MA overpayment" },

    // AI coding technology
    { type: "search_query", query: "AI-assisted medical coding HCC NLP technology", label: "AI coding tools" },
    { type: "search_query", query: "natural language processing clinical documentation HCC capture", label: "NLP HCC" },
    { type: "search_query", query: "computer-assisted coding risk adjustment accuracy", label: "CAC risk adjustment" },
    { type: "search_query", query: "risk adjustment coding technology vendor", label: "RA tech vendors" },
    { type: "search_query", query: "Episource Cotiviti Optum risk adjustment", label: "Major RA vendors" },

    // Compliance + industry
    { type: "search_query", query: "risk adjustment coding compliance best practices", label: "RA compliance" },
    { type: "search_query", query: "Medicare Advantage risk adjustment 2026", label: "MA RA 2026" },
    { type: "search_query", query: "medical record review HCC recapture rate", label: "HCC recapture" },
    { type: "search_query", query: "chart review coding accuracy retrospective concurrent", label: "Chart review accuracy" },
    { type: "search_query", query: "risk adjustment industry trends payer provider", label: "RA industry trends" },

    // Health Affairs coverage
    { type: "search_query", query: "Health Affairs risk adjustment Medicare", label: "HA risk adjustment" },

    { type: "direct_url", url: "https://www.cms.gov/medicare/health-plans/medicareadvtgspecratestats/risk-adjustors", label: "CMS RA page" },
  ],
  summarizerPrompt: `You are summarizing risk adjustment news for a CMO who oversees coding governance and HCC recapture strategy at a senior care platform operating in MSSP ACO and MA.

HIGHEST PRIORITY — score 5:
- CMS-HCC V28 transition updates: coefficient changes, dropped/added HCCs, phase-in timeline, RAF impact
- OIG/DOJ enforcement actions specifically targeting risk adjustment or HCC coding
- New AI/NLP coding technology with demonstrated accuracy for HCC capture

HIGH PRIORITY — score 4:
- RADV methodology changes and audit outcomes
- Coding compliance guidance from CMS or industry bodies
- Risk adjustment data submission deadlines or format changes

LOWER PRIORITY — score 2-3:
- General coding news not specific to risk adjustment
- MA plan financial results mentioning RA in passing

FILTER OUT — score 1:
- Clinical research, basic science, non-healthcare content
- General AI news without specific coding/RA application

For each article, respond in JSON:
{ "summary": "2-3 sentences focused on coding/documentation/compliance impact", "relevance": 1-5, "deadlines": ["any dates"], "tags": ["topic tags"] }`,
};

// ─── Section 3: Quality & Medical Cost ──────────────────────

const qualityCostSection: SectionConfig = {
  id: "quality-cost",
  name: "Quality & Medical Cost",
  description:
    "MSSP quality measures, MA Stars, SNF quality, TCOC benchmarking, medical expense trends",
  sources: [
    { type: "rss", url: "https://www.cms.gov/newsroom/rss-feeds", label: "CMS Newsroom" },
    { type: "rss", url: "https://www.ncqa.org/blog/feed/", label: "NCQA Blog" },
    { type: "rss", url: "https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff", label: "Health Affairs" },

    // Health Affairs coverage
    { type: "search_query", query: "Health Affairs Medicare Advantage policy", label: "HA MA policy" },
    { type: "search_query", query: "Health Affairs SNF post-acute quality", label: "HA SNF quality" },

    // MSSP ACO quality
    { type: "search_query", query: "MSSP ACO quality measures CAHPS readmissions 2026", label: "MSSP quality" },
    { type: "search_query", query: "ACO quality reporting depression screening HbA1c blood pressure", label: "ACO clinical measures" },
    { type: "search_query", query: "Medicare ACO quality score benchmark performance", label: "ACO quality performance" },

    // MA Stars
    { type: "search_query", query: "CMS Star Ratings methodology 2026 2027 cut points", label: "Stars methodology" },
    { type: "search_query", query: "Medicare Advantage star ratings measure changes", label: "Stars changes" },

    // SNF / post-acute quality
    { type: "search_query", query: "SNF quality reporting program measures 2026", label: "SNF QRP" },
    { type: "search_query", query: "SNF rehospitalization rate quality measure", label: "SNF readmissions" },
    { type: "search_query", query: "nursing facility five-star rating CMS update", label: "SNF star ratings" },

    // TCOC / medical cost
    { type: "search_query", query: "total cost of care benchmark Medicare ACO", label: "TCOC benchmark" },
    { type: "search_query", query: "MSSP shared savings calculation methodology update", label: "Shared savings calc" },
    { type: "search_query", query: "Medicare Advantage medical loss ratio trend 2026", label: "MA MLR" },
    { type: "search_query", query: "Medicare per capita cost trend rate", label: "Medicare cost trends" },

    // MedPAC
    { type: "search_query", query: "MedPAC report Medicare Advantage ACO payment", label: "MedPAC" },

    { type: "direct_url", url: "https://qpp.cms.gov/", label: "CMS QPP portal" },
  ],
  summarizerPrompt: `You are summarizing quality measurement and medical cost news for a CMO in value-based care operating MSSP ACOs and working with MA plans, with clinical operations in SNFs and ALFs.

HIGHEST PRIORITY — score 5:
- MSSP ACO quality measure changes (CAHPS, readmissions, BP control, HbA1c, depression screening)
- CMS Star Ratings methodology updates (cut point changes, new measures, weight changes)
- TCOC benchmark methodology changes affecting shared savings calculations
- SNF-specific quality measure updates (QRP, rehospitalization, five-star)

HIGH PRIORITY — score 4:
- Medical cost trend data and per-capita benchmarking
- MedPAC recommendations on quality or payment methodology
- HEDIS measure specification changes relevant to MA or ACO

LOWER PRIORITY — score 2-3:
- Hospital-only quality programs (unless affecting post-acute)
- State-level quality initiatives
- General health outcomes research without measure/payment connection

FILTER OUT — score 1:
- Non-healthcare content
- Quality improvement stories without methodology or policy relevance

For each article, respond in JSON:
{ "summary": "2-3 sentences emphasizing measure methodology, financial benchmarks, or reporting changes", "relevance": 1-5, "deadlines": ["any reporting dates"], "tags": ["topic tags"] }`,
};

// ─── Section 4: AI in Value-Based Care ──────────────────────

const aiVbcSection: SectionConfig = {
  id: "ai-vbc",
  name: "AI in Value-Based Care",
  description:
    "Clinical AI tools, regulation, predictive analytics, health AI startups, industry conversation drivers",
  sources: [
    { type: "rss", url: "https://www.healthit.gov/buzz-blog/feed", label: "ONC Health IT Buzz" },
    { type: "rss", url: "https://www.statnews.com/feed/", label: "STAT News" },
    { type: "rss", url: "https://outofpocket.health/feed", label: "Out-of-Pocket" },
    { type: "rss", url: "https://hospitalogy.substack.com/feed", label: "Hospitalogy" },

    // Health Affairs coverage
    { type: "search_query", query: "site:healthaffairs.org artificial intelligence healthcare", label: "HA AI healthcare" },

    // Predictive analytics for clinical ops
    { type: "search_query", query: "predictive analytics hospital readmission risk Medicare", label: "Readmission prediction" },
    { type: "search_query", query: "AI utilization management prior authorization automation", label: "AI utilization mgmt" },
    { type: "search_query", query: "machine learning clinical decision support value-based care", label: "ML CDS in VBC" },
    { type: "search_query", query: "AI risk stratification population health management", label: "AI risk stratification" },

    // Regulation
    { type: "search_query", query: "FDA AI clinical decision support regulation 2026", label: "FDA AI regulation" },
    { type: "search_query", query: "CMS artificial intelligence healthcare policy rule", label: "CMS AI policy" },
    { type: "search_query", query: "ONC AI algorithm transparency bias healthcare", label: "ONC AI governance" },

    // Startup ecosystem
    { type: "search_query", query: "healthcare AI startup Series A B funding 2026", label: "Health AI funding" },
    { type: "search_query", query: "health tech AI acquisition value-based care", label: "AI VBC acquisitions" },
    { type: "search_query", query: "clinical AI company launch product value-based", label: "New AI products" },

    // Industry conversation / thought leadership
    { type: "search_query", query: "artificial intelligence healthcare transformation debate", label: "AI healthcare discourse" },
    { type: "search_query", query: "Farzad Mostashari AI value-based care", label: "Mostashari on AI" },
    { type: "search_query", query: "AI ambient documentation clinical workflow adoption", label: "Ambient AI adoption" },

    { type: "direct_url", url: "https://www.healthit.gov/topic/artificial-intelligence", label: "ONC AI page" },
  ],
  summarizerPrompt: `You are summarizing AI-in-healthcare news for a CMO evaluating and deploying AI tools in value-based care operations (ACO, MA, SNF/ALF settings).

HIGHEST PRIORITY — score 5:
- Predictive analytics tools for readmission risk, utilization, or clinical deterioration with real evidence
- FDA/CMS/ONC regulatory actions directly affecting clinical AI deployment
- Health AI startups with VBC-specific products (funding rounds, acquisitions, partnerships)
- Industry thought leadership that is driving real conversation about AI in VBC (not generic hype)

HIGH PRIORITY — score 4:
- Ambient documentation and AI scribe tools with new evidence or major deployments
- AI-assisted coding for HCC/risk adjustment (bridges to the RA section)
- Major AI platform moves by health systems or payers affecting VBC

LOWER PRIORITY — score 2-3:
- General enterprise AI news with tangential healthcare mention
- Drug discovery AI (not operationally relevant)
- Consumer health apps without VBC integration

FILTER OUT — score 1:
- General tech industry AI news without healthcare application
- AI hype pieces without substance or evidence
- Non-healthcare content

For each article, respond in JSON:
{ "summary": "2-3 sentences emphasizing practical VBC application, evidence quality, and regulatory status", "relevance": 1-5, "deadlines": ["any regulatory dates"], "tags": ["topic tags"] }`,
};

// ─── Section 5: Earnings & Competitive Intel ────────────────

export interface TrackedCompany {
  ticker: string;
  name: string;
  shortName: string;
  tier: "deep" | "standard" | "light";
  irPageUrl: string;
  vbcRelevance: string;
  searchAliases: string[];
}

export const TRACKED_COMPANIES: TrackedCompany[] = [
  // Tier 1: Deep analysis — Big 5 MA plans
  {
    ticker: "UNH",
    name: "UnitedHealth Group",
    shortName: "UnitedHealth",
    tier: "deep",
    irPageUrl: "https://www.unitedhealthgroup.com/investors.html",
    vbcRelevance: "Optum Health/Care Solutions is largest VBC provider org, UHC is largest MA plan",
    searchAliases: ["UnitedHealth", "Optum", "UHC"],
  },
  {
    ticker: "HUM",
    name: "Humana Inc.",
    shortName: "Humana",
    tier: "deep",
    irPageUrl: "https://humana.gcs-web.com/events-and-presentations",
    vbcRelevance: "Largest MA-focused payer, CenterWell primary care + home health, heavy VBC investment",
    searchAliases: ["Humana", "CenterWell"],
  },
  {
    ticker: "CVS",
    name: "CVS Health / Aetna",
    shortName: "CVS/Aetna",
    tier: "deep",
    irPageUrl: "https://investors.cvshealth.com/",
    vbcRelevance: "Aetna MA business, Oak Street Health acquisition, Signify Health, VBC vertical integration",
    searchAliases: ["CVS Health", "Aetna", "Oak Street Health", "Signify Health"],
  },
  {
    ticker: "ELV",
    name: "Elevance Health",
    shortName: "Elevance",
    tier: "deep",
    irPageUrl: "https://ir.elevancehealth.com/",
    vbcRelevance: "Carelon health services, growing MA and VBC strategy",
    searchAliases: ["Elevance", "Anthem", "Carelon"],
  },
  {
    ticker: "CNC",
    name: "Centene Corporation",
    shortName: "Centene",
    tier: "deep",
    irPageUrl: "https://investors.centene.com/",
    vbcRelevance: "Largest Medicaid managed care, growing MA presence, WellCare",
    searchAliases: ["Centene", "WellCare"],
  },

  // Tier 2: Standard — PALTC / post-acute competitors
  {
    ticker: "ENSG",
    name: "The Ensign Group",
    shortName: "Ensign",
    tier: "standard",
    irPageUrl: "https://investor.ensigngroup.net/",
    vbcRelevance: "Largest SNF operator, post-acute competitive intel, operational benchmarking",
    searchAliases: ["Ensign Group"],
  },
  {
    ticker: "SBRA",
    name: "Sabra Health Care REIT",
    shortName: "Sabra",
    tier: "standard",
    irPageUrl: "https://ir.sabrahealth.com/",
    vbcRelevance: "SNF/ALF REIT, portfolio performance signals post-acute market health",
    searchAliases: ["Sabra Health Care", "Sabra REIT"],
  },
  {
    ticker: "CTRE",
    name: "CareTrust REIT",
    shortName: "CareTrust",
    tier: "standard",
    irPageUrl: "https://investors.caretrustreit.com/",
    vbcRelevance: "SNF/ALF REIT, acquisition activity signals post-acute market dynamics",
    searchAliases: ["CareTrust REIT"],
  },
  {
    ticker: "GEN",
    name: "Genesis Healthcare",
    shortName: "Genesis",
    tier: "standard",
    irPageUrl: "",
    vbcRelevance: "Major SNF/post-acute operator, competitive landscape",
    searchAliases: ["Genesis Healthcare"],
  },

  // Tier 3: Light — VBC-focused companies (high-level trends only)
  {
    ticker: "AGL",
    name: "agilon health",
    shortName: "agilon",
    tier: "light",
    irPageUrl: "https://ir.agilonhealth.com/",
    vbcRelevance: "VBC enablement platform for physician groups, MA-focused",
    searchAliases: ["agilon health"],
  },
  {
    ticker: "PRVA",
    name: "Privia Health",
    shortName: "Privia",
    tier: "light",
    irPageUrl: "https://ir.priviahealth.com/",
    vbcRelevance: "Physician enablement platform, VBC technology + services",
    searchAliases: ["Privia Health"],
  },
  {
    ticker: "ALHC",
    name: "Alignment Healthcare",
    shortName: "Alignment",
    tier: "light",
    irPageUrl: "https://ir.alignmenthealthcare.com/",
    vbcRelevance: "MA-focused VBC platform, AVA technology, senior-focused",
    searchAliases: ["Alignment Healthcare"],
  },
];

const earningsSection: SectionConfig = {
  id: "earnings",
  name: "Earnings & Competitive Intel",
  description:
    "MA plan earnings calls, PALTC competitor financials, VBC company performance, industry valuations",
  sources: [
    // Recent earnings — Q4 2025 / FY2025 results (available now)
    { type: "search_query", query: "UnitedHealth Group Q4 2025 earnings results", label: "UNH Q4 2025" },
    { type: "search_query", query: "Humana 2025 annual results", label: "HUM FY2025" },
    { type: "search_query", query: "Ensign Group Q4 2025 earnings", label: "ENSG Q4 2025" },

    // Forward-looking earnings calendar + transcripts
    { type: "search_query", query: "UnitedHealth Group earnings call transcript 2026", label: "UNH earnings" },
    { type: "search_query", query: "Humana earnings call transcript 2026", label: "HUM earnings" },
    { type: "search_query", query: "CVS Health Aetna earnings call transcript 2026", label: "CVS earnings" },
    { type: "search_query", query: "Elevance Health earnings call transcript 2026", label: "ELV earnings" },
    { type: "search_query", query: "Centene earnings call transcript 2026", label: "CNC earnings" },
    { type: "search_query", query: "Ensign Group earnings call transcript 2026", label: "ENSG earnings" },
    { type: "search_query", query: "agilon Privia Alignment earnings 2026", label: "VBC co earnings" },

    // Broader earnings + analyst coverage
    { type: "search_query", query: "Medicare Advantage plan earnings 2026", label: "MA plan earnings" },
    { type: "search_query", query: "skilled nursing operator financial results", label: "SNF financials" },

    // Competitive intel — PALTC
    { type: "search_query", query: "skilled nursing facility operator acquisition 2026", label: "SNF M&A" },
    { type: "search_query", query: "post-acute care company valuation private equity", label: "Post-acute PE" },
    { type: "search_query", query: "PALTC long-term care platform growth strategy", label: "PALTC strategy" },
    { type: "search_query", query: "senior care platform company funding expansion", label: "Senior care growth" },

    // Industry financial signals
    { type: "search_query", query: "Medicare Advantage membership growth enrollment 2026", label: "MA enrollment" },
    { type: "search_query", query: "Medicare Advantage rate notice 2027 final", label: "MA rate notice" },
    { type: "search_query", query: "value-based care revenue PMPM medical cost ratio", label: "VBC financials" },

    // SEC filings for MA plans
    { type: "direct_url", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=UNH&type=10-K&dateb=&owner=include&count=5", label: "UNH SEC filings" },
    { type: "direct_url", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=HUM&type=10-K&dateb=&owner=include&count=5", label: "HUM SEC filings" },
  ],
  summarizerPrompt: `You are summarizing earnings calls and competitive intelligence for a CMO at a national senior care platform doing VBC in SNF/ALF settings.

COMPANY TIERS — adjust summary depth:
- DEEP (UNH, HUM, CVS/Aetna, ELV, CNC): Extract VBC-specific commentary, MA membership/MLR trends, guidance changes, competitive signals for ACO/VBC providers. 4-6 sentence summary.
- STANDARD (Ensign, Sabra, CareTrust, Genesis): Focus on operational metrics, occupancy, rate trends, acquisition activity, anything signaling market dynamics in post-acute. 3-4 sentence summary.
- LIGHT (agilon, Privia, Alignment): High-level only — revenue trajectory, membership growth, key strategic shifts. 2 sentences max.

HIGHEST PRIORITY — score 5:
- Earnings call transcripts or summaries from any tracked company
- MA rate notice analysis and plan responses
- PALTC M&A transactions with financial terms disclosed
- Industry valuation data or comparable transaction analysis

HIGH PRIORITY — score 4:
- MA enrollment trends and competitive positioning
- Post-acute operator financial performance (occupancy, rate, margin)
- VBC company strategic pivots or major contract announcements

LOWER PRIORITY — score 2-3:
- Analyst commentary without new information
- General market conditions affecting healthcare stocks

FILTER OUT — score 1:
- Non-healthcare financial news
- Company mentions in passing without substantive detail

For each article, respond in JSON:
{ "summary": "depth per tier above", "relevance": 1-5, "deadlines": ["earnings dates if mentioned"], "tags": ["company ticker", "topic tags"] }`,
};

// ─── Section 6: Industry News & Buzz ─────────────────────────

const industrySection: SectionConfig = {
  id: "industry",
  name: "Industry Buzz",
  description:
    "Conferences, product launches, trending takes, wild cards — interesting stuff that doesn't fit neatly elsewhere",
  sources: [
    // RSS — broad healthcare + health policy
    { type: "rss", url: "https://www.fiercehealthcare.com/rss/xml", label: "Fierce Healthcare" },
    { type: "rss", url: "https://www.statnews.com/feed/", label: "STAT News" },
    { type: "rss", url: "https://www.modernhealthcare.com/section/rss", label: "Modern Healthcare" },
    { type: "rss", url: "https://www.beckershospitalreview.com/rss/healthcare-information-technology.html", label: "Becker's Health IT" },
    { type: "rss", url: "https://hospitalogy.substack.com/feed", label: "Hospitalogy" },
    { type: "rss", url: "https://outofpocket.health/feed", label: "Out-of-Pocket" },
    { type: "rss", url: "https://thehealthcareblog.com/feed/", label: "The Health Care Blog" },

    // Conferences + events
    { type: "search_query", query: "HIMSS 2026 conference announcements healthcare", label: "HIMSS 2026" },
    { type: "search_query", query: "HLTH conference 2026 healthcare innovation", label: "HLTH 2026" },
    { type: "search_query", query: "JP Morgan healthcare conference 2026 announcements", label: "JPM Healthcare" },
    { type: "search_query", query: "AHIP conference Medicare Advantage 2026", label: "AHIP 2026" },
    { type: "search_query", query: "AMDA PALTC conference post-acute 2026", label: "AMDA 2026" },
    { type: "search_query", query: "ViVE healthcare conference 2026", label: "ViVE 2026" },

    // Product launches + company news
    { type: "search_query", query: "healthcare startup launch product announcement 2026", label: "Startup launches" },
    { type: "search_query", query: "health tech product launch new feature 2026", label: "Health tech products" },
    { type: "search_query", query: "CMS innovation center new model demonstration", label: "CMMI new models" },

    // Trending industry discourse
    { type: "search_query", query: "healthcare industry controversy debate trending", label: "Industry debate" },
    { type: "search_query", query: "Medicare Medicaid policy surprise unexpected", label: "Policy surprises" },
    { type: "search_query", query: "healthcare executive leadership change CEO appointment", label: "C-suite moves" },
    { type: "search_query", query: "healthcare workforce burnout shortage crisis 2026", label: "Workforce crisis" },
    { type: "search_query", query: "pharmacy benefit manager PBM reform healthcare", label: "PBM reform" },
    { type: "search_query", query: "healthcare private equity consolidation backlash", label: "PE backlash" },

    // Social / trending takes
    { type: "search_query", query: "healthcare twitter thread viral opinion value-based care", label: "Viral healthcare takes" },
    { type: "search_query", query: "Farzad Mostashari Aledade healthcare opinion", label: "Mostashari takes" },
    { type: "search_query", query: "healthcare newsletter must-read weekly", label: "Newsletter picks" },
  ],
  summarizerPrompt: `You are curating an "industry buzz" feed for a healthcare CMO who wants to stay plugged into the broader conversation beyond their core operational areas. This is the catch-all for interesting, surprising, or conversation-worthy content.

HIGHEST PRIORITY — score 5:
- Major conference announcements with real strategic implications (HIMSS, HLTH, JPM Healthcare, AHIP)
- Surprising policy moves, regulatory shifts, or CMS announcements that cut across sectors
- Viral industry discourse or hot takes from credible voices that are shaping real conversation
- C-suite moves at major payers, providers, or VBC companies
- New CMS innovation models or demonstration programs

HIGH PRIORITY — score 4:
- Notable product launches or partnerships from health tech companies
- Healthcare PE/consolidation trends generating real backlash or debate
- Workforce crisis developments with operational implications
- Cross-cutting trends (PBM reform, price transparency, site-of-care shifts)

LOWER PRIORITY — score 2-3:
- Conference coverage that's mostly promotional without substance
- Routine leadership changes at smaller organizations
- General health policy news already well-covered in other sections

FILTER OUT — score 1:
- Pure marketing/PR fluff
- Content that fits cleanly in the ACO, RA, Quality, AI, or Earnings sections
- Non-healthcare content
- Clickbait without substance

The bar here is: "Would a busy CMO forward this to a colleague with 'you need to see this'?"

For each article, respond in JSON:
{ "summary": "2-3 sentences capturing why this is interesting and what it signals", "relevance": 1-5, "deadlines": ["any relevant dates"], "tags": ["topic tags"] }`,
};

// ─── Export all sections ────────────────────────────────────

export const SECTIONS: SectionConfig[] = [
  acoSection,
  riskAdjustmentSection,
  qualityCostSection,
  aiVbcSection,
  earningsSection,
  industrySection,
];

// ─── Feedback system types ──────────────────────────────────

export interface ArticleRating {
  articleId: string;
  section: Section;
  userRating: number;
  modelRating: number;
  title: string;
  summary: string;
  tags: string[];
  ratedAt: string;
}

export interface FeedbackAddendum {
  section: Section;
  generatedAt: string;
  prompt: string;
  articlesAnalyzed: number;
  avgUserRating: number;
  avgModelRating: number;
}

// ─── Configuration ──────────────────────────────────────────

export const RELEVANCE_THRESHOLD = 3;
export const FETCH_INTERVAL_HOURS = 168; // weekly (Saturday 7pm PT / Sunday 3am UTC)
export const FEEDBACK_TUNING_INTERVAL_DAYS = 30;
