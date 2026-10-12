import os
import json
import logging
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger("guide_service")

GUIDE_KNOWLEDGE_BASE = {
    "topics": [
        {
            "id": "agent_personas",
            "name": "Agent Policy Modes & Personas",
            "description": "Aggressive, Collaborative, and Risk-averse negotiator policies.",
            "details": "Aggressive agents anchor aggressively and concede slowly (~10%). Collaborative agents aim for quick win-win convergence (~35% concession rate). Risk-averse agents prioritize securing agreement safely (~25% concession rate)."
        },
        {
            "id": "constraint_validation",
            "name": "Hard Constraint Enforcement",
            "description": "Strict validation rules preventing out-of-bounds proposals.",
            "details": "The backend automatically validates every proposal against maximum budget limits (e.g. Buyer limit) and minimum floor prices (e.g. Vendor floor). Out-of-bounds proposals are rejected or clamped to valid limits."
        },
        {
            "id": "orchestrator_flow",
            "name": "Negotiation Orchestration Lifecycle",
            "description": "Turn-by-turn state progression across rounds.",
            "details": "Each round contains one turn per agent. The Orchestrator manages current active turn, history persistence, constraint checks, and termination evaluation (agreement, rejection, deadlock)."
        }
    ]
}

def answer_guide_query(query: str, context_scenario: str = "vendor_pricing") -> Dict[str, Any]:
    """
    Answers user queries about negotiation strategies, scenario parameters, and system rules.
    """
    q_lower = query.lower()

    # Rule-based quick responses for standard topics
    for topic in GUIDE_KNOWLEDGE_BASE["topics"]:
        if any(w in q_lower for w in topic["id"].split("_")) or topic["name"].lower() in q_lower:
            return {
                "answer": f"**{topic['name']}**: {topic['details']}",
                "topic": topic["id"],
                "suggested_actions": ["Run Simulation", "Configure Agents", "View Analytics"]
            }

    if "how" in q_lower or "what" in q_lower or "help" in q_lower:
        return {
            "answer": "The AI Negotiation Platform allows two AI agents (such as a Buyer and Vendor) to negotiate over multiple rounds. The backend enforces hard constraints, tracks concession velocity, and generates context-aware counteroffers.",
            "topic": "overview",
            "suggested_actions": ["Start Vendor Pricing Scenario", "Configure Custom Agent"]
        }

    return {
        "answer": f"I can help you configure agents, understand policy modes (Aggressive, Collaborative, Risk-averse), or analyze negotiation outcomes for '{context_scenario}'. What specific detail would you like to explore?",
        "topic": "general",
        "suggested_actions": ["Explain Policy Modes", "How Constraint Enforcement Works"]
    }
