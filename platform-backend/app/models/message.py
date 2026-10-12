import json
from sqlalchemy import Column, String, Integer, Text, DateTime, func
from app.database import Base

class NegotiationMessageModel(Base):
    __tablename__ = "negotiation_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    negotiation_id = Column(String, nullable=False, index=True)
    round = Column(Integer, nullable=False)
    agent_id = Column(String, nullable=False)
    decision = Column(String, nullable=False) # accept, counter, reject
    proposed_offer_json = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=False)
    parameters_json = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def proposed_offer(self):
        return json.loads(self.proposed_offer_json) if self.proposed_offer_json else None

    @proposed_offer.setter
    def proposed_offer(self, value):
        self.proposed_offer_json = json.dumps(value) if value is not None else None

    @property
    def parameters(self):
        return json.loads(self.parameters_json) if self.parameters_json else {}

    @parameters.setter
    def parameters(self, value):
        self.parameters_json = json.dumps(value) if value is not None else None

    def to_dict(self):
        return {
            "agent_id": self.agent_id,
            "round": self.round,
            "decision": self.decision,
            "proposed_offer": self.proposed_offer,
            "value": self.proposed_offer.get("price") or self.proposed_offer.get("value") if isinstance(self.proposed_offer, dict) else self.proposed_offer,
            "reasoning": self.reasoning,
            "parameters": self.parameters,
            "timestamp": self.timestamp.isoformat() if self.timestamp else ""
        }
