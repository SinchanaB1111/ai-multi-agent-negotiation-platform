from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, ConfigDict

class AgentProfileBase(BaseModel):
    name: str
    role: str
    persona: str = Field(..., description="Agent personality / persona description")
    goals: Union[List[str], str] = Field(..., description="Agent goals")
    constraints: Union[Dict[str, Any], List[Union[str, Dict[str, Any]]]] = Field(
        ..., description="Numeric limits and rules (e.g. maximum_price, minimum_price, quantity)"
    )
    negotiation_objectives: Optional[List[str]] = Field(
        default_factory=list, description="Specific negotiation target objectives"
    )

class AgentProfileCreate(AgentProfileBase):
    id: Optional[str] = None

class AgentProfileResponse(AgentProfileBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
