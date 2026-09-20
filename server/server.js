/* global process */
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Primary + backup LLM providers.
const GEMINI_MODEL = "gemini-3.6-flash";
const GROQ_MODEL = "openai/gpt-oss-120b";
const OPENAI_MODEL = "gpt-5.6-luna";
const MAX_GEMINI_RETRIES = 2;

app.use(express.json());

// Allow the Vite frontend to call the local backend during development/demo.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const VALID_DECISIONS = [
  "MAKE_OFFER",
  "ACCEPT",
  "REJECT",
  "COUNTER",
];

const NEGOTIATION_SCHEMA = {
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: VALID_DECISIONS,
    },
    reason: {
      type: "string",
    },
    counterOffer: {
      type: ["number", "null"],
    },
  },
  required: ["decision", "reason", "counterOffer"],
};

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout(promise, milliseconds, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out after ${milliseconds}ms.`);
      error.status = 504;
      reject(error);
    }, milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchWithTimeout(url, options, milliseconds, provider) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`${provider} timed out after ${milliseconds}ms.`);
      timeoutError.status = 504;
      timeoutError.provider = provider;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getErrorStatus(error) {
  return error?.status || error?.statusCode || error?.code || null;
}

function isTransientError(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(getErrorStatus(error));

  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("unavailable")
  );
}

function isQuotaOrRateLimit(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(getErrorStatus(error));

  return (
    status === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

async function readErrorResponse(response, provider) {
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const message =
    body?.error?.message ||
    body?.message ||
    `${provider} request failed with HTTP ${response.status}.`;

  const error = new Error(message);
  error.status = response.status;
  error.provider = provider;
  error.details = body;
  throw error;
}

function parseNegotiationJson(text, provider) {
  if (!text) {
    const error = new Error(`${provider} returned an empty response.`);
    error.provider = provider;
    throw error;
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    const error = new Error(`${provider} returned invalid JSON.`);
    error.provider = provider;
    throw error;
  }

  if (!VALID_DECISIONS.includes(result.decision)) {
    const error = new Error(`${provider} returned an invalid negotiation decision.`);
    error.provider = provider;
    throw error;
  }

  if (
    (result.decision === "MAKE_OFFER" || result.decision === "COUNTER") &&
    (typeof result.counterOffer !== "number" ||
      !Number.isFinite(result.counterOffer) ||
      result.counterOffer <= 0)
  ) {
    const error = new Error(`${provider} returned an invalid offer amount.`);
    error.provider = provider;
    throw error;
  }

  if (result.decision === "ACCEPT" || result.decision === "REJECT") {
    result.counterOffer = null;
  }

  return result;
}

function buildNegotiationPrompt(agentInput) {
  const hasOpponentOffer =
    agentInput.opponentOffer !== null &&
    agentInput.opponentOffer !== undefined;

  return `
You are an AI negotiation agent participating in a realistic multi-agent negotiation simulation.

Your job is to make the best negotiation decision based on:
- Your role
- Your goal and negotiation objective
- Your hard constraints
- Your personality
- Current negotiation round
- Previous offers and counteroffers
- Concessions already made
- Full negotiation history
- Opponent's current offer

========================================
AGENT NEGOTIATION DATA
========================================
${JSON.stringify(agentInput, null, 2)}

========================================
IMPORTANT RULES
========================================
1. Never violate hard constraints.
2. Never invent facts that are not in the supplied state.
3. Consider previous concessions before proposing a new offer.
4. Make gradual, realistic concessions.
5. Do not repeat the same offer unless there is a clear strategic reason.
6. Use the agent's personality when choosing how aggressively to concede.
7. Do not accept too early just because an offer is close to the target; consider the current round and previous negotiation movement.
8. Do not reject merely because the offer is not perfect. Reject when it is outside an important constraint or the negotiation cannot reasonably continue.

========================================
DECISION
========================================
${hasOpponentOffer ? "There is an opponent offer. Choose exactly one: ACCEPT, COUNTER, or REJECT." : "There is no opponent offer. You MUST choose MAKE_OFFER."}

MAKE_OFFER:
- Create a realistic opening position based on target, constraints, personality and scenario.

ACCEPT:
- Use only when the opponent's offer satisfies the agent's objectives and is reasonable to accept at this point.
- counterOffer must be null.

COUNTER:
- Use when the offer is negotiable but needs improvement.
- Generate a counteroffer that remains inside hard constraints.
- Move gradually from your previous position toward a possible agreement.

REJECT:
- Use when the offer violates an important hard constraint or the negotiation cannot reasonably continue.
- counterOffer must be null.

========================================
PERSONALITY
========================================
Aggressive: protect the target strongly and make smaller concessions.
Collaborative: seek a mutually acceptable middle ground with reasonable concessions.
Risk-Averse: protect constraints carefully and avoid risky concessions.

========================================
OUTPUT
========================================
Return ONLY valid JSON with exactly this structure:
{
  "decision": "MAKE_OFFER | ACCEPT | COUNTER | REJECT",
  "reason": "Short explanation",
  "counterOffer": 50000
}

For ACCEPT and REJECT, counterOffer must be null.
For MAKE_OFFER and COUNTER, counterOffer must be a positive number.
`;
}

async function generateGeminiContent(request) {
  if (!ai) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.provider = "GEMINI";
    throw error;
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await withTimeout(
        ai.models.generateContent(request),
        10000,
        "Gemini"
      );
    } catch (error) {
      if (!isTransientError(error) || attempt >= MAX_GEMINI_RETRIES) {
        throw error;
      }

      const delay = Math.min(4000, 700 * 2 ** attempt);
      console.warn(
        `Gemini temporary failure (${getErrorStatus(error) || "unknown"}); retrying in ${delay}ms.`
      );
      await wait(delay);
    }
  }
}

async function callGemini(prompt) {
  const response = await generateGeminiContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: NEGOTIATION_SCHEMA,
    },
  });

  const result = parseNegotiationJson(response?.text, "Gemini");

  return {
    result,
    provider: "GEMINI",
    model: GEMINI_MODEL,
  };
}

async function callGroq(prompt) {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error("GROQ_API_KEY is not configured.");
    error.provider = "GROQ";
    throw error;
  }

  const response = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a negotiation decision engine. Return only valid JSON matching the requested structure.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
    },
    10000,
    "GROQ"
  );

  if (!response.ok) {
    await readErrorResponse(response, "GROQ");
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  const result = parseNegotiationJson(text, "Groq");

  return {
    result,
    provider: "GROQ",
    model: GROQ_MODEL,
  };
}

function extractOpenAIOutputText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

async function callOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.provider = "OPENAI";
    throw error;
  }

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "negotiation_decision",
          strict: true,
          schema: NEGOTIATION_SCHEMA,
        },
      },
    }),
    },
    10000,
    "OPENAI"
  );

  if (!response.ok) {
    await readErrorResponse(response, "OPENAI");
  }

  const data = await response.json();
  const text = extractOpenAIOutputText(data);
  const result = parseNegotiationJson(text, "OpenAI");

  return {
    result,
    provider: "OPENAI",
    model: OPENAI_MODEL,
  };
}

async function generateWithProviderFallback(agentInput) {
  const prompt = buildNegotiationPrompt(agentInput);
  const attempts = [];

  const providers = [
    ["GEMINI", () => callGemini(prompt)],
    ["GROQ", () => callGroq(prompt)],
    ["OPENAI", () => callOpenAI(prompt)],
  ];

  for (const [name, call] of providers) {
    try {
      const response = await call();
      console.log(`✅ Negotiation response generated by ${response.provider} (${response.model})`);
      return {
        ...response,
        attempts,
      };
    } catch (error) {
      const status = getErrorStatus(error);
      attempts.push({
        provider: name,
        status,
        reason: error?.message || "Provider failed.",
      });

      console.warn(
        `⚠️ ${name} failed (${status || "unknown"}): ${error?.message || "unknown error"}`
      );
    }
  }

  const error = new Error("All configured LLM providers failed.");
  error.status = 503;
  error.provider = "ALL";
  error.attempts = attempts;
  throw error;
}

// =====================================================
// RULE-BASED FALLBACK
// =====================================================
// The backend must remain demo-safe even when every LLM provider
// is unavailable, rate-limited, out of quota, or misconfigured.

function getFallbackThreshold(agent) {
  const negotiation = agent?.negotiation || {};
  const target = Number(negotiation.targetValue);
  if (!Number.isFinite(target)) return null;

  const personality = String(agent?.personality || "Collaborative").toLowerCase();
  const tolerance =
    personality.includes("aggressive") ? 0 :
    personality.includes("risk") ? 0.01 :
    0.03;

  if (agent?.decisionType === "minimize") {
    return Math.min(
      Number(negotiation.maximumAcceptable ?? target),
      target * (1 + tolerance)
    );
  }

  return Math.max(
    Number(negotiation.minimumAcceptable ?? target),
    target * (1 - tolerance)
  );
}

function generateRuleBasedFallback(agentInput) {
  const agent = {
    ...agentInput?.agentPersona,
    role: agentInput?.role,
    personality: agentInput?.agentPersona?.personality,
    decisionType: agentInput?.decisionType,
    negotiation: agentInput?.negotiation,
  };

  // agentInput normally carries the machine-readable negotiation fields
  // through current implementation. Also support nested variants for safety.
  const negotiation =
    agentInput?.negotiation ||
    agentInput?.agentNegotiation ||
    agentInput?.currentNegotiationState?.negotiation ||
    agent.negotiation ||
    {};

  agent.negotiation = negotiation;
  agent.decisionType =
    agentInput?.decisionType ||
    agentInput?.decision_type ||
    agent?.decisionType;

  const target = Number(negotiation.targetValue);
  const minimum = Number(negotiation.minimumAcceptable);
  const maximum = Number(negotiation.maximumAcceptable);
  const opponent = agentInput?.opponentOffer;

  if (!Number.isFinite(target)) {
    return {
      decision: "REJECT",
      reason: "Negotiation constraints are incomplete.",
      counterOffer: null,
    };
  }

  if (!opponent || !Number.isFinite(Number(opponent.value))) {
    return {
      decision: "MAKE_OFFER",
      reason: "Opening offer generated by the rule-based negotiation engine.",
      counterOffer: Math.round(target),
    };
  }

  const value = Number(opponent.value);
  const threshold = getFallbackThreshold(agent);

  if (agent.decisionType === "minimize") {
    if (Number.isFinite(maximum) && value > maximum) {
      return {
        decision: "REJECT",
        reason: `Offer exceeds the maximum acceptable limit of ${maximum}.`,
        counterOffer: null,
      };
    }

    if (value <= threshold) {
      return {
        decision: "ACCEPT",
        reason: "Offer meets the current acceptance boundary.",
        counterOffer: null,
      };
    }

    const counter = Math.round((target + value) / 2);
    return {
      decision: "COUNTER",
      reason: "Offer is negotiable, so a gradual counteroffer is proposed.",
      counterOffer: Math.min(
        Number.isFinite(maximum) ? maximum : counter,
        Math.max(1, counter)
      ),
    };
  }

  if (agent.decisionType === "maximize") {
    if (Number.isFinite(minimum) && value < minimum) {
      return {
        decision: "REJECT",
        reason: `Offer is below the minimum acceptable limit of ${minimum}.`,
        counterOffer: null,
      };
    }

    if (value >= threshold) {
      return {
        decision: "ACCEPT",
        reason: "Offer meets the current acceptance boundary.",
        counterOffer: null,
      };
    }

    const counter = Math.round((target + value) / 2);
    return {
      decision: "COUNTER",
      reason: "Offer is negotiable, so a gradual counteroffer is proposed.",
      counterOffer: Math.max(
        Number.isFinite(minimum) ? minimum : 1,
        counter
      ),
    };
  }

  return {
    decision: "REJECT",
    reason: "Agent decision type is not configured.",
    counterOffer: null,
  };
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
});

// =====================================================
// PROVIDER STATUS
// =====================================================

app.get("/api/llm/status", (req, res) => {
  res.json({
    success: true,
    primary: "GEMINI",
    fallbackOrder: ["GROQ", "OPENAI", "RULE_BASED"],
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    models: {
      gemini: GEMINI_MODEL,
      groq: GROQ_MODEL,
      openai: OPENAI_MODEL,
    },
  });
});

// =====================================================
// GEMINI TEST
// =====================================================

app.get("/api/test-gemini", async (req, res) => {
  try {
    const response = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: "Reply with only: GEMINI_WORKING",
    });

    res.json({
      success: true,
      message: response.text,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    res.status(Number(getErrorStatus(error)) === 429 ? 429 : 500).json({
      success: false,
      quotaExceeded: isQuotaOrRateLimit(error),
      error: error?.message || "Gemini request failed.",
    });
  }
});

// =====================================================
// NEGOTIATION AGENT RESPONSE
// =====================================================

app.post("/api/negotiation/agent-response", async (req, res) => {
  const agentInput = req.body?.agentInput;

  try {

    if (!agentInput) {
      return res.status(400).json({
        success: false,
        error: "agentInput is required.",
      });
    }

    const hasOpponentOffer =
      agentInput.opponentOffer !== null &&
      agentInput.opponentOffer !== undefined;

    const response = await generateWithProviderFallback(agentInput);
    const result = response.result;

    // Opening turn must always create an opening offer.
    if (!hasOpponentOffer && result.decision !== "MAKE_OFFER") {
      const error = new Error(
        `${response.provider} failed to generate a valid opening offer.`
      );
      error.status = 422;
      throw error;
    }

    return res.json({
      success: true,
      source: response.provider,
      provider: response.provider,
      model: response.model,
      attempts: response.attempts,
      result,
    });
  } catch (error) {
    console.warn("⚠️ All LLM providers unavailable. Using rule-based fallback.", error?.message || error);

    const fallbackResult = generateRuleBasedFallback(agentInput);

    return res.json({
      success: true,
      source: "RULE_BASED",
      provider: "RULE_BASED",
      model: "local-decision-engine",
      fallback: true,
      quotaExceeded: isQuotaOrRateLimit(error),
      attempts: error?.attempts || [],
      result: fallbackResult,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
