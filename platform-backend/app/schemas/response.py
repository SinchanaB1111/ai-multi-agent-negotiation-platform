from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator

class StructuredOfferDetail(BaseModel):
    price: Optional[float] = None
    quantity: Optional[int] = None
    value: Optional[float] = None
    terms: Optional[str] = None

class LLMStructuredResponse(BaseModel):
    decision: str = Field(..., description="Negotiation decision: 'accept', 'counter' (or 'counteroffer'), or 'reject'")
    offer: Optional[Union[StructuredOfferDetail, Dict[str, Any], float, int]] = Field(
        default=None, description="Proposed offer terms, numeric value, or structured object with price & quantity"
    )
    reasoning: str = Field(..., description="Strategic reasoning for decision and offer")
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Negotiation parameters and tracked limits"
    )

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        val = v.lower().strip()
        if val in ["accept", "accepted", "agreement"]:
            return "accept"
        if val in ["counter", "counteroffer"]:
            return "counter"
        if val in ["reject", "rejected", "deadlock"]:
            return "reject"
        raise ValueError(f"Invalid decision '{v}'. Must be one of: accept, counter, reject")
