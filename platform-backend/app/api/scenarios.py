from typing import List, Dict, Any
from fastapi import APIRouter
from app.services.negotiation_service import DEFAULT_SCENARIOS

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[Dict[str, Any]])
def list_scenarios():
    """List preset scenarios."""
    return list(DEFAULT_SCENARIOS.values())

@router.get("/{scenario_id}")
def get_scenario(scenario_id: str):
    """Get preset scenario details."""
    scen = DEFAULT_SCENARIOS.get(scenario_id)
    if not scen:
        return {"scenario_id": scenario_id, "name": scenario_id, "agents": []}
    return scen
