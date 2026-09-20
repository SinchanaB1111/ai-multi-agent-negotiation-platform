// Negotiation analysis derived from the recorded orchestrator state.
// This module is descriptive: it does not alter negotiation decisions.

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function agentOffers(state, agentId) {
  return (state.offers || []).filter((offer) => offer.agentId === agentId);
}

function targetGap(agent, value) {
  const target = num(agent?.negotiation?.targetValue);
  const current = num(value);
  if (target == null || current == null || target === 0) return null;
  return Math.abs(current - target);
}

function directionFor(agent, change) {
  if (!change) return "NO CHANGE";
  if (agent?.decisionType === "minimize") return change < 0 ? "CONCEDED" : "INCREASED";
  return change > 0 ? "CONCEDED" : "DECREASED";
}

export function buildNegotiationAnalysis(state) {
  const agents = state.agents || [];
  const finalValue = num(state.agreement?.offer?.value ?? state.currentOffer?.value);
  const offers = state.offers || [];
  const concessions = state.concessions || [];

  const agentAnalysis = agents.map((agent) => {
    const ownOffers = agentOffers(state, agent.id);
    const first = num(ownOffers[0]?.value);
    const last = num(ownOffers.at(-1)?.value);
    const netMovement = first != null && last != null ? last - first : 0;
    const ownConcessions = concessions.filter((item) => item.agentId === agent.id);
    const totalConcession = ownConcessions.reduce((sum, item) => sum + (num(item.change) || 0), 0);
    const target = num(agent.negotiation?.targetValue);
    const finalGap = targetGap(agent, finalValue);

    return {
      agentId: agent.id,
      agentName: agent.name,
      decisionType: agent.decisionType,
      targetValue: target,
      offerCount: ownOffers.length,
      firstOffer: first,
      lastOffer: last,
      netMovement,
      totalConcession,
      concessionCount: ownConcessions.length,
      finalGap,
      behavior: directionFor(agent, netMovement),
    };
  });

  const totalRounds = Number(state.currentRound || state.turn?.round || 0);
  const totalDecisions = (state.decisions || []).length;
  const counteroffers = (state.counteroffers || []).length;
  const agreement = state.status === "AGREEMENT";

  let targetGapText = "No final value available.";
  if (finalValue != null && agents.length) {
    const gaps = agentAnalysis
      .filter((item) => item.finalGap != null)
      .map((item) => `${item.agentName}: ${item.finalGap.toLocaleString("en-IN")}`);
    targetGapText = gaps.length ? gaps.join(" • ") : targetGapText;
  }

  const notes = [];
  if (agreement) notes.push("The negotiation reached an agreement.");
  else if (state.status === "DEADLOCK") notes.push("The negotiation ended without agreement; review the last counteroffer and remaining gap.");
  else if (state.status === "REJECTED") notes.push("The negotiation ended through rejection.");

  if (concessions.length > 0) notes.push(`${concessions.length} concession movement${concessions.length === 1 ? " was" : "s were"} recorded across the negotiation.`);
  if (counteroffers > 0) notes.push(`${counteroffers} counteroffer${counteroffers === 1 ? "" : "s"} were exchanged.`);
  if (totalRounds > 0) notes.push(`${totalRounds} round${totalRounds === 1 ? "" : "s"} were managed by the orchestrator.`);
  if (totalDecisions > 0) notes.push(`${totalDecisions} decision event${totalDecisions === 1 ? "" : "s"} were recorded.`);

  return {
    status: state.status,
    finalValue,
    rounds: totalRounds,
    offers: offers.length,
    counteroffers,
    decisions: totalDecisions,
    concessions: concessions.length,
    targetGapText,
    agentAnalysis,
    notes,
  };
}
