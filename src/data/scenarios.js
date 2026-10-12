export const scenarios = [
  {
    id: 1,
    name: "Vendor Pricing Negotiation",
    description: "A buyer and vendor negotiate the price of a product.",
    negotiationType: "amount",
    libraryType: "Amount",
    agents: [
      { id: "buyer", name: "Buyer Agent", role: "Buyer", goal: "Get the product for ₹1,00,000 or less", constraints: "Cannot pay more than ₹1,10,000", personality: "Collaborative", decisionType: "minimize", negotiation: { targetValue: 100000, maximumAcceptable: 110000, batnaValue: 108000, leverage: 0.48 }, interests: ["predictable supply", "quality"], alternatives: ["alternative supplier at ₹1,08,000"], priorities: ["price", "reliability"], negotiableTerms: ["delivery schedule", "warranty"], },
      { id: "vendor", name: "Vendor Agent", role: "Vendor", goal: "Sell the product for ₹1,00,000 or more", constraints: "Cannot sell below ₹80,000", personality: "Collaborative", decisionType: "maximize", negotiation: { targetValue: 100000, minimumAcceptable: 80000, batnaValue: 90000, leverage: 0.52 }, interests: ["margin", "repeat business"], alternatives: ["other buyers"], priorities: ["price", "volume"], negotiableTerms: ["quantity", "payment timing"], },
    ],
  },
  {
    id: 2,
    name: "Job Offer Negotiation",
    description: "A candidate negotiates with a recruiter for a better offer.",
    negotiationType: "amount",
    libraryType: "Salary",
    agents: [
      { id: "candidate", name: "Candidate Agent", role: "Job Candidate", goal: "Get a salary of ₹12,00,000 or higher", constraints: "Will not accept below ₹10,00,000", personality: "Collaborative", decisionType: "maximize", negotiation: { targetValue: 1200000, minimumAcceptable: 1000000, batnaValue: 1050000, leverage: 0.55 }, interests: ["career growth", "total compensation"], alternatives: ["another employer"], priorities: ["salary", "role scope"], negotiableTerms: ["joining date", "bonus"], },
      { id: "employer", name: "Employer Agent", role: "Employer", goal: "Hire the candidate for ₹11,00,000 or less", constraints: "Cannot offer more than ₹13,00,000", personality: "Collaborative", decisionType: "minimize", negotiation: { targetValue: 1100000, maximumAcceptable: 1300000, batnaValue: 1250000, leverage: 0.58 }, interests: ["budget discipline", "retention"], alternatives: ["another qualified candidate"], priorities: ["salary", "retention"], negotiableTerms: ["bonus", "joining date"], },
    ],
  },
  {
    id: 3,
    name: "Project Budget Allocation",
    description: "A project manager negotiates with a finance manager for budget allocation.",
    negotiationType: "amount",
    libraryType: "Budget",
    agents: [
      { id: "project-manager", name: "Project Manager Agent", role: "Project Manager", goal: "Secure a budget of ₹9,00,000 or more", constraints: "Cannot complete the project below ₹7,50,000", personality: "Collaborative", decisionType: "maximize", negotiation: { targetValue: 900000, minimumAcceptable: 750000, batnaValue: 800000, leverage: 0.55 }, interests: ["scope completion", "quality"], alternatives: ["reduce project scope"], priorities: ["budget", "scope"], negotiableTerms: ["milestones", "scope"], },
      { id: "finance-manager", name: "Finance Manager Agent", role: "Finance Manager", goal: "Complete the project within ₹8,00,000", constraints: "Cannot approve more than ₹10,00,000", personality: "Collaborative", decisionType: "minimize", negotiation: { targetValue: 800000, maximumAcceptable: 1000000, batnaValue: 900000, leverage: 0.50 }, interests: ["cost control", "delivery confidence"], alternatives: ["phase the project"], priorities: ["budget", "risk"], negotiableTerms: ["milestones", "payment schedule"], },
    ],
  },
  {
    id: 4,
    name: "Car Purchase Negotiation",
    description: "A customer negotiates with a dealer for the best deal.",
    negotiationType: "amount",
    libraryType: "Amount",
    agents: [
      { id: "customer", name: "Customer Agent", role: "Customer", goal: "Buy the car for ₹8,50,000 or less", constraints: "Cannot pay more than ₹9,00,000", personality: "Risk-Averse", decisionType: "minimize", negotiation: { targetValue: 850000, maximumAcceptable: 900000, batnaValue: 880000, leverage: 0.45 }, interests: ["ownership cost", "vehicle condition"], alternatives: ["another dealer"], priorities: ["price", "warranty"], negotiableTerms: ["warranty", "service package"], },
      { id: "dealer", name: "Dealer Agent", role: "Car Dealer", goal: "Sell the car for ₹9,25,000 or more", constraints: "Cannot sell below ₹8,50,000", personality: "Aggressive", decisionType: "maximize", negotiation: { targetValue: 925000, minimumAcceptable: 850000, batnaValue: 875000, leverage: 0.60 }, interests: ["margin", "inventory turnover"], alternatives: ["another buyer"], priorities: ["price", "payment speed"], negotiableTerms: ["service package", "payment timing"], },
    ],
  },
  {
    id: 5,
    name: "House Rent Negotiation",
    description: "A tenant negotiates with a landlord for better rent and terms.",
    negotiationType: "amount",
    libraryType: "Amount",
    agents: [
      { id: "tenant", name: "Tenant Agent", role: "Tenant", goal: "Keep monthly rent at ₹25,000 or less", constraints: "Cannot pay more than ₹28,000 per month", personality: "Collaborative", decisionType: "minimize", negotiation: { targetValue: 25000, maximumAcceptable: 28000, batnaValue: 27000, leverage: 0.48 }, interests: ["affordability", "stable tenancy"], alternatives: ["another apartment"], priorities: ["rent", "lease length"], negotiableTerms: ["lease duration", "maintenance"], },
      { id: "landlord", name: "Landlord Agent", role: "Landlord", goal: "Secure at least ₹30,000 monthly rent", constraints: "Cannot accept below ₹27,000 per month", personality: "Risk-Averse", decisionType: "maximize", negotiation: { targetValue: 30000, minimumAcceptable: 27000, batnaValue: 28000, leverage: 0.52 }, interests: ["rental income", "reliable tenant"], alternatives: ["another tenant"], priorities: ["rent", "tenant reliability"], negotiableTerms: ["lease duration", "maintenance"], },
    ],
  },
  {
    id: 6,
    name: "Freelance Contract Negotiation",
    description: "A freelancer negotiates with a client for project terms and payment.",
    negotiationType: "amount",
    libraryType: "Amount",
    agents: [
      { id: "freelancer", name: "Freelancer Agent", role: "Freelancer", goal: "Secure ₹1,50,000 or more for the project", constraints: "Cannot accept below ₹1,20,000", personality: "Collaborative", decisionType: "maximize", negotiation: { targetValue: 150000, minimumAcceptable: 120000, batnaValue: 135000, leverage: 0.55 }, interests: ["fair compensation", "portfolio value"], alternatives: ["another client"], priorities: ["fee", "scope"], negotiableTerms: ["scope", "payment schedule"], },
      { id: "client", name: "Client Agent", role: "Client", goal: "Keep the project fee at ₹1,30,000 or less", constraints: "Cannot approve more than ₹1,60,000", personality: "Risk-Averse", decisionType: "minimize", negotiation: { targetValue: 130000, maximumAcceptable: 160000, batnaValue: 145000, leverage: 0.50 }, interests: ["delivery certainty", "budget"], alternatives: ["another freelancer"], priorities: ["fee", "delivery"], negotiableTerms: ["scope", "milestones"], },
    ],
  },
  {
    id: 7,
    name: "Office Lease Negotiation",
    description: "A company negotiates with a property owner for office space lease terms.",
    negotiationType: "amount",
    libraryType: "Amount",
    agents: [
      { id: "company", name: "Company Agent", role: "Company Representative", goal: "Keep annual lease cost at ₹18,00,000 or less", constraints: "Cannot exceed ₹20,00,000 annually", personality: "Risk-Averse", decisionType: "minimize", negotiation: { targetValue: 1800000, maximumAcceptable: 2000000, batnaValue: 1900000, leverage: 0.52 }, interests: ["occupancy cost", "flexibility"], alternatives: ["another office"], priorities: ["rent", "lease flexibility"], negotiableTerms: ["lease duration", "fit-out"], },
      { id: "property-owner", name: "Property Owner Agent", role: "Property Owner", goal: "Secure ₹22,00,000 or more annually", constraints: "Cannot accept below ₹19,00,000", personality: "Aggressive", decisionType: "maximize", negotiation: { targetValue: 2200000, minimumAcceptable: 1900000, batnaValue: 2000000, leverage: 0.58 }, interests: ["rental yield", "long-term tenant"], alternatives: ["another company"], priorities: ["rent", "lease certainty"], negotiableTerms: ["lease duration", "fit-out"], },
    ],
  },
  {
    id: 8,
    name: "Business Partnership Negotiation",
    description: "Two companies negotiate investment, revenue sharing, and partnership terms.",
    negotiationType: "amount",
    libraryType: "Multi-Issue",
    agents: [
      { id: "company-a", name: "Company A Agent", role: "Growth Partner", goal: "Secure a partnership value equivalent to ₹50,00,000 or more", constraints: "Cannot commit beyond ₹60,00,000", personality: "Collaborative", decisionType: "maximize", negotiation: { targetValue: 5000000, minimumAcceptable: 4000000, batnaValue: 4500000, leverage: 0.56 }, interests: ["growth", "revenue upside"], alternatives: ["other strategic partner"], priorities: ["investment", "revenue share"], negotiableTerms: ["revenue share", "milestones", "governance"], },
      { id: "company-b", name: "Company B Agent", role: "Strategic Partner", goal: "Keep the partnership commitment at ₹45,00,000 or less", constraints: "Cannot exceed ₹55,00,000", personality: "Risk-Averse", decisionType: "minimize", negotiation: { targetValue: 4500000, maximumAcceptable: 5500000, batnaValue: 5000000, leverage: 0.54 }, interests: ["risk control", "strategic fit"], alternatives: ["internal investment"], priorities: ["commitment", "control"], negotiableTerms: ["revenue share", "governance", "milestones"], },
    ],
  },
];
