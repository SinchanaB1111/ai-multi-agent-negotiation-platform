// src/logic/geminiAgent.js

import { createAgentInput } from "./agentInput.js";

/**
 * Sends the current negotiation state to the backend.
 *
 * Gemini can:
 *
 * MAKE_OFFER → Create an opening offer
 * ACCEPT     → Accept opponent's offer
 * REJECT     → Reject opponent's offer
 * COUNTER    → Create a counteroffer
 *
 * The Gemini API key stays on the backend.
 */
export async function generateGeminiAgentResponse(
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

  // ------------------------------------
  // Create standard agent input
  // ------------------------------------

  const input = createAgentInput(
    agentProfile,
    negotiationState,
    history,
    opponentOffer
  );

  // ------------------------------------
  // Send request to backend
  // ------------------------------------

  const backendUrl =
    (import.meta.env?.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

  const response = await fetch(
    `${backendUrl}/api/negotiation/agent-response`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        agentInput: input,
      }),
    }
  );

  // ------------------------------------
  // Read backend response
  // ------------------------------------

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Backend returned an invalid response."
    );
  }

  if (!response.ok || !data.success) {
    const error = new Error(
      data.error ||
        "LLM negotiation request failed."
    );
    error.status = response.status;
    error.code = response.status;
    error.provider = data.provider || "ALL";
    error.attempts = data.attempts || [];
    throw error;
  }

  // ------------------------------------
  // Validate Gemini result
  // ------------------------------------

  const validDecisions = [
    "MAKE_OFFER",
    "ACCEPT",
    "REJECT",
    "COUNTER",
  ];

  if (
    !data.result ||
    !validDecisions.includes(data.result.decision)
  ) {
    throw new Error(
      "Gemini returned an invalid negotiation decision."
    );
  }

  // ------------------------------------
  // Validate generated offer
  // ------------------------------------

  if (
    (
      data.result.decision === "MAKE_OFFER" ||
      data.result.decision === "COUNTER"
    ) &&
    (
      typeof data.result.counterOffer !== "number" ||
      !Number.isFinite(data.result.counterOffer) ||
      data.result.counterOffer <= 0
    )
  ) {
    throw new Error(
      "Gemini returned an invalid offer amount."
    );
  }

  // ------------------------------------
  // Return normalized response
  // ------------------------------------

  return {
    ...data.result,

    type: "LLM_RESPONSE",

    source: data.source || data.provider || "GEMINI",

    provider: data.provider || data.source || "GEMINI",

    model: data.model || null,

    attempts: data.attempts || [],

    agentId: agentProfile.id,

    agentName: agentProfile.name,

    round: negotiationState.currentRound,

    input,

    // Gemini generated amount.
    // For MAKE_OFFER this is the opening offer.
    // For COUNTER this is the counteroffer.
    counterOffer:
      data.result.counterOffer ?? null,
  };
}