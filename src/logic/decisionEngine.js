export function decideOffer({
  agent,
  offerValue,
}) {
  const { constraints } = agent;

  // =========================================================
  // 1. VENDOR PRICING NEGOTIATION
  // =========================================================

  // Buyer: lower price is better
  if (agent.role === "Buyer") {
    if (offerValue <= constraints.maxPrice) {
      return {
        decision: "ACCEPT",
        reason: "Offer is within the buyer's maximum budget.",
      };
    }

    if (offerValue > constraints.maxPrice) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.maxPrice,
        reason: "Offer exceeds the buyer's maximum budget.",
      };
    }
  }

  // Vendor: higher price is better
  if (agent.role === "Vendor") {
    if (offerValue >= constraints.minPrice) {
      return {
        decision: "ACCEPT",
        reason:
          "Offer meets the vendor's minimum acceptable price.",
      };
    }

    if (offerValue < constraints.minPrice) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.minPrice,
        reason:
          "Offer is below the vendor's minimum acceptable price.",
      };
    }
  }

  // =========================================================
  // 2. JOB OFFER NEGOTIATION
  // =========================================================

  // Candidate: higher salary is better
  if (agent.role === "Job Candidate") {
    if (offerValue >= constraints.minSalary) {
      return {
        decision: "ACCEPT",
        reason:
          "Salary meets the candidate's minimum acceptable salary.",
      };
    }

    if (offerValue < constraints.minSalary) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.minSalary,
        reason:
          "Salary is below the candidate's minimum acceptable salary.",
      };
    }
  }

  // Employer: lower salary is better
  if (agent.role === "Employer") {
    if (offerValue <= constraints.maxSalary) {
      return {
        decision: "ACCEPT",
        reason:
          "Salary is within the employer's maximum budget.",
      };
    }

    if (offerValue > constraints.maxSalary) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.maxSalary,
        reason:
          "Salary exceeds the employer's maximum budget.",
      };
    }
  }

  // =========================================================
  // 3. PROJECT BUDGET ALLOCATION
  // =========================================================

  // Project Manager: higher budget is better
  if (agent.role === "Project Manager") {
    if (offerValue >= constraints.minBudget) {
      return {
        decision: "ACCEPT",
        reason:
          "Budget meets the project's minimum required budget.",
      };
    }

    if (offerValue < constraints.minBudget) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.minBudget,
        reason:
          "Budget is below the minimum required project budget.",
      };
    }
  }

  // Finance Manager: lower budget is better
  if (agent.role === "Finance Manager") {
    if (offerValue <= constraints.maxBudget) {
      return {
        decision: "ACCEPT",
        reason:
          "Budget is within the finance manager's available limit.",
      };
    }

    if (offerValue > constraints.maxBudget) {
      return {
        decision: "COUNTEROFFER",
        counteroffer: constraints.maxBudget,
        reason:
          "Budget exceeds the maximum available funds.",
      };
    }
  }

  // =========================================================
  // DEFAULT
  // =========================================================

  return {
    decision: "REJECT",
    reason:
      "Offer does not satisfy the agent's constraints.",
  };
}