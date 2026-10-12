import uuid
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.negotiation import NegotiationModel
from app.models.message import NegotiationMessageModel
from app.models.agent import AgentModel
from app.services.orchestrator import NegotiationOrchestrator

DEFAULT_SCENARIOS = {
    "vendor_pricing": {
        "scenario_id": "vendor_pricing",
        "scenario_name": "Vendor Pricing Negotiation",
        "description": "Buyer and Vendor negotiate the price of a bulk components order while balancing budget, profit, and acceptable terms.",
        "agents": [
            {
                "id": "buyer",
                "name": "Alex Morgan",
                "role": "buyer",
                "persona": "Risk-averse",
                "goals": ["Lowest possible unit price"],
                "constraints": {"maximum_price": 50000, "quantity": 100},
                "negotiation_objectives": ["Target price is 42500", "Maximum $50,000 budget limit"]
            },
            {
                "id": "vendor",
                "name": "Daniel Carter",
                "role": "vendor",
                "persona": "Aggressive",
                "goals": ["Maximize profit margin"],
                "constraints": {"minimum_price": 42000, "quantity": 100},
                "negotiation_objectives": ["Target price is 48000", "Minimum $42,000 price floor"]
            }
        ]
    },
    "job_offer": {
        "scenario_id": "job_offer",
        "scenario_name": "Job Offer Negotiation",
        "description": "Candidate and Employer negotiate salary and start terms for a new role while balancing compensation expectations against budget limits.",
        "agents": [
            {
                "id": "candidate",
                "name": "Sarah Mitchell",
                "role": "candidate",
                "persona": "Collaborative",
                "goals": ["Maximize total compensation and benefits"],
                "constraints": {"minimum_price": 95000},
                "negotiation_objectives": ["Target salary is $105,000", "Minimum $95,000 base salary"]
            },
            {
                "id": "employer",
                "name": "Michael Anderson",
                "role": "employer",
                "persona": "Risk-averse",
                "goals": ["Secure the candidate within approved budget"],
                "constraints": {"maximum_price": 110000},
                "negotiation_objectives": ["Target salary is $98,000", "Maximum $110,000 budget limit"]
            }
        ]
    },
    "project_budget": {
        "scenario_id": "project_budget",
        "scenario_name": "Project Budget Allocation",
        "description": "Department Head and Finance Manager negotiate how much budget to allocate to a new initiative.",
        "agents": [
            {
                "id": "department_head",
                "name": "Olivia Bennett",
                "role": "department_head",
                "persona": "Aggressive",
                "goals": ["Secure maximum budget for the initiative"],
                "constraints": {"minimum_price": 75000},
                "negotiation_objectives": ["Target allocation is $95,000", "Minimum $75,000 allocation"]
            },
            {
                "id": "finance_director",
                "name": "James Wilson",
                "role": "finance_director",
                "persona": "Collaborative",
                "goals": ["Control company-wide spending"],
                "constraints": {"maximum_price": 85000},
                "negotiation_objectives": ["Target allocation is $70,000", "Maximum $85,000 allocation"]
            }
        ]
    }
}

def get_or_create_default_agents(db: Session) -> List[Dict[str, Any]]:
    agents = []
    for default_agent in DEFAULT_SCENARIOS["vendor_pricing"]["agents"]:
        db_agent = db.query(AgentModel).filter(AgentModel.id == default_agent["id"]).first()
        if not db_agent:
            db_agent = AgentModel(
                id=default_agent["id"],
                name=default_agent["name"],
                role=default_agent["role"],
                persona=default_agent["persona"]
            )
            db_agent.goals = default_agent["goals"]
            db_agent.constraints = default_agent["constraints"]
            db_agent.negotiation_objectives = default_agent["negotiation_objectives"]
            db.add(db_agent)
            db.commit()
            db.refresh(db_agent)
        else:
            db_agent.name = default_agent["name"]
            db_agent.role = default_agent["role"]
            db.commit()
            db.refresh(db_agent)
        agents.append(db_agent.to_dict())
    return agents

def create_negotiation_session(
    db: Session,
    scenario_id: str = "vendor_pricing",
    agent_profiles: Optional[List[Dict[str, Any]]] = None,
    max_rounds: int = 5,
    mode: str = "simulation",
    human_role: Optional[str] = None,
    user_id: Optional[str] = None
) -> NegotiationOrchestrator:
    negotiation_id = str(uuid.uuid4())

    if not agent_profiles:
        if scenario_id in DEFAULT_SCENARIOS:
            agent_profiles = DEFAULT_SCENARIOS[scenario_id]["agents"]
        else:
            agent_profiles = get_or_create_default_agents(db)

    # Save initial negotiation state to DB
    initial_turn = agent_profiles[0]["id"] if agent_profiles else "buyer"
    db_neg = NegotiationModel(
        negotiation_id=negotiation_id,
        user_id=user_id,
        scenario_id=scenario_id,
        mode=mode,
        human_role=human_role,
        current_round=0,
        max_rounds=max_rounds,
        current_agent_turn=initial_turn,
        status="active"
    )

    db_neg.participating_agents = agent_profiles
    db_neg.current_offer = None
    db_neg.previous_offer = None
    db_neg.deadlock_info = {}

    db.add(db_neg)
    db.commit()
    db.refresh(db_neg)

    return NegotiationOrchestrator(
        negotiation_id=negotiation_id,
        scenario_id=scenario_id,
        agents=agent_profiles,
        max_rounds=max_rounds,
        current_round=0,
        current_agent_turn=initial_turn,
        status="active",
        mode=mode,
        human_role=human_role,
        user_id=user_id,
        current_offer=None,
        previous_offer=None,
        history=[],
        deadlock_info={}
    )

def load_orchestrator(db: Session, negotiation_id: str) -> Optional[NegotiationOrchestrator]:
    db_neg = db.query(NegotiationModel).filter(NegotiationModel.negotiation_id == negotiation_id).first()
    if not db_neg:
        return None

    # Load messages
    messages = db.query(NegotiationMessageModel).filter(
        NegotiationMessageModel.negotiation_id == negotiation_id
    ).order_by(NegotiationMessageModel.id.asc()).all()

    history = [m.to_dict() for m in messages]

    return NegotiationOrchestrator(
        negotiation_id=db_neg.negotiation_id,
        scenario_id=db_neg.scenario_id,
        agents=db_neg.participating_agents,
        max_rounds=db_neg.max_rounds,
        current_round=db_neg.current_round,
        current_agent_turn=db_neg.current_agent_turn,
        status=db_neg.status,
        mode=getattr(db_neg, "mode", "simulation") or "simulation",
        human_role=getattr(db_neg, "human_role", None),
        user_id=getattr(db_neg, "user_id", None),
        current_offer=db_neg.current_offer,
        previous_offer=db_neg.previous_offer,
        history=history,
        deadlock_info=getattr(db_neg, "deadlock_info", {}) or {}
    )


def save_orchestrator_state(db: Session, orch: NegotiationOrchestrator):
    db_neg = db.query(NegotiationModel).filter(NegotiationModel.negotiation_id == orch.negotiation_id).first()
    if not db_neg:
        return

    db_neg.current_round = orch.current_round
    db_neg.current_agent_turn = orch.current_agent_turn
    db_neg.status = orch.status
    db_neg.current_offer = orch.current_offer
    db_neg.previous_offer = orch.previous_offer
    db_neg.mode = orch.mode
    db_neg.human_role = orch.human_role
    db_neg.deadlock_info = orch.deadlock_info

    # Save any new history items
    existing_count = db.query(NegotiationMessageModel).filter(
        NegotiationMessageModel.negotiation_id == orch.negotiation_id
    ).count()

    if len(orch.history) > existing_count:
        for new_item in orch.history[existing_count:]:
            msg = NegotiationMessageModel(
                negotiation_id=orch.negotiation_id,
                round=new_item.get("round", orch.current_round),
                agent_id=new_item["agent_id"],
                decision=new_item["decision"],
                reasoning=new_item["reasoning"]
            )
            msg.proposed_offer = new_item.get("proposed_offer")
            msg.parameters = new_item.get("parameters")
            db.add(msg)

    db.commit()
    db.refresh(db_neg)
