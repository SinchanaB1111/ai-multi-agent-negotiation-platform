"""Create the NegoSphere SQLite database and all SQLAlchemy tables."""
from pathlib import Path
from app.database import Base, engine

# Import every model so SQLAlchemy knows about all tables before create_all().
from app.models.user import User, OTPToken  # noqa: F401,E402
from app.models.agent import AgentModel  # noqa: F401,E402
from app.models.negotiation import NegotiationModel  # noqa: F401,E402
from app.models.message import NegotiationMessageModel  # noqa: F401,E402

Base.metadata.create_all(bind=engine)

try:
    db_path = Path(engine.url.database or "negotiation.db").resolve()
except Exception:
    db_path = Path("negotiation.db").resolve()

print("NegoSphere database is ready.")
print(f"Database: {db_path}")
print("Tables: users, otp_tokens, agents, negotiations, negotiation_messages")
