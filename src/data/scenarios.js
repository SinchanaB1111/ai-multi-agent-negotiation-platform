export const scenarios = [
  {
    id: 1,
    name: "Vendor Pricing Negotiation",
    description: "A buyer and vendor negotiate the price of a product.",
    agents: [
      {
        id: "buyer",
        name: "Buyer Agent",
        role: "Buyer",
        goal: "Get the best possible price",
        constraints: "Limited budget",
        personality: "Collaborative"
      },
      {
        id: "vendor",
        name: "Vendor Agent",
        role: "Vendor",
        goal: "Maximize profit",
        constraints: "Minimum acceptable price",
        personality: "Collaborative"
      }
    ]
  },

  {
    id: 2,
    name: "Job Offer Negotiation",
    description: "A candidate and employer negotiate salary and benefits.",
    agents: [
      {
        id: "candidate",
        name: "Candidate Agent",
        role: "Job Candidate",
        goal: "Get the best possible salary and benefits",
        constraints: "Minimum acceptable salary",
        personality: "Collaborative"
      },
      {
        id: "employer",
        name: "Employer Agent",
        role: "Employer",
        goal: "Hire the candidate within budget",
        constraints: "Maximum salary budget",
        personality: "Collaborative"
      }
    ]
  },

  {
    id: 3,
    name: "Project Budget Allocation",
    description: "Project and finance managers negotiate budget allocation.",
    agents: [
      {
        id: "project-manager",
        name: "Project Manager Agent",
        role: "Project Manager",
        goal: "Secure enough budget for the project",
        constraints: "Limited total budget",
        personality: "Collaborative"
      },
      {
        id: "finance-manager",
        name: "Finance Manager Agent",
        role: "Finance Manager",
        goal: "Control and optimize spending",
        constraints: "Cannot exceed available funds",
        personality: "Collaborative"
      }
    ]
  }
];