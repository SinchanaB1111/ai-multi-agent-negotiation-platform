# Orchestrator Agent Foundation

## Implemented flow

Scenario Selection → Agent Configuration → Negotiation State → Orchestrator → Agent 1 Offer → Agent 2 Evaluation → Accept / Counter / Reject → State Update → Concession Tracking → Next Turn → Agreement / Rejection / Deadlock

## State model

Each session stores:

- scenario
- currentRound and maxRounds
- currentAgentTurn
- previousOffer and currentOffer
- agents with role, goals, constraints and personality
- offers and counteroffers
- decisions
- complete event history
- concession records
- last decision
- agreement information
- termination reason

## LLM-ready agent input

`createAgentInput(agentProfile, negotiationState, history, opponentOffer)` supplies:

- agent persona
- role
- goals
- constraints
- decision type and machine-readable negotiation limits
- current negotiation state
- previous conversation
- opponent offer

## Provider fallback

The backend attempts providers in this order:

1. Gemini
2. Groq
3. OpenAI
4. Local rule-based decision engine

The orchestrator also has a client-side rule-based fallback. Once fallback mode is activated, no further LLM requests are made for that negotiation session.

## Deadlock

A negotiation ends in `DEADLOCK` when the configured maximum number of rounds is reached without agreement or when four recent offers show no meaningful movement. Two identical opening offers alone are not treated as a deadlock.

## Verification

Run:

```bash
npm run verify:negotiation
npm run verify:all-scenarios
```

The second verification runs the complete local fallback negotiation loop across Vendor Pricing Negotiation, Job Offer Negotiation and Project Budget Allocation without requiring external API keys.
