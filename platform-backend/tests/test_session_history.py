from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import get_current_user
from app.api.session_history import router
from app.database import Base, get_db
from app.models.user import User
from app.services.auth_service import generate_session_token


def create_test_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = override_get_db

    with session_factory() as db:
        owner = User(email="owner@example.test", full_name="Owner", auth_provider="email", is_verified=True)
        other = User(email="other@example.test", full_name="Other", auth_provider="email", is_verified=True)
        db.add_all([owner, other])
        db.commit()
        owner_token = generate_session_token(owner.id)
        other_token = generate_session_token(other.id)

    return TestClient(app), engine, owner_token, other_token


def test_session_history_requires_authentication_and_is_user_scoped():
    client, engine, owner_token, other_token = create_test_client()
    session_id = "NEG-test-session-1"
    snapshot = {
        "sessionId": session_id,
        "scenario": {"id": 1, "name": "Vendor Pricing Negotiation"},
        "status": "AGREEMENT",
        "currentRound": 2,
        "maxRounds": 5,
        "currentAgentTurn": None,
        "agents": [{"id": "buyer"}, {"id": "vendor"}],
        "offers": [{"agentId": "buyer", "value": 100000}],
        "history": [{"type": "OFFER", "round": 1}],
        "agreement": {"offer": {"value": 100000}},
    }

    try:
        assert client.get("/api/session-history").status_code == 401

        headers = {"Authorization": f"Bearer {owner_token}"}
        saved = client.post(
            "/api/session-history",
            json={"session_id": session_id, "mode": "practice", "state": snapshot},
            headers=headers,
        )
        assert saved.status_code == 201
        assert saved.json()["state"] == snapshot

        owner_sessions = client.get("/api/session-history", headers=headers)
        assert owner_sessions.status_code == 200
        assert [item["session_id"] for item in owner_sessions.json()] == [session_id]

        other_headers = {"Authorization": f"Bearer {other_token}"}
        assert client.get("/api/session-history", headers=other_headers).json() == []
        assert client.delete(f"/api/session-history/{session_id}", headers=other_headers).status_code == 404

        assert client.delete(f"/api/session-history/{session_id}", headers=headers).status_code == 200
        assert client.get("/api/session-history", headers=headers).json() == []
    finally:
        client.close()
        engine.dispose()