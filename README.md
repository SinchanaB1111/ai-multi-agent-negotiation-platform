# AI Multi-Agent Negotiation Platform

## Practice Mode orchestration update

Practice Mode now uses the same central negotiation orchestration layer as Simulation Mode.

### Orchestrator responsibilities
- Records every human and AI offer in `state.offers`.
- Records every offer/counteroffer/decision/system event in `state.history`.
- Calculates concessions from each agent's previous offer using `concessionTracker.js`.
- Maintains `state.concessions` and aggregate negotiation metrics.
- Owns round progression: one complete human → AI exchange advances the practice round.
- Maintains the active agent and canonical `state.turn` object.
- Enforces hard negotiation constraints and the existing convergence safeguards.
- Handles LLM failure through the rule-based fallback path.

### Practice UI
`PracticeArena.jsx` only collects human input and delegates the negotiation turn to:

`processPracticeOffer(state, humanOffer)` in `src/logic/orchestrator.js`.

This prevents Practice Mode from maintaining a second, conflicting round/history/concession implementation.

## Verification

Run:

```bash
npm run verify:practice-orchestrator
npm run verify:practice
npm run verify:negotiation
npm run verify:all-scenarios
npm run lint
npm run build
```

## Practice Mode decision control

Practice Mode supports two independent decision makers:

- **AI/LLM:** Gemini may return `ACCEPT`, `REJECT`, or `COUNTER`. Valid LLM decisions are respected by the orchestrator. The orchestrator only validates/sanitizes malformed counteroffer amounts. If all LLM providers fail, the existing rule-based fallback is used.
- **Human participant:** when the AI has made the current offer, the participant can **Accept Offer**, **Reject Offer**, or submit a new counteroffer at any time. Human decisions are recorded through the same orchestrator decision/history pipeline.

The orchestrator remains responsible for round advancement, negotiation status, history, and concession tracking.
