// src/data/scenarios.js

export const scenarios = [
  {
    id: 1,
    name: "Vendor Pricing Negotiation",
    description:
      "A buyer and vendor negotiate the price of a product.",

    negotiationType: "amount",

    agents: [
      {
        id: "buyer",
        name: "Buyer Agent",
        role: "Buyer",

        // Display information
        goal: "Get the product for ₹1,00,000 or less",
        constraints: "Cannot pay more than ₹1,10,000",

        personality: "Collaborative",

        // Decision direction
        decisionType: "minimize",

        // Machine-readable negotiation boundaries
        negotiation: {
          targetValue: 100000,
          maximumAcceptable: 110000,
        },
      },

      {
        id: "vendor",
        name: "Vendor Agent",
        role: "Vendor",

        // Display information
        goal: "Sell the product for ₹1,00,000 or more",
        constraints: "Cannot sell below ₹80,000",

        personality: "Collaborative",

        // Decision direction
        decisionType: "maximize",

        // Machine-readable negotiation boundaries
        negotiation: {
          targetValue: 100000,
          minimumAcceptable: 80000,
        },
      },
    ],
  },

  {
    id: 2,
    name: "Job Offer Negotiation",
    description:
      "A candidate and employer negotiate salary and benefits.",

    negotiationType: "amount",

    agents: [
      {
        id: "candidate",
        name: "Candidate Agent",
        role: "Job Candidate",

        goal: "Get a salary of ₹12,00,000 or higher",
        constraints: "Will not accept below ₹10,00,000",

        personality: "Collaborative",

        decisionType: "maximize",

        negotiation: {
          targetValue: 1200000,
          minimumAcceptable: 1000000,
        },
      },

      {
        id: "employer",
        name: "Employer Agent",
        role: "Employer",

        goal: "Hire the candidate for ₹11,00,000 or less",
        constraints: "Cannot offer more than ₹13,00,000",

        personality: "Collaborative",

        decisionType: "minimize",

        negotiation: {
          targetValue: 1100000,
          maximumAcceptable: 1300000,
        },
      },
    ],
  },

  {
    id: 3,
    name: "Project Budget Allocation",
    description:
      "Project and finance managers negotiate budget allocation.",

    negotiationType: "amount",

    agents: [
      {
        id: "project-manager",
        name: "Project Manager Agent",
        role: "Project Manager",

        goal: "Secure a budget of ₹9,00,000 or more",
        constraints: "Cannot complete the project below ₹7,50,000",

        personality: "Collaborative",

        decisionType: "maximize",

        negotiation: {
          targetValue: 900000,
          minimumAcceptable: 750000,
        },
      },

      {
        id: "finance-manager",
        name: "Finance Manager Agent",
        role: "Finance Manager",

        goal: "Complete the project within ₹8,00,000",
        constraints: "Cannot approve more than ₹10,00,000",

        personality: "Collaborative",

        decisionType: "minimize",

        negotiation: {
          targetValue: 800000,
          maximumAcceptable: 1000000,
        },
      },
    ],
  },
];