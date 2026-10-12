import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.agent import AgentModel
from app.schemas.agent import AgentProfileCreate, AgentProfileResponse
from app.services.negotiation_service import get_or_create_default_agents

router = APIRouter(prefix="/api/agents", tags=["Agents"])

@router.get("", response_model=List[AgentProfileResponse])
def list_agents(db: Session = Depends(get_db)):
    """List all agent profiles stored in system."""
    agents = db.query(AgentModel).all()
    if not agents:
        # Populate defaults
        get_or_create_default_agents(db)
        agents = db.query(AgentModel).all()
    return [AgentProfileResponse(**a.to_dict()) for a in agents]

@router.post("", response_model=AgentProfileResponse, status_code=status.HTTP_201_CREATED)
def create_agent(agent_data: AgentProfileCreate, db: Session = Depends(get_db)):
    """Create a new agent profile."""
    agent_id = agent_data.id or f"agent_{uuid.uuid4().hex[:8]}"

    existing = db.query(AgentModel).filter(AgentModel.id == agent_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent with ID '{agent_id}' already exists."
        )

    db_agent = AgentModel(
        id=agent_id,
        name=agent_data.name,
        role=agent_data.role,
        persona=agent_data.persona
    )
    db_agent.goals = agent_data.goals if isinstance(agent_data.goals, list) else [agent_data.goals]
    db_agent.constraints = agent_data.constraints
    db_agent.negotiation_objectives = agent_data.negotiation_objectives or []

    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)

    return AgentProfileResponse(**db_agent.to_dict())

@router.get("/{agent_id}", response_model=AgentProfileResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get agent profile by ID."""
    db_agent = db.query(AgentModel).filter(AgentModel.id == agent_id).first()
    if not db_agent:
        get_or_create_default_agents(db)
        db_agent = db.query(AgentModel).filter(AgentModel.id == agent_id).first()
    if not db_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID '{agent_id}' not found."
        )
    from app.services.negotiation_service import DEFAULT_SCENARIOS
    for scen in DEFAULT_SCENARIOS.values():
        for da in scen["agents"]:
            if da["id"] == agent_id:
                if db_agent.name != da["name"] or db_agent.role != da["role"]:
                    db_agent.name = da["name"]
                    db_agent.role = da["role"]
                    db.commit()
                    db.refresh(db_agent)
                break
    return AgentProfileResponse(**db_agent.to_dict())
