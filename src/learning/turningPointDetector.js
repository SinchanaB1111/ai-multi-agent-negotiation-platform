const OFFER_TYPES = new Set(["OFFER", "COUNTEROFFER", "COUNTER"]);

export function detectTurningPoints(state, tactics = []) {
  const points = [];
  const history = state?.history || [];
  const offers = history.filter((event) => OFFER_TYPES.has(event.type) && Number.isFinite(Number(event.value ?? event.offer?.value)));

  const push = (round, title, explanation, importance = "medium", tacticType = null, evidence = "") => {
    const key = `${round}-${title}`;
    if (!points.some((p) => `${p.round}-${p.title}` === key)) {
      points.push({ id: key, round, title, explanation, importance, tacticType, evidence });
    }
  };

  const firstConcession = (state?.concessions || [])[0];
  if (firstConcession) {
    push(firstConcession.toRound, "First major concession",
      `${firstConcession.agentName || "An agent"} moved from ${firstConcession.previousOffer} to ${firstConcession.currentOffer}, showing that the initial position was negotiable.`,
      "high", "STRATEGIC_CONCESSION", "Recorded concession history");
  }

  tactics.filter((t) => ["CONDITIONAL_CONCESSION", "TRADE_OFF", "VALUE_CREATION", "BUNDLING", "REFRAMING"].includes(t.type))
    .slice(0, 3)
    .forEach((t) => push(t.round, t.type === "CONDITIONAL_CONCESSION" ? "A concession became conditional" : t.title,
      t.explanation, "high", t.type, t.evidence));

  if (offers.length >= 2) {
    const first = Number(offers[0].value);
    const last = Number(offers.at(-1).value);
    const range = Math.abs(first - last);
    const base = Math.max(1, Math.abs(first));
    if (range / base >= 0.05) {
      push(offers.at(-1).round, "Negotiation gap materially changed",
        `The recorded offer path moved by about ${Math.round((range / base) * 100)}% from the first offer to the latest recorded offer.`,
        "medium", null, `${first} → ${last}`);
    }
  }

  const deadlock = history.find((event) => event.event === "DEADLOCK" || event.type === "DEADLOCK");
  if (deadlock) push(deadlock.round, "Deadlock",
    deadlock.message || state.terminationReason || "Recent positions stopped moving.",
    "high", "DEADLOCK_HANDLING", "Deadlock event recorded");

  if (state.status === "AGREEMENT" && state.agreement?.round) {
    push(state.agreement.round, "Final agreement",
      `The negotiation converged at ${state.agreement.offer?.value ?? "the recorded offer"}.`,
      "high", null, "Agreement event recorded");
  }

  return points.sort((a, b) => Number(a.round) - Number(b.round));
}
