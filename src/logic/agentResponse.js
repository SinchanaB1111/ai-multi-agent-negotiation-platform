// src/logic/agentResponse.js

import { evaluateOffer, DECISION, explainDecision } from "./decisionEngine.js";
import { createAgentInput } from "./agentInput.js";

function resolveApiUrl() {
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : "http://localhost:3001";

  return `${base.replace(/\/$/, "")}/api/negotiation/agent-response`;
}

async function callLLMReasoning(
  agentProfile,
  negotiationState,
  history,
  opponentOffer
) {
  const input = createAgentInput(
    agentProfile,
    negotiationState,
    history,
    opponentOffer
  );

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentInput: input }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Gemini negotiation request failed.");
  }

  const result = data.result || {};

  return {
    type: "LLM_RESPONSE",
    decision: result.decision || null,
    action:
      result.decision === "ACCEPT"
        ? "ACCEPT"
        : result.decision === "REJECT"
        ? "REJECT"
        : result.decision === "COUNTER"
        ? "COUNTEROFFER"
        : "MAKE_OFFER",
    agentId: agentProfile.id,
    round: negotiationState.currentRound,
    opponentOffer: opponentOffer?.value ?? null,
    counterOffer: result.counterOffer ?? null,
    reason: result.reason || "LLM generated a negotiation response.",
    input,
    relevantParameters: {
      role: agentProfile.role,
      personality: agentProfile.personality,
      goals: agentProfile.goals || [agentProfile.goal],
      constraints: agentProfile.constraints,
      targetValue: agentProfile.negotiation?.targetValue ?? null,
      maximumAcceptable: agentProfile.negotiation?.maximumAcceptable ?? null,
      minimumAcceptable: agentProfile.negotiation?.minimumAcceptable ?? null,
    },
  };
}

function fallbackDecision(
  agentProfile,
  negotiationState,
  history,
  opponentOffer
) {
  const input = createAgentInput(
    agentProfile,
    negotiationState,
    history,
    opponentOffer
  );

  if (!opponentOffer) {
    return {
      type: "MOCK_RESPONSE",
      decision: null,
      action: "MAKE_OFFER",
      agentId: agentProfile.id,
      round: negotiationState.currentRound,
      input,
      reason: "No opponent offer exists; the active agent must submit the opening offer.",
      counterOffer: null,
      relevantParameters: {
        role: agentProfile.role,
        personality: agentProfile.personality,
        goals: agentProfile.goals || [agentProfile.goal],
        constraints: agentProfile.constraints,
      },
    };
  }

  const decision = evaluateOffer(agentProfile, opponentOffer.value);

  return {
    type: "MOCK_RESPONSE",
    decision,
    action:
      decision === DECISION.ACCEPT
        ? "ACCEPT"
        : decision === DECISION.REJECT
        ? "REJECT"
        : "COUNTEROFFER",
    agentId: agentProfile.id,
    round: negotiationState.currentRound,
    opponentOffer: opponentOffer.value,
    counterOffer: null,
    input,
    reason: explainDecision(agentProfile, opponentOffer.value, decision),
    relevantParameters: {
      role: agentProfile.role,
      personality: agentProfile.personality,
      goals: agentProfile.goals || [agentProfile.goal],
      constraints: agentProfile.constraints,
      targetValue: agentProfile.negotiation?.targetValue ?? null,
      maximumAcceptable: agentProfile.negotiation?.maximumAcceptable ?? null,
      minimumAcceptable: agentProfile.negotiation?.minimumAcceptable ?? null,
    },
  };
}

export async function generate_agent_response(
  agentProfile,
  negotiationState,
  history = negotiationState?.history || [],
  opponentOffer = negotiationState?.currentOffer || null
) {
  if (!agentProfile) {
    throw new Error("Agent profile is required.");
  }

  if (!negotiationState) {
    throw new Error("Negotiation state is required.");
  }

  try {
    return await callLLMReasoning(
      agentProfile,
      negotiationState,
      history,
      opponentOffer
    );
  } catch (error) {
    console.warn("LLM negotiation service unavailable, using fallback rule engine.", error);
    return fallbackDecision(
      agentProfile,
      negotiationState,
      history,
      opponentOffer
    );
  }
}

export async function generateAgentResponse(
  agentProfile,
  negotiationState,
  history = negotiationState?.history || [],
  opponentOffer = negotiationState?.currentOffer || null
) {
  return generate_agent_response(
    agentProfile,
    negotiationState,
    history,
    opponentOffer
  );
}

export async function generateGeminiAgentResponse(
  agentProfile,
  negotiationState,
  history = negotiationState?.history || [],
  opponentOffer = negotiationState?.currentOffer || null
) {
  return generate_agent_response(
    agentProfile,
    negotiationState,
    history,
    opponentOffer
  );
}
