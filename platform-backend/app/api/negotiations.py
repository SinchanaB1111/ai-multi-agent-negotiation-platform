from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.negotiation import NegotiationCreate, NegotiationStateResponse, TurnResponse, OfferLog, PracticeTurnRequest, NegotiationSummary
from app.models.agent import AgentModel
from app.models.negotiation import NegotiationModel
from app.services.negotiation_service import (
    create_negotiation_session,
    load_orchestrator,
    save_orchestrator_state,
    get_or_create_default_agents,
    DEFAULT_SCENARIOS
)

router = APIRouter(prefix="/api/negotiations", tags=["Negotiations"])


def _require_session_owner(db: Session, negotiation_id: str, user_id: int):
    record = db.query(NegotiationModel).filter(
        NegotiationModel.negotiation_id == negotiation_id,
        NegotiationModel.user_id == str(user_id),
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Negotiation session not found.")
    return record

@router.get("", response_model=List[NegotiationSummary])
def list_negotiations(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieve historical negotiation sessions for a specific user from database."""
    query = db.query(NegotiationModel).filter(NegotiationModel.user_id == str(current_user.id))
    records = query.order_by(NegotiationModel.created_at.desc()).all()

    summaries = []
    for r in records:
        agents = r.participating_agents
        agents_str = " vs ".join([a.get("name", "Agent") for a in agents]) if agents else "Agents"
        scen_name = DEFAULT_SCENARIOS.get(r.scenario_id, {}).get("scenario_name", r.scenario_id.replace("_", " ").title())
        summaries.append(NegotiationSummary(
            negotiation_id=r.negotiation_id,
            scenario_id=r.scenario_id,
            scenario_name=scen_name,
            mode=r.mode or "simulation",
            status=r.status,
            current_round=r.current_round,
            max_rounds=r.max_rounds,
            agents_summary=agents_str,
            created_at=r.created_at.isoformat() if r.created_at else None,
            user_id=r.user_id
        ))
    return summaries

@router.post("", response_model=NegotiationStateResponse, status_code=status.HTTP_201_CREATED)
def create_negotiation(
    payload: NegotiationCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create and start a new negotiation session."""
    agents_data = []

    if payload.agents:
        agents_data = [a.model_dump() for a in payload.agents]
    elif payload.agent_ids:
        for aid in payload.agent_ids:
            db_agent = db.query(AgentModel).filter(AgentModel.id == aid).first()
            if db_agent:
                agents_data.append(db_agent.to_dict())
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Agent ID '{aid}' not found."
                )

    if not agents_data:
        scen_key = payload.scenario_id or "vendor_pricing"
        if scen_key in DEFAULT_SCENARIOS:
            agents_data = DEFAULT_SCENARIOS[scen_key]["agents"]
        else:
            agents_data = get_or_create_default_agents(db)

    orch = create_negotiation_session(
        db=db,
        scenario_id=payload.scenario_id or "vendor_pricing",
        agent_profiles=agents_data,
        max_rounds=payload.max_rounds or 5,
        mode=payload.mode or "simulation",
        human_role=payload.human_role,
        user_id=str(current_user.id)
    )

    return NegotiationStateResponse(**orch.get_state_dict())


@router.get("/{negotiation_id}", response_model=NegotiationStateResponse)
def get_negotiation_state(
    negotiation_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieve current negotiation session state."""
    _require_session_owner(db, negotiation_id, current_user.id)
    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )
    return NegotiationStateResponse(**orch.get_state_dict())

@router.post("/{negotiation_id}/turn")
async def run_negotiation_turn(
    negotiation_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Executes the current active agent's turn."""
    _require_session_owner(db, negotiation_id, current_user.id)
    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )

    if orch.status in ["accepted", "agreement", "rejected", "completed", "deadlock", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Negotiation '{negotiation_id}' has already completed with status '{orch.status}'."
        )

    res = await orch.run_turn()
    save_orchestrator_state(db, orch)

    last_turn = orch.history[-1] if orch.history else {}
    return {
        "turn": last_turn,
        "state": NegotiationStateResponse(**orch.get_state_dict())
    }

@router.post("/{negotiation_id}/practice-turn")
async def run_practice_turn(
    negotiation_id: str,
    payload: PracticeTurnRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Processes a human offer in Practice Mode and triggers AI response turn."""
    _require_session_owner(db, negotiation_id, current_user.id)
    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )

    if orch.status in ["accepted", "agreement", "rejected", "completed", "deadlock", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Negotiation '{negotiation_id}' has already completed with status '{orch.status}'."
        )

    try:
        updated_state = await orch.run_human_turn(
            human_offer=payload.offer,
            message=payload.message,
            decision=payload.decision or "counter"
        )
        save_orchestrator_state(db, orch)
        return NegotiationStateResponse(**updated_state)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

@router.post("/{negotiation_id}/run", response_model=NegotiationStateResponse)
async def run_to_completion(
    negotiation_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Runs the negotiation automatically until completion."""
    _require_session_owner(db, negotiation_id, current_user.id)
    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )

    await orch.run_to_completion()
    save_orchestrator_state(db, orch)

    return NegotiationStateResponse(**orch.get_state_dict())

@router.get("/{negotiation_id}/history", response_model=List[OfferLog])
def get_negotiation_history(
    negotiation_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieve complete turn-by-turn conversation history log."""
    _require_session_owner(db, negotiation_id, current_user.id)
    orch = load_orchestrator(db, negotiation_id)
    if not orch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Negotiation session '{negotiation_id}' not found."
        )
    return [OfferLog(**h) for h in orch.history]
