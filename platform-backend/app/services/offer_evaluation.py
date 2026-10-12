import re
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from app.services.decision_logic import derive_limit_from_constraints, derive_direction_from_goal
from app.services.concession_tracking import extract_scalar_price, get_agent_previous_position, get_authoritative_target

@dataclass
class OfferEvaluationResult:
    opponent_price: Optional[float]
    target_price: float
    limit_price: float
    direction: str  # "minimize" (buyer) or "maximize" (vendor)
    is_within_limit: bool
    is_favorable: bool
    is_tight_gap: bool
    is_acceptable: bool
    is_unacceptable: bool
    gap_to_target: float
    gap_to_limit: float
    evaluation_summary: str
    metrics: Dict[str, Any] = field(default_factory=dict)


def parse_target_price(objectives: Any, goals: Any, limit: float, direction: str) -> float:
    """Extracts target price from objectives or goals, falling back to a sensible default relative to limit."""
    return get_authoritative_target({"negotiation_objectives": objectives, "goals": goals}, limit, direction)


def evaluate_offer(
    agent_profile: Dict[str, Any],
    opponent_offer: Optional[Dict[str, Any]],
    negotiation_state: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None
) -> OfferEvaluationResult:
    """
    Requirement #1: Offer Evaluation Engine.
    Evaluates opponent's offer based on:
    - Agent's goals & target price
    - Minimum/maximum acceptable limit constraints
    - Current negotiation state (round_num, max_rounds)
    - Previous offers from conversation history
    """
    role = str(agent_profile.get("role", "")).lower()
    constraints = agent_profile.get("constraints", {})
    derived = derive_limit_from_constraints(constraints)

    direction = agent_profile.get("direction")
    if not direction:
        direction = derived.get("direction") if derived else derive_direction_from_goal(agent_profile.get("goals", ""), "minimize")

    limit = agent_profile.get("limit")
    if limit is None:
        limit = derived.get("limit") if derived else (85000.0 if direction == "minimize" else 80000.0)

    target = get_authoritative_target(agent_profile, limit, direction)

    opp_price = extract_scalar_price(opponent_offer)
    state = negotiation_state or {}
    history = conversation_history or []
    round_num = state.get("current_round", 1)
    max_rounds = state.get("max_rounds", 8)

    # Opening turn case (no opponent offer yet)
    if opp_price is None:
        return OfferEvaluationResult(
            opponent_price=None,
            target_price=target,
            limit_price=limit,
            direction=direction,
            is_within_limit=True,
            is_favorable=False,
            is_tight_gap=False,
            is_acceptable=False,
            is_unacceptable=False,
            gap_to_target=0.0,
            gap_to_limit=0.0,
            evaluation_summary="Opening turn — no opponent offer present. Generating initial position.",
            metrics={"opening_turn": True}
        )

    agent_id = agent_profile.get("id", "")
    prev_own_price = get_agent_previous_position(history, agent_id)

    # Check whether within limit constraint
    if direction == "minimize":  # BUYER
        is_within_limit = opp_price <= limit
        is_favorable = opp_price <= target
        gap_to_target = opp_price - target
        gap_to_limit = opp_price - limit
    else:  # VENDOR (maximize)
        is_within_limit = opp_price >= limit
        is_favorable = opp_price >= target
        gap_to_target = target - opp_price
        gap_to_limit = limit - opp_price

    base_val = max(abs(limit), abs(opp_price), 1.0)
    gap_from_own = abs(prev_own_price - opp_price) if prev_own_price is not None else abs(gap_to_target)

    is_tight_gap = gap_from_own <= (base_val * 0.005) or gap_from_own <= 10.0
    is_close_gap = gap_from_own <= (base_val * 0.035)

    # Acceptable logic:
    # 1. Favorable offer (meets target)
    # 2. Within limit and tight gap
    # 3. Within limit and close gap after round 3
    # 4. Within limit at max rounds
    is_acceptable = is_within_limit and (
        is_favorable or
        is_tight_gap or
        (round_num >= 4 and is_close_gap) or
        (round_num >= max_rounds)
    )

    # Unacceptable logic:
    # 1. Violates hard limit at max rounds
    # 2. Violates limit severely (> 25% beyond limit boundary)
    is_severe_violation = (
        (direction == "minimize" and opp_price > limit * 1.25) or
        (direction == "maximize" and opp_price < limit * 0.75)
    )
    is_unacceptable = not is_within_limit and (round_num >= max_rounds or is_severe_violation)

    # Human-readable evaluation summary
    status_label = "Favorable" if is_favorable else ("Acceptable" if is_acceptable else ("Unacceptable" if is_unacceptable else "Negotiable"))
    summary = (
        f"Opponent offer of ${opp_price:,.2f} evaluated as {status_label}. "
        f"Target is ${target:,.2f}, Hard Limit is ${limit:,.2f} ({direction}). "
        f"Within limit: {is_within_limit}. Round {round_num}/{max_rounds}."
    )

    metrics = {
        "opponent_price": opp_price,
        "target_price": target,
        "limit_price": limit,
        "direction": direction,
        "is_within_limit": is_within_limit,
        "is_favorable": is_favorable,
        "is_tight_gap": is_tight_gap,
        "is_acceptable": is_acceptable,
        "is_unacceptable": is_unacceptable,
        "gap_from_own_last": round(gap_from_own, 2),
        "round_num": round_num,
        "max_rounds": max_rounds
    }

    return OfferEvaluationResult(
        opponent_price=opp_price,
        target_price=target,
        limit_price=limit,
        direction=direction,
        is_within_limit=is_within_limit,
        is_favorable=is_favorable,
        is_tight_gap=is_tight_gap,
        is_acceptable=is_acceptable,
        is_unacceptable=is_unacceptable,
        gap_to_target=round(gap_to_target, 2),
        gap_to_limit=round(gap_to_limit, 2),
        evaluation_summary=summary,
        metrics=metrics
    )
