import json
from sqlalchemy import Column, String, Integer, Text, DateTime, func
from app.database import Base

class NegotiationModel(Base):
    __tablename__ = "negotiations"

    negotiation_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    scenario_id = Column(String, nullable=False, default="vendor_pricing")
    mode = Column(String, nullable=True, default="simulation")
    human_role = Column(String, nullable=True)
    current_round = Column(Integer, nullable=False, default=0)
    max_rounds = Column(Integer, nullable=False, default=8)
    current_agent_turn = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # active, in_progress, accepted, agreement, rejected, completed, deadlock, breakdown, cancelled
    participating_agents_json = Column(Text, nullable=False)
    current_offer_json = Column(Text, nullable=True)
    previous_offer_json = Column(Text, nullable=True)
    deadlock_info_json = Column(Text, nullable=True)
    final_result = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def participating_agents(self):
        return json.loads(self.participating_agents_json) if self.participating_agents_json else []

    @participating_agents.setter
    def participating_agents(self, value):
        self.participating_agents_json = json.dumps(value)

    @property
    def current_offer(self):
        return json.loads(self.current_offer_json) if self.current_offer_json else None

    @current_offer.setter
    def current_offer(self, value):
        self.current_offer_json = json.dumps(value) if value is not None else None

    @property
    def previous_offer(self):
        return json.loads(self.previous_offer_json) if self.previous_offer_json else None

    @previous_offer.setter
    def previous_offer(self, value):
        self.previous_offer_json = json.dumps(value) if value is not None else None

    @property
    def deadlock_info(self):
        return json.loads(self.deadlock_info_json) if self.deadlock_info_json else {}

    @deadlock_info.setter
    def deadlock_info(self, value):
        self.deadlock_info_json = json.dumps(value) if value is not None else None
