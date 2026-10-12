const OFFER_TYPES = new Set(["OFFER", "COUNTEROFFER", "COUNTER"]);

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  const n = numeric(value);
  return n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function positionContext(agent, value) {
  const target = numeric(agent?.negotiation?.targetValue);
  const min = numeric(agent?.negotiation?.minimumAcceptable);
  const max = numeric(agent?.negotiation?.maximumAcceptable);
  if (target == null) return "";
  if (agent?.decisionType === "minimize") {
    const relation = value <= target ? "at or below the preferred target" : "above the preferred target";
    return `${money(value)} is ${relation} of ${money(target)}${max != null ? `, with a hard maximum of ${money(max)}` : ""}.`;
  }
  const relation = value >= target ? "at or above the preferred target" : "below the preferred target";
  return `${money(value)} is ${relation} of ${money(target)}${min != null ? `, with a hard minimum of ${money(min)}` : ""}.`;
}

function offerEvents(state) {
  return (state?.history || []).filter((event) => OFFER_TYPES.has(event.type) && numeric(event.value ?? event.offer?.value) != null);
}

function agentById(state, id) {
  return state?.agents?.find((agent) => agent.id === id) || null;
}

function previousOfferByAgent(events, agentId, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (events[i].agentId === agentId) return events[i];
  }
  return null;
}

function textOf(event) {
  return [
    event?.reason,
    event?.message,
    event?.terms,
    event?.response?.reason,
    event?.response?.message,
  ].filter(Boolean).join(" ").toLowerCase();
}

function tactic(round, agent, type, title, explanation, evidence, lesson, value, extra = {}) {
  return {
    id: `${type}-${round}-${agent?.id || "system"}`,
    round,
    agentId: agent?.id || null,
    agentName: agent?.name || "Negotiation",
    type,
    title,
    explanation,
    evidence,
    lesson,
    value: value ?? null,
    ...extra,
  };
}

export function detectTactics(state) {
  const events = offerEvents(state);
  const results = [];

  events.forEach((event, index) => {
    const value = numeric(event.value ?? event.offer?.value);
    const agent = agentById(state, event.agentId);
    const text = textOf(event);
    const previous = previousOfferByAgent(events, event.agentId, index);
    const previousValue = previous ? numeric(previous.value ?? previous.offer?.value) : null;
    const isOpening = !previous;

    if (isOpening) {
      const peers = events.filter((item) => item.agentId !== event.agentId).map((item) => numeric(item.value ?? item.offer?.value)).filter((v) => v != null);
      const target = numeric(agent?.negotiation?.targetValue);
      const peer = peers[0];
      const unusuallyFar = target != null && Math.abs(value - target) / Math.max(1, Math.abs(target)) >= 0.08;
      const establishesReference = peer == null || (target != null && unusuallyFar);
      if (establishesReference) {
        results.push(tactic(event.round, agent, "ANCHORING", "Anchoring",
          `${agent?.name || "The agent"} established an early reference point with the opening offer.`,
          `Opening offer: ${money(value)}. ${positionContext(agent, value)}`,
          `The first credible number can influence the bargaining range. Here, the opening position was deliberately ${target != null && value < target ? "below" : "above"} the preferred target, leaving room for controlled concessions.`,
          value));
      }
    }

    if (event.type === "COUNTEROFFER" || event.type === "COUNTER") {
      results.push(tactic(event.round, agent, "COUNTER_OFFER", "Counter-offer",
        `${agent?.name || "The agent"} responded to the other side's position with a new offer.`,
        `Recorded response value: ${value}.`,
        "A counter-offer keeps the negotiation active while moving the reference point.",
        value));
    }

    if (previousValue != null && value !== previousValue) {
      const change = Math.abs(value - previousValue);
      const pct = change / Math.max(1, Math.abs(previousValue));
      const condition = /\b(if|when|provided|provided that|in exchange|provided you|commit|agreement|term|delivery|volume|duration|contract|payment|timeline|quantity)\b/.test(text);

      if (condition) {
        results.push(tactic(event.round, agent, "CONDITIONAL_CONCESSION", "Conditional Concession",
          `${agent?.name || "The agent"} changed its offer while linking the movement to a condition or term.`,
          `Previous offer: ${money(previousValue)} → current offer: ${money(value)}. Recorded context: ${text.slice(0, 180)}.`,
          `The concession of ${money(change)} was not given away without a condition. Linking price movement to a reciprocal term protects value and gives the other side a reason to move too.`,
          value, { change }));
      } else if (pct >= 0.015) {
        results.push(tactic(event.round, agent, "STRATEGIC_CONCESSION", "Strategic Concession",
          `${agent?.name || "The agent"} moved its position instead of holding the previous offer.`,
          `Offer moved from ${money(previousValue)} to ${money(value)} (${Math.round(pct * 100)}%). ${positionContext(agent, value)}`,
          `The move was ${money(change)} and preserved distance from the hard boundary. A measured concession can signal flexibility without giving away the full bargaining position.`,
          value, { change }));
      }
    }

    if (/\b(if|in exchange|trade|swap|instead|rather than|delivery|volume|term|timeline|duration|quantity|payment)\b/.test(text)) {
      results.push(tactic(event.round, agent, "TRADE_OFF", "Trade-off",
        `${agent?.name || "The agent"} connected the offer to another issue or reciprocal term.`,
        text.slice(0, 220),
        "Trading across issues can create room for agreement when one issue is constrained.",
        value));
    }

    const hasBundlingSignal = /\b(bundl|package|combine|together|all[- ]in|includes)\b/.test(text);
    const hasMultipleElements = ["price", "delivery", "volume", "support", "warranty", "payment", "timeline", "duration", "quantity", "service", "terms"].filter((term) => text.includes(term)).length >= 2;
    if (hasBundlingSignal && hasMultipleElements) {
      results.push(tactic(event.round, agent, "BUNDLING", "Bundling",
        `${agent?.name || "The agent"} bundled multiple elements into one proposal.`,
        text.slice(0, 220),
        "Bundling can make the total package more valuable than negotiating each item separately.",
        value));
    }

    const informationSignal = /\b(why|what matters|what do you need|priority|priorities|prefer|preference|concern|tell me|which matters|would you consider|what is important)\b/.test(text);
    if (informationSignal) {
      results.push(tactic(event.round, agent, "INFORMATION_DISCOVERY", "Information Discovery",
        `${agent?.name || "The agent"} used the recorded exchange to surface a priority or requirement.`,
        text.slice(0, 220),
        "Learning what the other side values helps you trade concessions rather than guess.",
        value));
    }

    if (/\b(final|last|take it|deadline|urgent|must decide|cannot wait|now or)\b/.test(text)) {
      results.push(tactic(event.round, agent, "PRESSURE_TACTIC", "Pressure Tactic",
        `${agent?.name || "The agent"} introduced urgency or a firm deadline.`,
        text.slice(0, 220),
        "Pressure can narrow the other side's perceived options, but it can also damage trust if overused.",
        value));
    }

    if (/\b(however|instead|rather|not just|beyond|reframe|focus on|overall value|total value)\b/.test(text)) {
      results.push(tactic(event.round, agent, "REFRAMING", "Reframing",
        `${agent?.name || "The agent"} shifted attention from the immediate position to a different interpretation of value.`,
        text.slice(0, 220),
        "Reframing can move the conversation away from a fixed position and toward interests or total value.",
        value));
    }
  });

  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.round}|${item.agentId}|${item.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
