import json
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.negotiation import NegotiationModel
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/session-history", tags=["Session History"])


class SessionSnapshotRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=255)
    mode: str = Field(default="simulation", max_length=30)
    state: Dict[str, Any]

    @model_validator(mode="after")
    def validate_snapshot(self):
        if self.state.get("sessionId") != self.session_id:
            raise ValueError("session_id must match state.sessionId.")
        if not isinstance(self.state.get("scenario"), dict):
            raise ValueError("A scenario is required in the session snapshot.")
        if len(self.state.get("agents", [])) != 2:
            raise ValueError("A session must contain exactly two agents.")
        if self.mode not in {"simulation", "practice"}:
            raise ValueError("mode must be simulation or practice.")
        return self


def _serialize_record(record: NegotiationModel) -> Dict[str, Any]:
    try:
        state = json.loads(record.final_result or "null")
    except (TypeError, json.JSONDecodeError):
        state = None
    return {
        "session_id": record.negotiation_id,
        "mode": record.mode or "simulation",
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "state": state,
    }


@router.get("")
def list_session_snapshots(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    records = db.query(NegotiationModel).filter(
        NegotiationModel.user_id == str(current_user.id),
        NegotiationModel.final_result.isnot(None),
    ).order_by(NegotiationModel.created_at.desc()).all()
    return [item for item in (_serialize_record(record) for record in records) if item["state"]]


@router.post("", status_code=status.HTTP_201_CREATED)
def save_session_snapshot(
    payload: SessionSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
) -> Dict[str, Any]:
    user_id = str(current_user.id)
    record = db.query(NegotiationModel).filter(
        NegotiationModel.negotiation_id == payload.session_id
    ).first()
    if record and record.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    snapshot_json = json.dumps(payload.state, separators=(",", ":"))
    if len(snapshot_json.encode("utf-8")) > 1_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Session snapshot is too large.")

    scenario = payload.state["scenario"]
    agents = payload.state["agents"]
    if record is None:
        record = NegotiationModel(
            negotiation_id=payload.session_id,
            user_id=user_id,
            scenario_id=str(scenario.get("id") or scenario.get("name") or "custom")[:255],
            status=str(payload.state.get("status") or "UNKNOWN")[:50],
            current_round=max(0, int(payload.state.get("currentRound") or 0)),
            max_rounds=max(1, int(payload.state.get("maxRounds") or 5)),
            current_agent_turn=payload.state.get("currentAgentTurn"),
        )
        db.add(record)

    record.mode = payload.mode
    record.final_result = snapshot_json
    record.participating_agents = agents
    record.current_offer = payload.state.get("currentOffer")
    record.previous_offer = payload.state.get("previousOffer")
    record.deadlock_info = {"terminationReason": payload.state.get("terminationReason")}
    record.status = str(payload.state.get("status") or "UNKNOWN")[:50]
    record.current_round = max(0, int(payload.state.get("currentRound") or 0))
    record.max_rounds = max(1, int(payload.state.get("maxRounds") or 5))
    record.current_agent_turn = payload.state.get("currentAgentTurn")
    db.commit()
    db.refresh(record)
    return _serialize_record(record)


@router.delete("")
def clear_session_snapshots(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    db.query(NegotiationModel).filter(
        NegotiationModel.user_id == str(current_user.id),
        NegotiationModel.final_result.isnot(None),
    ).delete(synchronize_session=False)
    db.commit()
    return {"deleted": True}


@router.delete("/{session_id}")
def delete_session_snapshot(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    record = db.query(NegotiationModel).filter(
        NegotiationModel.negotiation_id == session_id,
        NegotiationModel.user_id == str(current_user.id),
        NegotiationModel.final_result.isnot(None),
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    db.delete(record)
    db.commit()
    return {"deleted": True}