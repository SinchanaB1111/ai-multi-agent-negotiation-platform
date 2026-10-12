from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.services.negotiation_service import load_orchestrator
from app.services.analytics_service import calculate_negotiation_analytics
from typing import Optional

router = APIRouter(prefix="/api/negotiations", tags=["Analytics"])

from app.models.negotiation import NegotiationModel
from app.services.negotiation_service import DEFAULT_SCENARIOS

@router.get("/{negotiation_id}/analytics")
def get_negotiation_analytics(
    negotiation_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieve detailed concession timeline, convergence rate, and metrics for a negotiation session."""
    owned_session = db.query(NegotiationModel).filter(
        NegotiationModel.negotiation_id == negotiation_id,
        NegotiationModel.user_id == str(current_user.id),
    ).first()
    if not owned_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Negotiation session not found.")

    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )

    state = orch.get_state_dict()
    return calculate_negotiation_analytics(state)

analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@analytics_router.get("/dashboard")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Compute dashboard statistics dynamically from the database for a specific user or guest session."""
    query = db.query(NegotiationModel).filter(NegotiationModel.user_id == str(current_user.id))
    all_negs = query.order_by(NegotiationModel.created_at.desc()).all()
    
    total = len(all_negs)
    agreements = sum(1 for n in all_negs if n.status in ["accepted", "agreement", "completed"])
    deadlocks = sum(1 for n in all_negs if n.status in ["deadlock", "rejected", "breakdown"])
    in_progress = sum(1 for n in all_negs if n.status in ["active", "in_progress"])
    
    avg_rounds = round(sum(n.current_round for n in all_negs) / total, 1) if total > 0 else 0.0
    success_rate = round((agreements / total) * 100) if total > 0 else 0
    
    recent = []
    for n in all_negs[:5]:
        agents = n.participating_agents
        agents_str = " vs ".join([a.get("name", "Agent") for a in agents]) if agents else "Agents"
        scen_name = DEFAULT_SCENARIOS.get(n.scenario_id, {}).get("scenario_name", n.scenario_id.replace("_", " ").title())
        recent.append({
            "id": n.negotiation_id,
            "scenario": scen_name,
            "agents": agents_str,
            "mode": (n.mode or "simulation").capitalize(),
            "rounds": n.current_round,
            "result": n.status.replace("_", " ").title(),
            "date": n.created_at.strftime("%b %d, %Y") if n.created_at else "Recently"
        })
        
    active_neg = None
    active_record = next((n for n in all_negs if n.status in ["active", "in_progress"]), None)
    if active_record:
        scen_name = DEFAULT_SCENARIOS.get(active_record.scenario_id, {}).get("scenario_name", active_record.scenario_id.replace("_", " ").title())
        active_neg = {
            "id": active_record.negotiation_id,
            "scenario": scen_name,
            "mode": (active_record.mode or "simulation").capitalize(),
            "status": active_record.status.replace("_", " ").title(),
            "currentRound": active_record.current_round,
            "agents": [
                {
                    "name": a.get("name", "Agent"),
                    "role": a.get("role", "Participant").capitalize(),
                    "persona": a.get("persona", "Balanced"),
                    "position": a.get("negotiation_objectives", ["Standard"])[0] if a.get("negotiation_objectives") else "Active"
                }
                for a in active_record.participating_agents
            ]
        }
        
    return {
        "stats": {
            "totalNegotiations": total,
            "agreements": agreements,
            "deadlocks": deadlocks,
            "inProgress": in_progress,
            "averageRounds": avg_rounds,
            "successRate": success_rate
        },
        "activeNegotiation": active_neg,
        "recentNegotiations": recent
    }
