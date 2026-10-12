export function buildTakeaways(state, tactics = [], turningPoints = []) {
  const takeaways = [];
  const has = (type) => tactics.some((item) => item.type === type);

  const add = (title, lesson, evidence) => {
    if (!takeaways.some((item) => item.title === title)) takeaways.push({ title, lesson, evidence });
  };

  if (has("ANCHORING")) add("Recognize the opening anchor",
    "The first credible number can shape the range of later offers. Test the anchor instead of treating it as the natural price.",
    "Anchoring was detected in an opening offer.");
  if (has("CONDITIONAL_CONCESSION")) add("Make concessions conditional",
    "Exchange movement for something valuable instead of conceding without a return.",
    "A recorded offer linked movement to a condition or term.");
  if (has("STRATEGIC_CONCESSION")) add("Concede deliberately",
    "Small, well-timed movements can reveal flexibility while protecting the rest of your bargaining position.",
    "The offer history contains a meaningful position change.");
  if (has("TRADE_OFF") || has("VALUE_CREATION") || has("BUNDLING")) add("Negotiate across issues",
    "When price alone is stuck, introduce other issues that can be traded to create mutual value.",
    "A multi-issue or reciprocal exchange was detected.");
  if (has("INFORMATION_DISCOVERY")) add("Discover priorities",
    "Ask or respond to information about needs, constraints, timing, or priorities before giving away value.",
    "Recorded negotiation text contains evidence of priority discovery.");
  if (has("PRESSURE_TACTIC")) add("Handle pressure without rushing",
    "Urgency can change the decision environment. Separate a real constraint from a tactic before accepting a worse trade.",
    "A deadline or urgency cue was recorded.");
  if (turningPoints.length) add("Study the turning points",
    "The most useful learning moments are where the negotiation changes direction: a new issue, a concession, a trade-off, or convergence.",
    `${turningPoints.length} turning point${turningPoints.length === 1 ? "" : "s"} were identified from the recorded history.`);

  if (!takeaways.length) add("Watch the evidence",
    "Use the recorded offers, decisions, and concessions to identify what changed the bargaining position.",
    "There is not yet enough evidence for a stronger tactic-specific takeaway.");

  return takeaways.slice(0, 6);
}
