# Negotiation Decision & Concession Module

## Decision model

The rule-based engine evaluates each incoming offer using the agent's target, hard constraint and personality-aware acceptance boundary. It returns `ACCEPT`, `COUNTER`, or `REJECT`. Opening turns use `MAKE_OFFER`.

### MINIMIZE agents

| Condition | Decision | Meaning |
|---|---|---|
| Offer <= acceptance boundary | ACCEPT | Offer meets the current preferred boundary. |
| Acceptance boundary < Offer <= hard maximum | COUNTER | Offer is negotiable, but the agent wants better terms. |
| Offer > hard maximum | REJECT | Offer violates the hard constraint. |

### MAXIMIZE agents

| Condition | Decision | Meaning |
|---|---|---|
| Offer >= acceptance boundary | ACCEPT | Offer meets the current preferred boundary. |
| Hard minimum <= Offer < acceptance boundary | COUNTER | Offer is negotiable, but the agent wants better terms. |
| Offer < hard minimum | REJECT | Offer violates the hard constraint. |

## Counteroffer generation

Counteroffers move toward the agent's target while respecting hard constraints. Personality changes the concession step:

- **Aggressive:** smaller concessions.
- **Collaborative:** moves toward a practical middle ground.
- **Risk-Averse:** protects the target more strongly.

If both sides repeat the same value, the engine moves toward the agent's target rather than producing an identical counteroffer.

## Concession tracking

For every agent, the system records movement between consecutive offers made by that agent:

- previous offer
- current offer
- round movement
- direction (`INCREASE`, `DECREASE`, `NO CHANGE`)
- absolute change

Large movements can be checked with `hasExcessiveConcession`.

## LLM integration

The backend sends the agent persona, role, goals, constraints, current state, complete conversation history and opponent offer to the LLM layer. Provider order is Gemini → Groq → OpenAI. If all providers are unavailable, the backend returns a successful structured response from the local rule-based engine so the demo can continue without an API outage.
