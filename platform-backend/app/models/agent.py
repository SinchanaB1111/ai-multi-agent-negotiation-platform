import json
from sqlalchemy import Column, String, Text
from app.database import Base

class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    persona = Column(Text, nullable=False)
    goals_json = Column(Text, nullable=False)
    constraints_json = Column(Text, nullable=False)
    objectives_json = Column(Text, nullable=False)

    @property
    def goals(self):
        return json.loads(self.goals_json) if self.goals_json else []

    @goals.setter
    def goals(self, value):
        self.goals_json = json.dumps(value)

    @property
    def constraints(self):
        return json.loads(self.constraints_json) if self.constraints_json else {}

    @constraints.setter
    def constraints(self, value):
        self.constraints_json = json.dumps(value)

    @property
    def negotiation_objectives(self):
        return json.loads(self.objectives_json) if self.objectives_json else []

    @negotiation_objectives.setter
    def negotiation_objectives(self, value):
        self.objectives_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "persona": self.persona,
            "goals": self.goals,
            "constraints": self.constraints,
            "negotiation_objectives": self.negotiation_objectives,
        }
