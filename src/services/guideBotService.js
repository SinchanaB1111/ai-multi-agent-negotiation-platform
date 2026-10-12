import { personalityGuide, guideKnowledgeBase, getPageKey } from "../data/guide/guideKnowledgeBase.js";

const API = (import.meta.env.VITE_AI_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

export function getPageContext(page="Dashboard") { return guideKnowledgeBase[getPageKey(page)] || guideKnowledgeBase.default; }
export function getContextualQuickQuestions(page="Dashboard") { return getPageContext(page).quickQuestions || guideKnowledgeBase.default.quickQuestions; }

function normalize(value) { return String(value || "").trim().toLowerCase(); }
function intent(question) {
  const q = normalize(question);
  if (/\b(start|begin|launch|how do i start)\b/.test(q)) return "start";
  if (/scenario|custom scenario|choose.*scenario/.test(q)) return "scenario";
  if (/agent|configure|role|goal|constraint|personality/.test(q)) return "config";
  if (/aggressive|collaborative|risk.?averse|personality/.test(q)) return "personality";
  if (/deadlock|counteroffer|counter offer|accept|reject|negotiat/.test(q)) return "negotiation";
  if (/report|analytics|score|performance|concession/.test(q)) return "report";
  if (/dashboard|session|history/.test(q)) return "dashboard";
  return "general";
}

export function buildGuideResponse(question, page="Dashboard") {
  const c = getPageContext(page), n = normalize(question), i = intent(question);
  if (!n) return { message: c.greeting, suggestions: c.suggestions };
  if (i === "start") return { message: "Start with Scenarios → choose a context → configure both agents → review constraints/personality → launch the Arena.", suggestions: ["Choose a scenario →", "Configure agents →", "Start negotiation →"] };
  if (i === "scenario") return { message: "Each scenario provides context, participants, goals and constraints. You can also create a custom scenario from the Scenario Library.", suggestions: ["Vendor Pricing", "Job Offer", "Create custom scenario"] };
  if (i === "config") return { message: "Agent Configuration controls identity, role, goal, hard limits and personality. These values influence evaluation, concessions and counteroffers.", suggestions: ["Explain constraints", "Explain personalities", "Start negotiation"] };
  if (i === "personality") {
    if (n.includes("aggressive")) return { message: personalityGuide.aggressive.description, suggestions: ["Explain collaborative", "Explain risk-averse"] };
    if (n.includes("collaborative")) return { message: personalityGuide.collaborative.description, suggestions: ["Explain aggressive", "Explain risk-averse"] };
    if (n.includes("risk")) return { message: personalityGuide["risk-averse"].description, suggestions: ["Explain aggressive", "Explain collaborative"] };
    return { message: "Aggressive protects the position, Collaborative seeks mutual value, and Risk-Averse prioritizes safe outcomes and avoids unnecessary risk.", suggestions: ["Aggressive", "Collaborative", "Risk-Averse"] };
  }
  if (i === "negotiation") return { message: n.includes("deadlock") ? "Deadlock means the current constraints and offers did not produce a mutually acceptable settlement. Review the final gap and concession timeline." : "Each turn evaluates the latest offer against goals, limits, prior offers and personality, then produces Accept, Counter or Reject and updates the negotiation state.", suggestions: ["Review concessions", "Explain counteroffers", "Open reports"] };
  if (i === "report") return { message: "Reports and Analytics show outcome, rounds, offers, concessions, final value, target gaps and a round-by-round transcript.", suggestions: ["Open Reports", "Open Analytics", "View sessions"] };
  if (i === "dashboard") return { message: "The Dashboard summarizes saved sessions, agreement activity and negotiation performance.", suggestions: ["Start negotiation", "View sessions", "Open analytics"] };
  if (i === "general") return { message: `I can answer general questions as well as explain NegoSphere. On ${c.title}, the next useful step is: ${c.nextStep}`, suggestions: c.suggestions };
  return { message: `${c.nextStep} You can ask me about scenarios, agent configuration, personalities, offers, concessions, reports, analytics, or any general question.`, suggestions: c.suggestions };
}

export async function askGuideAI({ question, page="Dashboard", history=[] }) {
  const payload = {
    question: String(question || "").trim(),
    page,
    history: Array.isArray(history) ? history.slice(-12).map((item) => ({ role: item.role, text: String(item.text || "").slice(0, 3000) })) : [],
    pageContext: getPageContext(page),
  };
  if (!payload.question) return buildGuideResponse("", page);

  try {
    const response = await fetch(`${API}/api/guide/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Guide backend returned ${response.status}`);
    const data = await response.json();
    if (!data?.answer) throw new Error("Guide returned an empty answer.");
    return { message: data.answer, suggestions: data.suggestions || [], source: data.source || "AI" };
  } catch (error) {
    console.warn("Guide AI unavailable; using local knowledge fallback.", error.message);
    return { ...buildGuideResponse(payload.question, page), source: "LOCAL" };
  }
}
