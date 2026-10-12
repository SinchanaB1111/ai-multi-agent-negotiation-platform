from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter
from app.services.guide_service import answer_guide_query

router = APIRouter(prefix="/api/guide", tags=["Guide Assistant"])

class GuideQueryRequest(BaseModel):
    query: str
    scenario_id: Optional[str] = "vendor_pricing"

@router.post("/query")
def process_guide_query(payload: GuideQueryRequest):
    """Answers user queries regarding scenario setup, agent personas, and negotiation strategies."""
    return answer_guide_query(payload.query, payload.scenario_id or "vendor_pricing")
