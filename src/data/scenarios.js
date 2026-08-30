export const scenarios = [
  {
    id: 1,
    name: "Vendor Pricing Negotiation",
    description: "A buyer and vendor negotiate the price of a product.",
    type: "predefined",

    agents: [
      {
        id: "buyer",
        name: "Buyer Agent",
        role: "Buyer",
        goal: "Get the best possible price",
        constraints: {
          maxPrice: 100000,
        },
        personality: "Collaborative",
      },
      {
        id: "vendor",
        name: "Vendor Agent",
        role: "Vendor",
        goal: "Maximize profit",
        constraints: {
          minPrice: 80000,
        },
        personality: "Collaborative",
      },
    ],
  },

  {
    id: 2,
    name: "Job Offer Negotiation",
    description: "A candidate and employer negotiate salary and benefits.",
    type: "predefined",

    agents: [
      {
        id: "candidate",
        name: "Candidate Agent",
        role: "Job Candidate",
        goal: "Get the best possible salary and benefits",
        constraints: {
          minSalary: 800000,
        },
        personality: "Collaborative",
      },
      {
        id: "employer",
        name: "Employer Agent",
        role: "Employer",
        goal: "Hire the candidate within budget",
        constraints: {
          maxSalary: 1000000,
        },
        personality: "Collaborative",
      },
    ],
  },

  {
    id: 3,
    name: "Project Budget Allocation",
    description:
      "Project and finance managers negotiate budget allocation.",
    type: "predefined",

    agents: [
      {
        id: "project-manager",
        name: "Project Manager Agent",
        role: "Project Manager",
        goal: "Secure enough budget for the project",
        constraints: {
          minBudget: 400000,
        },
        personality: "Collaborative",
      },
      {
        id: "finance-manager",
        name: "Finance Manager Agent",
        role: "Finance Manager",
        goal: "Control and optimize spending",
        constraints: {
          maxBudget: 500000,
        },
        personality: "Collaborative",
      },
    ],
  },
];