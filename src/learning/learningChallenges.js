export function buildLearningChallenges(state, tactics = [], turningPoints = []) {
  const first = tactics.find((item) => item.type === "ANCHORING");
  const conditional = tactics.find((item) => item.type === "CONDITIONAL_CONCESSION");
  const trade = tactics.find((item) => item.type === "TRADE_OFF" || item.type === "VALUE_CREATION");

  if (conditional) {
    return [{
      id: "conditional-1",
      round: conditional.round,
      question: `An agent moved its offer while tying the movement to a condition. What is the strongest learning response?`,
      options: [
        "Accept every concession immediately",
        "Give an equally large concession with no condition",
        "Check what valuable commitment is being exchanged",
        "End the negotiation"
      ],
      correctIndex: 2,
      concept: "Conditional Concession",
      explanation: "The recorded move shows that the concession was connected to another term. Look for the reciprocal value before giving ground."
    }];
  }

  if (trade) {
    return [{
      id: "tradeoff-1",
      round: trade.round,
      question: "The negotiation introduced another issue. What is the most useful next step?",
      options: [
        "Return to price only",
        "Explore the value of the other issue",
        "Accept the current price immediately",
        "Ignore the new issue"
      ],
      correctIndex: 1,
      concept: "Trade-off / Value Creation",
      explanation: "A second issue can create room for exchange when a single price dimension is constrained."
    }];
  }

  if (first) {
    return [{
      id: "anchor-1",
      round: first.round,
      question: "An opening offer established a strong reference point. What should the other side do?",
      options: [
        "Treat it as the fair market value",
        "Test the assumptions behind the anchor",
        "Match it immediately",
        "Stop negotiating"
      ],
      correctIndex: 1,
      concept: "Anchoring",
      explanation: "An anchor is a reference point, not automatically a justified outcome."
    }];
  }

  if (turningPoints[0]) {
    return [{
      id: "turning-point-1",
      round: turningPoints[0].round,
      question: "A turning point changed the negotiation. What should a learner examine first?",
      options: [
        "Only the final price",
        "What changed in the issues, offers, or constraints",
        "How quickly the round ended",
        "The agent's personality label"
      ],
      correctIndex: 1,
      concept: "Turning Point Analysis",
      explanation: "Learning comes from connecting the change in outcome to the observable event that caused the shift."
    }];
  }

  return [];
}
