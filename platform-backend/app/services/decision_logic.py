import re
from typing import List, Dict, Any, Optional, Tuple

CONCESSION_RATE = {
    "Aggressive": 0.1,
    "Collaborative": 0.35,
    "Risk-averse": 0.25,
}

ACCEPTANCE_TOLERANCE = 0.03

def derive_limit_from_constraints(constraints: Any) -> Optional[Dict[str, Any]]:
    """
    Extract negotiation direction ("minimize" | "maximize") and limit value from constraints.
    """
    if isinstance(constraints, dict):
        if "maximum_price" in constraints:
            return {"direction": "minimize", "limit": float(constraints["maximum_price"])}
        if "minimum_price" in constraints:
            return {"direction": "maximize", "limit": float(constraints["minimum_price"])}

    c_list = constraints if isinstance(constraints, list) else [constraints]
    for c in c_list:
        text = ""
        def_val = None
        if isinstance(c, str):
            text = c
        elif isinstance(c, dict):
            text = c.get("text", "")
            def_val = c.get("defaultValue", c.get("value"))

        match = re.search(r"^(Maximum|Minimum)\s*\$?([\d,]+)", text, re.IGNORECASE)
        if match:
            qualifier, raw_val = match.groups()
            limit = float(def_val if def_val is not None else raw_val.replace(",", ""))
            direction = "minimize" if "maximum" in qualifier.lower() else "maximize"
            return {"direction": direction, "limit": limit}

    return None

def derive_direction_from_goal(goal: str, fallback_direction: str = "minimize") -> str:
    """Derives target direction (minimize vs maximize) from agent goal text."""
    g = str(goal or "").lower()
    if any(k in g for k in ["reduce", "lower", "minimize", "save", "lowest"]):
        return "minimize"
    if any(k in g for k in ["increase", "higher", "maximize", "highest", "earn", "salary", "profit"]):
        return "maximize"
    return fallback_direction

def anchor_offer(direction: str, limit: float, target: Optional[float] = None) -> float:
    """Build a credible opening anchor around the target, not around the hard limit alone."""
    if target is None or not isinstance(target, (int, float)) or target <= 0:
        target = limit * (0.90 if direction == "minimize" else 1.10)
    room = abs(limit - target)
    if direction == "minimize":
        # Buyer opens below target and leaves room for measured upward concessions.
        return round(max(1.0, min(limit, target - room * 0.50)), 2)
    # Seller opens above target and leaves room for measured downward concessions.
    return round(max(1.0, max(limit, target + room * 0.50)), 2)


def generate_counteroffer(
    agent_profile: Dict[str, Any],
    own_last_value: float,
    incoming_value: float,
    limit: float,
    direction: str,
    personality: str,
    round_num: int,
    target: Optional[float] = None
) -> float:
    """
    Requirement #3: Counteroffer Generation Engine.
    Generates personality-driven counteroffer based on distance between position and opponent offer.
    """
    rate = CONCESSION_RATE.get(personality, 0.25)
    # Increase responsiveness slightly as the deadline approaches, while keeping early rounds measured.
    progress = min(1.0, max(0.0, (round_num - 1) / max(1, 5 - 1)))
    rate = min(0.50, rate + progress * 0.08)
    raw_next = own_last_value + rate * (incoming_value - own_last_value)

    if target is not None and isinstance(target, (int, float)):
        # Avoid jumping past the agent's target in one concession.
        if direction == "minimize" and own_last_value < target < raw_next:
            raw_next = target
        elif direction == "maximize" and own_last_value > target > raw_next:
            raw_next = target

    comparison_base = max(abs(limit), abs(incoming_value), 1.0)
    min_step = max(comparison_base * 0.01, 100.0)

    if abs(raw_next - own_last_value) < min_step:
        # Keep the fallback step in the direction of the incoming offer and
        # never jump past it. This prevents tiny gaps from producing a full
        # jump to the opponent's number.
        if incoming_value > own_last_value:
            raw_next = min(own_last_value + min_step, incoming_value)
        else:
            raw_next = max(own_last_value - min_step, incoming_value)

    # Hard boundary clamp to constraint limit
    if direction == "minimize":
        next_value = min(round(raw_next, 2), limit)
    else:
        next_value = max(round(raw_next, 2), limit)

    return round(next_value, 2)


def decide_action(
    evaluation_result: Any,
    personality: str,
    own_last_value: float,
    round_num: int,
    max_rounds: int = 5
) -> Dict[str, Any]:
    """
    Requirement #2 & #3: Decision Logic Engine.
    Decides Accept / Counter / Reject based on offer evaluation result and personality.
    """
    opp_price = getattr(evaluation_result, "opponent_price", None)
    target = getattr(evaluation_result, "target_price", 80000.0)
    limit = getattr(evaluation_result, "limit_price", 85000.0)
    direction = getattr(evaluation_result, "direction", "minimize")

    is_within_limit = getattr(evaluation_result, "is_within_limit", True)
    is_favorable = getattr(evaluation_result, "is_favorable", False)
    is_acceptable = getattr(evaluation_result, "is_acceptable", False)
    is_unacceptable = getattr(evaluation_result, "is_unacceptable", False)

    # 1. Opening Turn (no opponent offer) -> Counter with Anchor Offer
    if opp_price is None:
        anchor = anchor_offer(direction, limit, target)
        return {
            "decision": "counter",
            "next_value": round(anchor, 2),
            "reasoning": f"Opening anchor offer at {anchor:,.2f} targeting optimal initial position."
        }

    # 2. ACCEPT DECISION
    if is_acceptable or is_favorable:
        reason = (
            f"Accepted offer of {opp_price:,.2f} in Round {round_num}. "
            f"Satisfies target price of {target:,.2f} and respects limit of {limit:,.2f}."
            if is_favorable else
            f"Accepted offer of {opp_price:,.2f} in Round {round_num} as positions converged within limit {limit:,.2f}."
        )
        return {
            "decision": "accept",
            "next_value": opp_price,
            "reasoning": reason
        }

    # 3. REJECT DECISION
    if is_unacceptable or (not is_within_limit and round_num >= max_rounds):
        return {
            "decision": "reject",
            "next_value": own_last_value,
            "reasoning": f"Rejected offer of {opp_price:,.2f} because it violates limit of {limit:,.2f} and cannot be accepted at Round {round_num}."
        }

    # 4. COUNTER DECISION
    next_val = generate_counteroffer(
        agent_profile={},
        own_last_value=own_last_value,
        incoming_value=opp_price,
        limit=limit,
        direction=direction,
        personality=personality,
        round_num=round_num,
        target=target
    )

    rate_pct = int(CONCESSION_RATE.get(personality, 0.25) * 100)
    return {
        "decision": "counter",
        "next_value": next_val,
        "reasoning": f"Countered at {next_val:,.2f} in Round {round_num}. The agent moved {abs(next_val - own_last_value):,.2f} toward the opponent from {own_last_value:,.2f}, using a measured {rate_pct}% concession tendency. Target is {target:,.2f}; hard limit is {limit:,.2f}."
    }


def rule_based_decide(
    goal: str,
    direction: str,
    limit: float,
    personality: str,
    own_last_value: float,
    incoming_value: float,
    round_num: int,
    max_rounds: int = 5
) -> Dict[str, Any]:
    """Backward-compatible pure rule-based decision engine."""
    goal_direction = derive_direction_from_goal(goal, direction)

    within_limit = (
        incoming_value <= limit if goal_direction == "minimize" else incoming_value >= limit
    )

    gap = abs(own_last_value - incoming_value)
    comparison_base = max(abs(limit), abs(incoming_value), 1.0)

    is_tight_gap = gap <= comparison_base * 0.005 or gap <= 10.0
    is_close_gap = gap <= comparison_base * 0.035

    if within_limit and (is_tight_gap or (round_num >= 4 and is_close_gap) or round_num >= (max_rounds or 5)):
        return {
            "decision": "accept",
            "next_value": incoming_value,
            "reasoning": f"Accepted {incoming_value} in Round {round_num} because it satisfies goal '{goal}' and stays within constraint limit of {limit}."
        }

    if not within_limit and round_num >= (max_rounds or 5):
        return {
            "decision": "reject",
            "next_value": own_last_value,
            "reasoning": f"Rejected {incoming_value} because it violates constraint limit of {limit} at final round {round_num}."
        }

    next_value = generate_counteroffer(
        agent_profile={},
        own_last_value=own_last_value,
        incoming_value=incoming_value,
        limit=limit,
        direction=goal_direction,
        personality=personality,
        round_num=round_num
    )

    rate = CONCESSION_RATE.get(personality, 0.25)
    return {
        "decision": "counter",
        "next_value": next_value,
        "reasoning": f"Countered at {next_value} in Round {round_num}. Persona '{personality}' concedes {int(rate*100)}% of gap toward {incoming_value}."
    }
